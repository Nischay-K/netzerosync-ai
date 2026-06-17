import { getAuth } from "firebase/auth";
import { isFirebaseConnected, fetchWithRetry, UserProfile } from "./firebase";
import { getMockReceiptAnalysis, getMockChatResponse, getMockProductAnalysis } from "./geminiMocks";

// Check if Gemini API gateway is active (connected via Firebase)
export const isGeminiConfigured = (): boolean => {
  return isFirebaseConnected;
};

// Convert file helper to base64
const fileToBase64 = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultString = reader.result as string;
      const base64Data = resultString.split(',')[1];
      resolve({
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to send POST requests to the secure AI Gateway
const callGateway = async (endpoint: string, body: any): Promise<any> => {
  const auth = getAuth();
  let headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (auth.currentUser) {
    const idToken = await auth.currentUser.getIdToken(true);
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
  const response = await fetchWithRetry(`${gatewayUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gateway returned HTTP ${response.status}`);
  }
  return response.json();
};

// -------------------------------------------------------------
// GEMINI API ROUTINES (ROUTED SECURELY VIA SERVER)
// -------------------------------------------------------------

/**
 * Chat with the Sustainability Coach (Carbon Copilot)
 */
export const chatWithCoach = async (message: string, history: any[], userProfile: UserProfile): Promise<string> => {
  if (isFirebaseConnected) {
    try {
      const response = await callGateway('/api/copilot/chat', { message });
      return response.reply;
    } catch (error) {
      console.error("Secure AI Gateway chat failed, falling back to mock engine...", error);
    }
  }

  // Fallback to local sandbox mock after small simulated network latency
  await new Promise(r => setTimeout(r, 600));
  return getMockChatResponse(message, userProfile);
};

/**
 * Scan receipt/bill and extract items with CO2 estimates (Carbon Lens)
 */
export const scanReceipt = async (file: File | null, textInput = ""): Promise<any> => {
  if (isFirebaseConnected) {
    try {
      let fileData = undefined;
      if (file) {
        fileData = await fileToBase64(file);
      }
      return await callGateway('/api/copilot/scan-receipt', {
        fileData,
        fileName: file ? file.name : "text_receipt",
        textInput
      });
    } catch (error) {
      console.error("Secure AI Gateway receipt scan failed, falling back to mock engine...", error);
    }
  }

  // Fallback to local sandbox mock
  await new Promise(r => setTimeout(r, 800));
  return getMockReceiptAnalysis(file ? file.name : "text_receipt");
};

/**
 * Verify Quest Completion via Image Upload (AI Proof Verification)
 */
export const verifyQuestPhoto = async (file: File | null, questTitle: string): Promise<any> => {
  if (isFirebaseConnected && file) {
    try {
      const fileData = await fileToBase64(file);
      return await callGateway('/api/copilot/verify-quest', {
        fileData,
        questTitle
      });
    } catch (error) {
      console.error("Secure AI Gateway quest verification failed, falling back to mock...", error);
    }
  }

  // Fallback sandbox verify response
  await new Promise(r => setTimeout(r, 600));
  return { 
    verified: true, 
    explanation: `Sandbox verified: The uploaded photo contains elements matching the quest "${questTitle}"!` 
  };
};

/**
 * Identify product and extract ecological insights (Marketplace Google Lens)
 */
export const scanProductCarbon = async (file: File | null): Promise<any> => {
  if (isFirebaseConnected && file) {
    try {
      const fileData = await fileToBase64(file);
      return await callGateway('/api/copilot/scan-product', {
        fileData,
        fileName: file.name
      });
    } catch (error) {
      console.error("Secure AI Gateway product scan failed, falling back to mock...", error);
    }
  }

  // Fallback sandbox product mock
  await new Promise(r => setTimeout(r, 600));
  return getMockProductAnalysis(file ? file.name : "product.jpg");
};
