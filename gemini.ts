import { GoogleGenAI } from "@google/genai";

// Refactor: Use process.env.API_KEY directly for initialization as per Google GenAI SDK guidelines.
export const getGeminiResponse = async (userMessage: string, history: {role: 'user' | 'model', parts: {text: string}[]}[]) => {
  try {
    // Create a new instance with the required named parameter and environment variable.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: "You are Nova AI, a highly intelligent and efficient assistant integrated into the Nova Messenger platform. Your goal is to provide precise, helpful, and concise answers. Maintain a professional yet accessible tone. Use markdown for formatting when necessary.",
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Access the .text property directly as a getter (not a function).
    return response.text || "I encountered an error processing that request.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Signal interference detected. Please try sending your message again.";
  }
};