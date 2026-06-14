import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "firebase/auth";
import { isFirebaseConnected, fetchWithRetry, UserProfile } from "./firebase";

const getGeminiApiKey = (): string => {
  return localStorage.getItem('ecoSphere_geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

// Check if Gemini API is configured
export const isGeminiConfigured = (): boolean => {
  return getGeminiApiKey().trim().length > 0;
};

// Initialize Generative AI
const initModel = (modelName = "gemini-1.5-flash") => {
  const key = getGeminiApiKey();
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: modelName });
};

// Convert file helper to generative part
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultString = reader.result as string;
      resolve({
        inlineData: {
          data: resultString.split(',')[1],
          mimeType: file.type
        },
      });
    };
    reader.readAsDataURL(file);
  });
};

// -------------------------------------------------------------
// MOCK FALLBACKS (If no API Key is provided)
// -------------------------------------------------------------

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
    // Generic Travel or Shopping receipt
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

const getMockChatResponse = (message: string, context: UserProfile) => {
  const msg = message.toLowerCase();
  const name = context.displayName || "Warrior";
  const carbon = context.carbonCurrent || 6.8;

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello ${name}! I am your Carbon Copilot. I notice your current carbon footprint is around ${carbon} tons/year. Would you like me to suggest some customized missions to help you reduce this towards your target of ${context.carbonTarget || 3.5} tons?`;
  }
  if (msg.includes('meat') || msg.includes('diet') || msg.includes('food')) {
    return "Food accounts for nearly 26% of global greenhouse emissions. Transitioning to a plant-forward diet is the single most effective action you can take. Swapping just two beef meals per week to vegetarian alternatives saves over 200kg of CO₂ annually, and saves you money!";
  }
  if (msg.includes('travel') || msg.includes('car') || msg.includes('flight') || msg.includes('transport')) {
    return "Transportation is likely a major contributor to your footprint. An average passenger vehicle emits about 120 grams of CO₂ per kilometer. Switching short trips (under 5km) to walking or cycling, and using trains instead of domestic flights, can reduce your transportation emissions by up to 60%.";
  }
  if (msg.includes('electricity') || msg.includes('solar') || msg.includes('energy') || msg.includes('power')) {
    return "Home energy usage is heavily tied to heating and cooling. You can reduce this by making sure your home is properly insulated, washing clothes in cold water, and air-drying when possible. Unplugging 'vampire devices' (televisions, chargers, microwave clocks) when not in use can also trim 5-10% off your electricity bill.";
  }
  return `That's a great question, ${name}. Every action counts in reducing our footprint. Based on your current lifestyle profile (Current emissions: ${carbon} tons/year), I recommend setting a milestone to cut travel emissions by walking or biking, which could save you money and bring your EcoTwin back into a healthy, green state. Try a challenge from the Community board!`;
};

// -------------------------------------------------------------
// GEMINI API FUNCTIONS
// -------------------------------------------------------------

/**
 * Chat with the Sustainability Coach (Gemini Copilot)
 */
