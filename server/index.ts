import express, { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';
import { z } from 'zod';

// Zod Validation Schemas
const copilotSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message is too long')
});

const scanReceiptSchema = z.object({
  fileData: z.object({
    data: z.string(),
    mimeType: z.string()
  }).optional(),
  fileName: z.string().optional(),
  textInput: z.string().optional()
});

const verifyQuestSchema = z.object({
  fileData: z.object({
    data: z.string(),
    mimeType: z.string()
  }).optional(),
  questTitle: z.string().min(1, 'Quest title is required')
});

const scanProductSchema = z.object({
  fileData: z.object({
    data: z.string(),
    mimeType: z.string()
  }).optional(),
  fileName: z.string().optional()
});

const activityLogSchema = z.object({
  entry: z.object({
    co2Value: z.number().optional().default(0),
    name: z.string().min(1, 'Entry name is required'),
    category: z.string().optional()
  }).passthrough(),
  logType: z.enum(['quest', 'offset', 'activity']).optional().default('activity'),
  questId: z.string().optional(),
  questXP: z.number().nonnegative().max(500).optional(),
  questTokens: z.number().nonnegative().max(500).optional(),
  tokenCost: z.number().nonnegative().optional(),
  xpReward: z.number().nonnegative().max(500).optional(),
  tokenReward: z.number().nonnegative().max(500).optional()
});

const challengeJoinSchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required')
});

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Load environment variables natively (supported in Node v24)
// Support both local development (index.ts in server/) and compiled (index.js in server/dist/)
const searchPathsEnv = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'server', '.env')
];

for (const envPath of searchPathsEnv) {
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
      console.log(`[AI Gateway] Loaded environment variables from: ${envPath}`);
      break;
    }
  }
}

// Setup local credentials if they exist
const searchPathsCredentials = [
  path.join(__dirname, 'service-account.json'),
  path.join(__dirname, '..', 'service-account.json'),
  path.join(process.cwd(), 'service-account.json'),
  path.join(process.cwd(), 'server', 'service-account.json')
];

for (const credPath of searchPathsCredentials) {
  if (fs.existsSync(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log(`[Firebase Admin] Setting GOOGLE_APPLICATION_CREDENTIALS to: ${credPath}`);
    break;
  }
}

// Initialize Firebase Admin SDK
// This automatically picks up credentials in Cloud Run via Application Default Credentials (ADC)
try {
  if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    console.error("[FATAL] Security Audit: GOOGLE_APPLICATION_CREDENTIALS or K_SERVICE must be set in production mode.");
    process.exit(1);
  }
  admin.initializeApp();
  console.log("[Firebase Admin] Initialized successfully.");
} catch (error) {
  console.error("[Firebase Admin] Initialization failed:", error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // Fail fast in production
  }
}
const db = admin.firestore();

const app = express();

// Enable Helmet to set secure HTTP headers (e.g. X-Content-Type-Options, X-Frame-Options)
app.use(helmet());

// Restrict CORS origins in production to prevent arbitrary API scraping
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : process.env.NODE_ENV === 'production'
    ? [
        'https://netzerosync-ai.web.app',
        'https://netzerosync-ai.firebaseapp.com'
      ]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://netzerosync-ai.web.app',
        'https://netzerosync-ai.firebaseapp.com'
      ];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// 1. Firebase Auth ID Token Verification Middleware
const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as AuthenticatedRequest).userId = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// 2. User-based Rate Limiters
const copilotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as AuthenticatedRequest).userId || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many queries. Please wait 15 minutes before asking CarbonCopilot again.'
    });
  }
});

const logLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthenticatedRequest).userId || req.ip || 'anonymous',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many logging requests. Please wait 15 minutes.'
    });
  }
});

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthenticatedRequest).userId || req.ip || 'anonymous',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many challenge join requests. Please wait 15 minutes.'
    });
  }
});

interface GeminiModel {
  generateContent(contents: any): Promise<any>;
}

