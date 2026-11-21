import { ai } from "./geminiClient.js";

// Generate a vector representation of a text chunk.
export async function generateEmbedding(text: string): Promise<number[]> {
  // Reject empty input before calling the API.
  if (!text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;

  // Ensure the API returned a valid vector.
  if (!values || values.length === 0) {
    throw new Error("Gemini returned an empty embedding");
  }

  return values;
}
