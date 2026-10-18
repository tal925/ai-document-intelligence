import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey });

// Generate a summary for the provided document
export async function summarizeDocument(content: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Summarize this document in Hebrew using exactly 2 bullet points.

Document:
${content}`,
  });

  const summary = response.text;

  if (!summary) {
    throw new Error("Gemini returned an empty response");
  }

  return summary;
}