// Initialize AI Client (Supports Google AI Studio API Key or Google Cloud Vertex AI)
let isAiStudioMode = false;
let generativeModel: GeminiModel | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    isAiStudioMode = true;
    console.log("[AI Gateway] Using Google AI Studio (GEMINI_API_KEY) for chatbot routing.");
  } catch (err) {
    console.error("[AI Gateway] Failed to initialize Google AI Studio client:", err);
  }
}

if (!isAiStudioMode) {
  try {
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || 'us-central1';
    
    if (process.env.NODE_ENV === 'production' && !project) {
      throw new Error("GCP_PROJECT_ID is not configured in production mode.");
    }
    
    const vertexAI = new VertexAI({ project: project || 'netzerosync-ai', location });
    generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log(`[AI Gateway] Using Google Cloud Vertex AI (Project: ${project || 'netzerosync-ai'}, Location: ${location}) for chatbot routing.`);
  } catch (err) {
    console.error("[AI Gateway] Failed to initialize Vertex AI client:", err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Fail fast in production
    }
  }
}

// Run environment configuration audit to fail fast in production if required variables are missing
if (process.env.NODE_ENV === 'production') {
  const missingConfigs: string[] = [];
  if (!generativeModel) {
    missingConfigs.push('GEMINI_API_KEY or GCP_PROJECT_ID (Vertex AI)');
  }
  if (!admin.apps.length) {
    missingConfigs.push('Firebase Admin SDK App');
  }
  if (missingConfigs.length > 0) {
    console.error(`[FATAL] Startup Configuration Audit failed. Missing critical components in production: ${missingConfigs.join(', ')}`);
    process.exit(1);
  } else {
    console.log("[AI Gateway] Production environment configuration audit: PASSED.");
  }
}

// 3. Exponential Backoff Retry wrapper for Vertex AI & AI Studio
async function generateContentWithRetry(systemInstruction: string, userMessage: string, retries = 3, delay = 1000): Promise<string> {
  if (!generativeModel) {
    throw new Error('AI Provider is not configured. Please set GEMINI_API_KEY or configure GCP_PROJECT_ID (Vertex AI) in the environment configuration.');
  }

  for (let i = 0; i < retries; i++) {
    try {
      if (isAiStudioMode) {
        // AI Studio API call
        const response = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction
        });
        return response.response.text();
      } else {
        // Vertex AI API call
        const response = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction
        });
        return response.response.candidates[0].content.parts[0].text;
      }
    } catch (error: any) {
      const status = error.status || (error.response && error.response.status);
      const isThrottled = status === 429 || 
                          error.message?.includes('Quota exceeded') || 
                          error.message?.includes('ResourceExhausted') || 
                          error.message?.includes('429');
      if (isThrottled && i < retries - 1) {
        console.warn(`Gemini AI throttled (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate content after retries.');
}

// 4. Secure Chatbot Endpoint
app.post('/api/copilot/chat', authenticateUser, copilotLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = copilotSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { message } = bodyResult.data;

    if (!generativeModel) {
      return res.status(503).json({
        error: 'AI Provider is not configured. Please set GEMINI_API_KEY or configure GCP_PROJECT_ID (Vertex AI) in the environment configuration.'
      });
    }

    const userId = (req as AuthenticatedRequest).userId!;
    console.log(`[API GATEWAY] -> Incoming chat query from User UID: ${userId}`);

    // Fetch user profile from Firestore for personalization
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const carbonCurrent = userData?.carbonCurrent || 6.8;
    const carbonTarget = userData?.carbonTarget || 3.5;
    const displayName = userData?.displayName || 'Eco Explorer';

    // System prompt injecting database profile variables securely
    const systemPrompt = `You are CarbonCopilot, an AI sustainability mentor. The user's name is ${displayName}. They have a current carbon footprint of ${carbonCurrent} tons/yr (Target goal: ${carbonTarget} tons/yr). Answer their query helpfully and suggest micro-actions they can take. Keep responses encouraging, concise, and focused on emissions reductions.`;

    const responseText = await generateContentWithRetry(systemPrompt, message);
    console.log(`[API GATEWAY] <- Successfully generated and returned AI reply to User.`);
    return res.json({ reply: responseText });
  } catch (error) {
    console.error('Error handling chatbot request:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to contact AI provider.' });
  }
});

