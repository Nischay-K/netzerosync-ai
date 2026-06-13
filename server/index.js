const express = require('express');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Load environment variables natively (supported in Node v24)
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(serverEnvPath)) {
  process.loadEnvFile(serverEnvPath);
  console.log("[AI Gateway] Loaded environment variables from server/.env");
} else if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
  console.log("[AI Gateway] Loaded environment variables from root .env");
}

// Setup local credentials if they exist
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (fs.existsSync(serviceAccountPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
  console.log(`[Firebase Admin] Setting GOOGLE_APPLICATION_CREDENTIALS to: ${serviceAccountPath}`);
}

// Initialize Firebase Admin SDK
// This automatically picks up credentials in Cloud Run via Application Default Credentials (ADC)
try {
  if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    console.warn("[Firebase Admin] WARNING: GOOGLE_APPLICATION_CREDENTIALS is not set in production. App default credentials fallback will be used.");
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

const cors = require('cors');

const app = express();
// Restrict CORS origins in production to prevent arbitrary API scraping
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// 1. Firebase Auth ID Token Verification Middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// 2. User-based Rate Limiter: Max 20 chatbot queries per 15 minutes per authenticated UID
const copilotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip; // Rate limit by authenticated UID, fallback to IP
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many queries. Please wait 15 minutes before asking CarbonCopilot again.'
    });
  }
});

// Initialize AI Client (Supports Google AI Studio API Key or Google Cloud Vertex AI)
let isAiStudioMode = false;
let generativeModel = null;

if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI: GAI } = require('@google/generative-ai');
    const genAI = new GAI(process.env.GEMINI_API_KEY);
    generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    isAiStudioMode = true;
    console.log("[AI Gateway] Using Google AI Studio (GEMINI_API_KEY) for chatbot routing.");
  } catch (err) {
    console.error("[AI Gateway] Failed to initialize Google AI Studio client:", err);
  }
}

if (!isAiStudioMode) {
  try {
    const { VertexAI } = require('@google-cloud/vertexai');
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
  const missingConfigs = [];
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
async function generateContentWithRetry(systemInstruction, userMessage, retries = 3, delay = 1000) {
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
    } catch (error) {
      const isThrottled = error.status === 429 || 
                          error.message.includes('Quota exceeded') || 
                          error.message.includes('ResourceExhausted') || 
                          error.message.includes('429');
      if (isThrottled && i < retries - 1) {
        console.warn(`Gemini AI throttled (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// 4. Secure Chatbot Endpoint
app.post('/api/copilot/chat', authenticateUser, copilotLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Bad Request: "message" parameter is required.' });
    }

    const userId = req.userId;
    console.log(`[API GATEWAY] -> Incoming chat query from User UID: ${userId}`);

    // Fetch user profile from Firestore for personalization
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const carbonCurrent = userData.carbonCurrent || 6.8;
    const carbonTarget = userData.carbonTarget || 3.5;
    const displayName = userData.displayName || 'Eco Explorer';

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

// 5. Secure Carbon Activity Logging & Rewards Endpoint
app.post('/api/activity/log', authenticateUser, async (req, res) => {
  try {
    const { entry, logType, questId, questXP, questTokens, tokenCost, xpReward, tokenReward } = req.body;
    if (!entry || typeof entry !== 'object') {
      return res.status(400).json({ error: 'Bad Request: "entry" object is required.' });
    }

    const userId = req.userId;
    console.log(`[API GATEWAY] -> Activity log requested by User UID: ${userId}, Type: ${logType || 'activity'}`);

    const userRef = db.collection('users').doc(userId);
    const logsCol = db.collection('carbonLogs');

    // Run as an atomic transaction to ensure data integrity
    const updatedStats = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile does not exist in database.');
      }

      const userData = userDoc.data();
      const currentXP = userData.xp || 0;
      const currentTokens = userData.ecoTokens || 0;
      const currentLevel = userData.level || 1;
      const carbonCurrent = userData.carbonCurrent || 6.8;
      const completedMissions = userData.completedMissions || [];

      // Calculate updates
      const carbonDelta = (entry.co2Value || 0) / 1000; // convert kg to tons
      const newCarbon = Math.max(0.1, Number((carbonCurrent + carbonDelta).toFixed(2)));
      
      let newXP = currentXP;
      let newTokens;

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

      // Update user document
      const userUpdates = {
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
  } catch (error) {
    console.error('Error processing carbon log activity:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error: Failed to process database transaction.' });
  }
});

// 6. Secure Community Challenge Joining Endpoint
app.post('/api/challenge/join', authenticateUser, async (req, res) => {
  try {
    const { challengeId } = req.body;
    if (!challengeId || typeof challengeId !== 'string') {
      return res.status(400).json({ error: 'Bad Request: "challengeId" is required.' });
    }

    const userId = req.userId;
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

      const userData = userDoc.data();
      const challengeData = challengeDoc.data();

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

      const userUpdates = {
        joinedChallenges,
        xp: newXP
      };
      if (newLevel > currentLevel) {
        userUpdates.level = newLevel;
      }

      // Update user
      transaction.update(userRef, userUpdates);

      // Update challenge count
      const newParticipants = (challengeData.participantCount || 0) + 1;
      const newCurrent = Math.min(
        challengeData.goal || 1000,
        (challengeData.current || 0) + (challengeData.co2SavedPerMember || 0)
      );
      transaction.update(challengeRef, {
        participantCount: newParticipants,
        current: newCurrent
      });

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
  } catch (error) {
    console.error('Error joining challenge:', error);
    return res.status(500).json({ error: error.message || 'Failed to join community challenge.' });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`NetZeroSync API Gateway running securely on port ${PORT}`);
});
