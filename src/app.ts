import express from "express";
import { summarizeDocument, answerQuestion } from "./services/geminiService.js";
import multer from "multer";
import { extractTextFromPdf } from "./services/pdfService.js";
import { chunkText } from "./services/chunkingService.js";
import {
  prepareChunks,
  semanticSearch,
  semanticSearchPrepared,
} from "./services/semanticSearchService.js";
import { saveDocument, getDocument } from "./services/documentStore.js";

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Configure PDF uploads in memory with a 5 MB size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Handle file upload errors before the route handler
const handlePdfUpload = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      // Return 413 when the uploaded file exceeds 5 MB
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "File size must not exceed 5 MB",
        });
      }

      // Return 400 for other Multer upload errors
      return res.status(400).json({
        success: false,
        error: "File upload failed",
      });
    }

    // Forward unexpected upload errors to Express
    if (error) {
      return res.status(400).json({
        success: false,
        error: "File upload failed",
      });
    }

    next();
  });
};

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

// Upload a PDF and generate a Hebrew summary
app.post("/api/documents/upload", handlePdfUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "A PDF file is required",
    });
  }

  // Reject files that are not identified as PDFs
  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({
      success: false,
      error: "Only PDF files are supported",
    });
  }

  try {
    const content = await extractTextFromPdf(req.file.buffer);

    // Split the extracted document into smaller chunks.
    const chunks = chunkText(content);

    // Join the chunks to preserve the existing summarization behavior.
    const summary = await summarizeDocument(
      chunks.map((chunk) => chunk.content).join("\n"),
    );

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Failed to process PDF:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process PDF",
    });
  }
});

// Search an uploaded PDF for semantically relevant text.
app.post("/api/documents/search", handlePdfUpload, async (req, res) => {
  const query = req.body?.query;
  const documentId = req.body?.documentId;

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: "Query is required",
    });
  }

  try {
    // Search a previously indexed document without uploading it again.
    if (typeof documentId === "string" && documentId.trim()) {
      const embeddedChunks = getDocument(documentId);

      if (!embeddedChunks) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      const results = await semanticSearchPrepared(query, embeddedChunks);

      return res.status(200).json({
        success: true,
        query,
        documentId,
        results,
      });
    }

    // Preserve support for searching a PDF uploaded with the request.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "A PDF file or documentId is required",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        error: "Only PDF files are supported",
      });
    }

    const content = await extractTextFromPdf(req.file.buffer);
    const chunks = chunkText(content);
    const results = await semanticSearch(query, chunks);

    return res.status(200).json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    console.error("Failed to search PDF:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to search PDF",
    });
  }
});

// Ask a question about a previously indexed document using RAG
app.post("/api/documents/ask", async (req, res) => {
  const { documentId, question } = req.body ?? {};

  // Validate the question
  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      success: false,
      error: "Question is required",
    });
  }

  // Validate the document ID
  if (typeof documentId !== "string" || !documentId.trim()) {
    return res.status(400).json({
      success: false,
      error: "Document ID is required",
    });
  }

  try {
    // Retrieve the indexed document
    const embeddedChunks = getDocument(documentId);

    if (!embeddedChunks) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    // Find the most relevant chunks
    const results = await semanticSearchPrepared(question, embeddedChunks);

    // Return a fallback answer when no relevant chunks are found.
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        documentId,
        question,
        answer: "אין מספיק מידע במסמך כדי לענות על השאלה.",
        sources: [],
      });
    }

    // Generate an answer based on the retrieved chunks
    const answer = await answerQuestion(question, results);

    // Return the generated answer and its sources
    return res.status(200).json({
      success: true,
      documentId,
      question,
      answer,
      sources: results,
    });
  } catch (error) {
    console.error("Failed to answer document question:", error);

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 429
        ? 503
        : 500;

    return res.status(status).json({
      success: false,
      error:
        status === 503
          ? "AI service quota exceeded. Please try again later."
          : "Failed to answer question",
    });
  }
});

// Upload a PDF, prepare its embeddings, and store it for future searches.
app.post("/api/documents/index", handlePdfUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "A PDF file is required",
    });
  }

  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({
      success: false,
      error: "Only PDF files are supported",
    });
  }

  try {
    const content = await extractTextFromPdf(req.file.buffer);
    const chunks = chunkText(content);
    const embeddedChunks = await prepareChunks(chunks);
    const documentId = saveDocument(embeddedChunks);

    return res.status(201).json({
      success: true,
      documentId,
      message: "Document indexed successfully",
      chunksCount: embeddedChunks.length,
    });
  } catch (error) {
    console.error("Failed to index PDF:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to index PDF",
    });
  }
});

// Export the app so it can be tested without starting a server
export default app;
