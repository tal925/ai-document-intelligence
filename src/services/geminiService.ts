import { ai } from "./geminiClient.js";
import type { SearchResult } from "./semanticSearchService.js";

// Generate a summary with retries for temporary errors.
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
      // Retry only temporary API errors.
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Wait longer before each retry.
      const delay = attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to summarize document after multiple attempts");
}

// Check whether the error is temporary.
function isRetryableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  const status = error.status;

  return status === 429 || status === 500 || status === 503;
}

// Generate a direct answer based only on relevant document chunks.
export async function answerQuestion(
  question: string,
  chunks: SearchResult[],
): Promise<string> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty");
  }

  if (chunks.length === 0) {
    return "אין מספיק מידע במסמך כדי לענות על השאלה.";
  }

  const context = chunks
    .map((chunk, index) => `קטע ${index + 1}:\n${chunk.content}`)
    .join("\n\n");

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `
ענה על השאלה בעברית, ורק על סמך המידע שמופיע בקטעי המסמך המצורפים.

הנחיות:
- התחל מיד בתשובה עצמה.
- אל תפתח בביטויים כמו "על פי קטע המקור", "לפי המסמך", "בהתבסס על המקור" או ניסוחים דומים.
- נסח תשובה טבעית, ברורה וישירה.
- ענה בדיוק על מה שנשאל, והוסף פרטים רלוונטיים מהמסמך כשצריך.
- אל תמציא מידע ואל תסיק מסקנות שאינן נתמכות בקטעים.
- אם אין מספיק מידע כדי לענות, כתוב בדיוק: "אין מספיק מידע במסמך כדי לענות על השאלה."
- החזר את התשובה בלבד, ללא הקדמה וללא כותרת.

קטעי המסמך:
${context}

השאלה:
${question}
`,
      });

      const answer = response.text;

      if (!answer) {
        throw new Error("Gemini returned an empty answer");
      }

      return answer;
    } catch (error) {
      // Retry only temporary API errors.
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delay = attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to answer question after multiple attempts");
}