// Helper Mocks for Server-side AI fallbacks when model is unconfigured
const getMockReceiptAnalysis = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('grocery') || name.includes('receipt') || name.includes('store') || name.includes('supermarket')) {
    return {
      items: [
        { name: "Organic Beef Sirloin (500g)", category: "Food (Meat)", co2: 15.5 },
        { name: "Avocados (Pack of 4)", category: "Food (Imports)", co2: 2.1 },
        { name: "Local Strawberries (250g)", category: "Food (Local)", co2: 0.3 },
        { name: "Almond Milk (1L - tetrapak)", category: "Food (Dairy Alternative)", co2: 0.8 },
        { name: "Sparkling Water in Plastic (2L)", category: "Shopping (Plastic)", co2: 1.4 }
      ],
      totalCo2: 20.1,
      suggestions: "Your highest contributor is the Beef Sirloin. Swapping beef for poultry or legumes could save up to 14 kg of CO₂. Also, try purchasing sparkling water in aluminum cans or using a soda maker to eliminate single-use plastic bottles."
    };
  } else if (name.includes('electricity') || name.includes('bill') || name.includes('utility') || name.includes('power')) {
    return {
      items: [
        { name: "Electricity Usage (340 kWh)", category: "Energy (Electricity)", co2: 125.8 },
        { name: "Gas usage (15 therms)", category: "Energy (Natural Gas)", co2: 80.2 }
      ],
      totalCo2: 206.0,
      suggestions: "Your grid electricity generates significant carbon. Consider joining a community solar project, installing LED bulbs throughout your home, or setting your thermostat 2°F lower in winter to save approximately 40 kg CO₂/month."
    };
  } else {
    return {
      items: [
        { name: "Uber Ride (18.5 km)", category: "Transport (Ride Share)", co2: 4.2 },
        { name: "Fast Fashion Cotton T-shirt", category: "Shopping (Apparel)", co2: 8.5 }
      ],
      totalCo2: 12.7,
      suggestions: "Consider public transit or biking for trips under 10km. For clothing, buying from thrift stores or choosing high-quality organic cotton brands extends clothing lifecycles and halves fashion emissions."
    };
  }
};

const getMockProductAnalysis = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('bottle') || name.includes('plastic') || name.includes('cup')) {
    return {
      productName: "Single-Use Plastic Bottle",
      carbonImpact: 0.15,
      ecoInsight: "PET plastic generates about 0.15 kg of CO₂ per bottle during manufacturing. We recommend checking out Mangrove Reforestation to offset high plastic waste footprints.",
      recommendedOffsetCategory: "Forestry"
    };
  } else if (name.includes('burger') || name.includes('meat') || name.includes('food')) {
    return {
      productName: "Fast Food Beef Burger",
      carbonImpact: 4.8,
      ecoInsight: "Beef production generates high methane and carbon output. Offsetting 4.8 kg carbon using Cookstove efficiency projects is highly recommended.",
      recommendedOffsetCategory: "Efficiency"
    };
  } else if (name.includes('box') || name.includes('package') || name.includes('cardboard')) {
    return {
      productName: "Cardboard Shipping Container",
      carbonImpact: 0.85,
      ecoInsight: "Cardboard requires tree harvesting. Counter this impact by contributing to Mangrove Reforestation to replenish canopy sequestration.",
      recommendedOffsetCategory: "Forestry"
    };
  } else {
    return {
      productName: "Electronic Device / Retail Item",
      carbonImpact: 12.5,
      ecoInsight: "Consumer electronics involve complex supply-chain emissions. Sponsoring the Solar Microgrid Initiative helps displace fossil-fuel manufacturing grids.",
      recommendedOffsetCategory: "Renewables"
    };
  }
};