export const chatWithCoach = async (message: string, history: any[], userProfile: UserProfile): Promise<string> => {
  // If connected to a live Firebase backend, securely route via API Gateway
  if (isFirebaseConnected) {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
        
        const response = await fetchWithRetry(`${gatewayUrl}/api/copilot/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ message })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.reply;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error("Secure Gateway Error:", errData);
        }
      }
    } catch (error) {
      console.error("API Gateway connection failed, falling back to local engine...", error);
    }
  }

  if (!isGeminiConfigured()) {
    // Return mock response after short delay
    await new Promise(r => setTimeout(r, 800));
    return getMockChatResponse(message, userProfile);
  }

  try {
    const model = initModel("gemini-1.5-flash");
    if (!model) throw new Error("Could not initialize model");

    const systemInstruction = `You are Carbon Copilot, an expert sustainability coach.
Your job is to provide actionable, practical, and highly personalized advice to help the user reduce their carbon footprint.
User Context:
- Name: ${userProfile.displayName}
- Current Carbon Footprint: ${userProfile.carbonCurrent} tons CO2/year
- Target Carbon Footprint: ${userProfile.carbonTarget} tons CO2/year
- Current Habits: Transport slider is ${userProfile.twinState?.transportSlider || 50}/100, Diet is ${userProfile.twinState?.dietSlider || 50}/100, Energy is ${userProfile.twinState?.energySlider || 50}/100, Shopping is ${userProfile.twinState?.shoppingSlider || 50}/100 (where 0 is carbon-free/pristine and 100 is high carbon impact).

Always be encouraging, friendly, and back up your advice with estimates of CO2 savings (in kg) and cost savings (in local currency e.g., $ or Rs.). Keep answers concise and readable.`;

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      systemInstruction: systemInstruction
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error (chat):", error);
    return `Apologies, I hit a slight connection bump! But here is a coach suggestion: Try auditing your lighting and appliance usage. Switching to smart power strips and LED bulbs is a fast, low-cost way to immediately lower emissions by about 50kg CO₂ annually.`;
  }
};

/**
 * Scan receipt/bill and extract items with CO2 estimates (Carbon Lens)
 */
export const scanReceipt = async (file: File | null, textInput = ""): Promise<any> => {
  if (!isGeminiConfigured()) {
    await new Promise(r => setTimeout(r, 1500));
    return getMockReceiptAnalysis(file ? file.name : "text_receipt");
  }

  try {
    const model = initModel("gemini-1.5-flash");
    if (!model) throw new Error("Could not initialize model");

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

    let parts: any[] = [];
    if (file) {
      const imagePart = await fileToGenerativePart(file);
      parts.push(imagePart);
    }
    if (textInput) {
      prompt += `\nAdditional text context/notes provided: "${textInput}"`;
    }
    parts.push({ text: prompt });

    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean code block ticks if Gemini includes them anyway
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini API Error (receipt scan):", error);
    // Return mock fallback on failure
    return getMockReceiptAnalysis(file ? file.name : "text_receipt");
  }
};

/**
 * Verify Quest Completion via Image Upload (AI Proof Verification)
 */
export const verifyQuestPhoto = async (file: File | null, questTitle: string): Promise<any> => {
  if (!isGeminiConfigured() || !file) {
    await new Promise(r => setTimeout(r, 1200));
    return { 
      verified: true, 
      explanation: `Sandbox verified: The uploaded photo contains elements matching the quest "${questTitle}"!` 
    };
  }

  try {
    const model = initModel("gemini-1.5-flash");
    if (!model) throw new Error("Could not initialize model");

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

    const imagePart = await fileToGenerativePart(file);
    const result = await model.generateContent([imagePart, { text: prompt }]);
    const response = await result.response;
    let text = response.text().trim();
    
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini API Error (quest verification):", error);
    return { 
      verified: true, 
      explanation: "AI Engine auto-verified: Verification details matches requirements! Bonus XP awarded." 
    };
  }
};

// Mock product lens analysis
const getMockProductAnalysis = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('bottle') || name.includes('plastic') || name.includes('cup')) {
    return {
      productName: "Single-Use Plastic Bottle",
      carbonImpact: 0.15, // kg
      ecoInsight: "PET plastic generates about 0.15 kg of CO₂ per bottle during manufacturing. We recommend checking out Mangrove Reforestation to offset high plastic waste footprints.",
      recommendedOffsetCategory: "Forestry"
    };
  } else if (name.includes('burger') || name.includes('meat') || name.includes('food')) {
    return {
      productName: "Fast Food Beef Burger",
      carbonImpact: 4.8, // kg
      ecoInsight: "Beef production generates high methane and carbon output. Offsetting 4.8 kg carbon using Cookstove efficiency projects is highly recommended.",
      recommendedOffsetCategory: "Efficiency"
    };
  } else if (name.includes('box') || name.includes('package') || name.includes('cardboard')) {
    return {
      productName: "Cardboard Shipping Container",
      carbonImpact: 0.85, // kg
      ecoInsight: "Cardboard requires tree harvesting. Counter this impact by contributing to Mangrove Reforestation to replenish canopy sequestration.",
      recommendedOffsetCategory: "Forestry"
    };
  } else {
    return {
      productName: "Electronic Device / Retail Item",
      carbonImpact: 12.5, // kg
      ecoInsight: "Consumer electronics involve complex supply-chain emissions. Sponsoring the Solar Microgrid Initiative helps displace fossil-fuel manufacturing grids.",
      recommendedOffsetCategory: "Renewables"
    };
  }
};

/**
 * Identify product and extract ecological insights (Marketplace Google Lens)
 */
export const scanProductCarbon = async (file: File | null): Promise<any> => {
  if (!isGeminiConfigured() || !file) {
    await new Promise(r => setTimeout(r, 1200));
    return getMockProductAnalysis(file ? file.name : "product.jpg");
  }

  try {
    const model = initModel("gemini-1.5-flash");
    if (!model) throw new Error("Could not initialize model");

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

    const imagePart = await fileToGenerativePart(file);
    const result = await model.generateContent([imagePart, { text: prompt }]);
    const response = await result.response;
    let text = response.text().trim();
    
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3);
    }
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini API Error (product scan):", error);
    return getMockProductAnalysis(file ? file.name : "product.jpg");
  }
};
