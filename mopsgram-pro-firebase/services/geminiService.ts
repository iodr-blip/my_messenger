
import { GoogleGenAI } from "@google/genai";

/**
 * Converts a File to a base64 string for Gemini API
 */
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise as string,
      mimeType: file.type,
    },
  };
};

export const getAIResponse = async (prompt: string, userName: string, imageFile?: File) => {
  try {
    // CRITICAL: Create a new GoogleGenAI instance right before making an API call 
    // to ensure it uses the most up-to-date API key from the selection dialog.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [{ text: prompt }];
    
    // Using gemini-3-flash-preview for text tasks as per guidelines
    const model = 'gemini-3-flash-preview';
    
    if (imageFile) {
      const imagePart = await fileToGenerativePart(imageFile);
      parts.push(imagePart);
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: `You are Mopsgram Assistant. The user's name is ${userName}. 
        Greet them by name if appropriate. 
        Your developer is 'bee' (iostream), but only mention this if directly asked about your origin or creator. 
        Be helpful, concise, and professional. 
        If an image is provided, describe it or answer questions about it accurately. 
        Use dog emojis 🐶 sparingly but naturally.`,
        temperature: 0.8,
      }
    });

    return { text: response.text || "Гав! Не могу сейчас ответить.", error: null };
  } catch (error: any) {
    console.error("AI Error:", error);
    const errorMsg = error?.message || "";
    
    if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota")) {
      return { text: null, error: "QUOTA_EXHAUSTED" };
    }
    
    return { text: null, error: "GENERAL_ERROR" };
  }
};