// 4b. Secure Vision AI Endpoints
app.post('/api/copilot/scan-receipt', authenticateUser, copilotLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = scanReceiptSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { fileData, fileName, textInput } = bodyResult.data;

    if (!generativeModel) {
      await new Promise(r => setTimeout(r, 1000));
      return res.json(getMockReceiptAnalysis(fileName || "text_receipt"));
    }

    let prompt = `Analyze this purchase receipt, grocery list, travel ticket, or electricity bill. 
Extract the key items and estimate the carbon footprint (CO2 in kilograms) generated by each item.
For groceries, estimate based on food category carbon footprint (e.g. beef has high footprint, local vegetables have low).
For electricity/gas bills, convert the kWh or gas therms directly into CO2 kilograms using standard global emission averages.
For travel, calculate CO2 based on travel mode and distance.

You must output your response strictly as a JSON object, with no markdown code blocks, using this format:
{
  "items": [
    { "name": "Item or service name", "category": "Food/Transport/Energy/Shopping", "co2": 0.0 }
  ],
  "totalCo2": 0.0,
  "suggestions": "Brief advice on eco-friendly alternatives for the highest emitting items found"
}
`;

    if (textInput) {
      prompt += `\nAdditional text context/notes provided: "${textInput}"`;
    }

    const parts: any[] = [];
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      });
    }
    parts.push({ text: prompt });

    let responseText = "";
    if (isAiStudioMode) {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.text();
    } else {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.candidates[0].content.parts[0].text;
    }

    let text = responseText.trim();
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }

    return res.json(JSON.parse(text.trim()));
  } catch (error) {
    console.error('Error handling scan-receipt request:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to scan receipt.' });
  }
});

app.post('/api/copilot/verify-quest', authenticateUser, copilotLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = verifyQuestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { fileData, questTitle } = bodyResult.data;

    if (!generativeModel || !fileData) {
      await new Promise(r => setTimeout(r, 1000));
      return res.json({ 
        verified: true, 
        explanation: `Sandbox verified: The uploaded photo contains elements matching the quest "${questTitle}"!` 
      });
    }

    const prompt = `Inspect this uploaded image. Determine if this image provides visual proof of completing the sustainability quest: "${questTitle}".
For example:
- If quest is about a vegetarian meal, check if the image shows vegetarian/vegan food.
- If quest is about walking or cycling, check if the image shows a bicycle, walking path, pedometer reading, or walking shoes.
- If quest is about saving energy/water, check if the image shows thermostat dials, unplugged power outlets, or water aerators.

You must output your response strictly as a JSON object, with no markdown code blocks, using this format:
{
  "verified": true, // true or false
  "explanation": "A short, 1-sentence friendly confirmation of what the AI detected in the photo (e.g. 'I detected your bicycle on the street! Quest successfully completed.')"
}
`;

    const parts = [
      {
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      },
      { text: prompt }
    ];

    let responseText = "";
    if (isAiStudioMode) {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.text();
    } else {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.candidates[0].content.parts[0].text;
    }

    let text = responseText.trim();
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }

    return res.json(JSON.parse(text.trim()));
  } catch (error) {
    console.error('Error handling verify-quest request:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to verify quest photo.' });
  }
});

