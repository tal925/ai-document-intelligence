import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Initialize the shared Gemini client.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    timeout: 30_000,
  },
});
