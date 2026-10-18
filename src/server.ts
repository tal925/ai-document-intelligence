import express from "express";
import { summarizeDocument } from "./services/geminiService.js";

const app = express();
const PORT = 3000;

// Parse incoming JSON request bodies
app.use(express.json());

// Check that the server is running
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// Generate a summary for the submitted document
app.post("/api/documents/summary", async (req, res) => {
  const { content } = req.body;

  // Reject missing or empty content
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Content is required",
    });
  }

  try {
    // Generate a summary using Gemini
    const summary = await summarizeDocument(content);

    // Return the generated summary
    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    // Log the error for debugging
    console.error("Failed to summarize document:", error);

    // Return a server error response
    return res.status(500).json({
      success: false,
      error: "Failed to summarize document",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