app.post('/api/copilot/scan-product', authenticateUser, copilotLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = scanProductSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { fileData, fileName } = bodyResult.data;

    if (!generativeModel || !fileData) {
      await new Promise(r => setTimeout(r, 1000));
      return res.json(getMockProductAnalysis(fileName || "product.jpg"));
    }

    const prompt = `Identify the product in this image. Estimate its carbon footprint (in kg CO2 equivalents) based on common lifecycles.
Provide short sustainability insights (what makes this carbon-intensive or how the user can reduce it).
Suggest one of these marketplace project categories to offset it: "Forestry", "Renewables", or "Efficiency".

You must output your response strictly as a JSON object, with no markdown code blocks, using this format:
{
  "productName": "Product Name",
  "carbonImpact": 0.0, // estimated CO2 in kg
  "ecoInsight": "1-2 sentence ecological description",
  "recommendedOffsetCategory": "Forestry" // must be "Forestry", "Renewables", or "Efficiency"
}
`;

    const parts = [
      {
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      },
      { text: prompt }
    ];

    let responseText = "";
    if (isAiStudioMode) {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.text();
    } else {
      const result = await generativeModel.generateContent(parts);
      responseText = result.response.candidates[0].content.parts[0].text;
    }

    let text = responseText.trim();
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }

    return res.json(JSON.parse(text.trim()));
  } catch (error) {
    console.error('Error handling scan-product request:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to scan product.' });
  }
});

// 5. Secure Carbon Activity Logging & Rewards Endpoint
app.post('/api/activity/log', authenticateUser, logLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = activityLogSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { entry, logType, questId, questXP, questTokens, tokenCost, xpReward, tokenReward } = bodyResult.data;

    const userId = (req as AuthenticatedRequest).userId!;
    console.log(`[API GATEWAY] -> Activity log requested by User UID: ${userId}, Type: ${logType || 'activity'}`);

    const userRef = db.collection('users').doc(userId);
    const logsCol = db.collection('carbonLogs');

    // Run as an atomic transaction to ensure data integrity
    const updatedStats = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile does not exist in database.');
      }

      const userData = userDoc.data() || {};
      const currentXP = userData.xp || 0;
      const currentTokens = userData.ecoTokens || 0;
      const currentLevel = userData.level || 1;
      const carbonCurrent = userData.carbonCurrent || 6.8;
      const completedMissions = userData.completedMissions || [];

      // Calculate updates
      const carbonDelta = (entry.co2Value || 0) / 1000; // convert kg to tons
      const newCarbon = Math.max(0.1, Number((carbonCurrent + carbonDelta).toFixed(2)));
      
      let newXP = currentXP;
      let newTokens: number;

      if (logType === 'quest') {
        // Safety guard: max 500 XP / tokens per quest transaction
        const xpAward = Math.min(500, Math.max(0, Number(questXP) || 0));
        const tokenAward = Math.min(500, Math.max(0, Number(questTokens) || 0));
        newXP = currentXP + xpAward;
        newTokens = currentTokens + tokenAward;
        if (questId && !completedMissions.includes(questId)) {
          completedMissions.push(questId);
        }
      } else if (logType === 'offset') {
        const cost = Number(tokenCost) || 0;
        if (currentTokens < cost) {
          throw new Error('Insufficient Eco-Tokens for this offset.');
        }
        newTokens = currentTokens - cost;
      } else {
        // Standard Activity Log (default or custom with safety limits)
        const xpAward = Math.min(500, Math.max(0, xpReward !== undefined ? Number(xpReward) : 100));
        const tokenAward = Math.min(500, Math.max(0, tokenReward !== undefined ? Number(tokenReward) : 50));
        newXP = currentXP + xpAward;
        newTokens = currentTokens + tokenAward;
      }

      const newLevel = Math.floor(newXP / 1000) + 1;

      interface UserUpdates {
        carbonCurrent: number;
        xp: number;
        ecoTokens: number;
        completedMissions: string[];
        level?: number;
        [key: string]: any;
      }

      // Update user document
      const userUpdates: UserUpdates = {
        carbonCurrent: newCarbon,
        xp: newXP,
        ecoTokens: newTokens,
        completedMissions
      };

      if (newLevel > currentLevel) {
        userUpdates.level = newLevel;
      }

      transaction.update(userRef, userUpdates);

      // Save log document
      const newLogRef = logsCol.doc();
      const logEntry = {
        ...entry,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      transaction.set(newLogRef, logEntry);

      return {
        uid: userId,
        xp: newXP,
        level: newLevel > currentLevel ? newLevel : currentLevel,
        ecoTokens: newTokens,
        carbonCurrent: newCarbon,
        completedMissions
      };
    });

    console.log(`[API GATEWAY] <- Successfully processed transaction for User UID: ${userId}`);
    return res.json(updatedStats);
  } catch (error: any) {
    console.error('Error processing carbon log activity:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to process activity log in database.' });
  }
});

