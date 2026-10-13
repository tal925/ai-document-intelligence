import "dotenv/config";

import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Summarize this document in Hebrew using exactly 2 bullet points.

Document:
The Task Management System allows users to create tasks,
assign tasks to team members, and set deadlines.
It sends email reminders when deadlines approach.
The system supports English only.`,
  });

  console.log("AI response:");
  console.log(response.text);
}

main().catch((error) => {
  console.error("Failed to call Gemini API:", error);
  process.exitCode = 1;
});
