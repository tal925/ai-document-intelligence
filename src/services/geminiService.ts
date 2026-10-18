import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey });

// Generate a summary with retries for temporary errors
export async function summarizeDocument(content: string): Promise<string> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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
    } catch (error) {
      // Retry only temporary API errors
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Wait longer before each retry
      const delay = attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to summarize document after multiple attempts");
}

// Check whether the error is temporary
function isRetryableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  const status = error.status;

  return status === 429 || status === 500 || status === 503;
}