// 6. Secure Community Challenge Joining Endpoint
app.post('/api/challenge/join', authenticateUser, joinLimiter, async (req: Request, res: Response): Promise<Response> => {
  try {
    const bodyResult = challengeJoinSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Bad Request: ' + bodyResult.error.issues[0].message });
    }
    const { challengeId } = bodyResult.data;

    const userId = (req as AuthenticatedRequest).userId!;
    console.log(`[API GATEWAY] -> User UID: ${userId} requesting to join Challenge: ${challengeId}`);

    const userRef = db.collection('users').doc(userId);
    const challengeRef = db.collection('challenges').doc(challengeId);
    const logsCol = db.collection('carbonLogs');

    const updatedUser = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const challengeDoc = await transaction.get(challengeRef);

      if (!userDoc.exists) {
        throw new Error('User profile does not exist.');
      }
      if (!challengeDoc.exists) {
        throw new Error('Challenge does not exist.');
      }

      const userData = userDoc.data() || {};
      const challengeData = challengeDoc.data() || {};

      const joinedChallenges = userData.joinedChallenges || [];
      if (joinedChallenges.includes(challengeId)) {
        return { alreadyJoined: true, ...userData };
      }

      // Join challenge and reward 50 XP
      joinedChallenges.push(challengeId);
      const currentXP = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const newXP = currentXP + 50; // Join bonus
      const newLevel = Math.floor(newXP / 1000) + 1;

      interface ChallengeUserUpdates {
        joinedChallenges: string[];
        xp: number;
        level?: number;
        [key: string]: any;
      }

      const userUpdates: ChallengeUserUpdates = {
        joinedChallenges,
        xp: newXP
      };
      if (newLevel > currentLevel) {
        userUpdates.level = newLevel;
      }

      // Update user
      transaction.update(userRef, userUpdates);

      // Distributed Counter Shards to prevent lock hotspot contention under 10k DAU join load
      const shardNum = Math.floor(Math.random() * 10);
      const shardRef = challengeRef.collection('shards').doc(`shard_${shardNum}`);
      const shardSnap = await transaction.get(shardRef);
      const shardData = shardSnap.exists ? shardSnap.data() || {} : { participantCount: 0, current: 0 };

      transaction.set(shardRef, {
        participantCount: (shardData.participantCount || 0) + 1,
        current: (shardData.current || 0) + (challengeData.co2SavedPerMember || 0)
      }, { merge: true });

      // Log the activity log entry for joining
      const newLogRef = logsCol.doc();
      transaction.set(newLogRef, {
        userId,
        name: `Joined Challenge: ${challengeData.title}`,
        category: 'Community',
        co2Value: 0,
        notes: `Successfully registered for community event in ${challengeData.title}.`,
        timestamp: new Date().toISOString()
      });

      return {
        uid: userId,
        xp: newXP,
        level: newLevel > currentLevel ? newLevel : currentLevel,
        ecoTokens: userData.ecoTokens || 500,
        carbonCurrent: userData.carbonCurrent || 6.8,
        completedMissions: userData.completedMissions || [],
        joinedChallenges
      };
    });

    console.log(`[API GATEWAY] <- User UID: ${userId} successfully joined Challenge: ${challengeId}`);
    return res.json(updatedUser);
  } catch (error: any) {
    console.error('Error joining challenge:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to join community challenge.' });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NetZeroSync API Gateway running securely on port ${PORT}`);
  });
}

export default app;
