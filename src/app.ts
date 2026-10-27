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
import {
  saveDocument,
  getDocument,
  listDocuments,
  deleteDocument,
} from "./services/documentStore.js";
import { extractTextFromFile } from "./services/documentTextService.js";

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Configure document uploads in memory with a 5 MB size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Handle file upload errors before the route handler
const handleDocumentUpload = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "File size must not exceed 5 MB",
        });
      }

      return res.status(400).json({
        success: false,
        error: "File upload failed",
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        error: "File upload failed",
      });
    }

    next();
  });
};

// Identify the document type and extract its text.
async function extractDocumentText(file: Express.Multer.File): Promise<string> {
  const extension = file.originalname.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    if (file.mimetype !== "application/pdf") {
      throw new Error("Unsupported file type");
    }

    return extractTextFromPdf(file.buffer);
  }

  if (extension === "txt" || extension === "md") {
    const allowedMimeTypes = [
      "text/plain",
      "text/markdown",
      "application/octet-stream",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Unsupported file type");
    }

    return extractTextFromFile(file.buffer, extension);
  }

  throw new Error("Unsupported file type");
}

// Check whether an error should be returned as a client error.
function isDocumentInputError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "Unsupported file type" ||
      error.message === "No extractable text found in file")
  );
}

// Check whether Gemini rejected a request because of quota or rate limits.
function isAiQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  return error.status === 429;
}

// Return a consistent response when the AI service is unavailable.
function sendAiError(res: express.Response, error: unknown, message: string) {
  if (isAiQuotaError(error)) {
    return res.status(503).json({
      success: false,
      error: "AI service quota exceeded. Please try again later.",
    });
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 503
  ) {
    return res.status(503).json({
      success: false,
      error: "AI service is temporarily unavailable. Please try again later.",
    });
  }

  console.error(message, error);

  return res.status(500).json({
    success: false,
    error: message,
  });
}

// Check that the server is running
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.get("/api/documents", (_req, res) => {
  try {
    const documents = listDocuments();

    return res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Failed to list documents:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to list documents",
    });
  }
});

// Delete a previously indexed document
app.delete("/api/documents/:documentId", (req, res) => {
  try {
    const deleted = deleteDocument(req.params.documentId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete document:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to delete document",
    });
  }
});

// Generate a summary for submitted text
app.post("/api/documents/summary", async (req, res) => {
  const { content } = req.body;

  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Content is required",
    });
  }

  try {
    const summary = await summarizeDocument(content);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return sendAiError(res, error, "Failed to summarize document");
  }
});

// Upload a supported document and generate a summary
app.post("/api/documents/upload", handleDocumentUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "A document file is required",
    });
  }

  try {
    const content = await extractDocumentText(req.file);
    const chunks = chunkText(content);
    const summary = await summarizeDocument(
      chunks.map((chunk) => chunk.content).join("\n"),
    );

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    if (isDocumentInputError(error)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type or empty document",
      });
    }

    return sendAiError(res, error, "Failed to process document");
  }
});

// Search an uploaded document or a previously indexed document
app.post("/api/documents/search", handleDocumentUpload, async (req, res) => {
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

    // Search a document uploaded with this request.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "A supported document file or documentId is required",
      });
    }

    const content = await extractDocumentText(req.file);
    const chunks = chunkText(content);
    const results = await semanticSearch(query, chunks);

    return res.status(200).json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    if (isDocumentInputError(error)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type or empty document",
      });
    }

    return sendAiError(res, error, "Failed to search document");
  }
});

// Ask a question about a previously indexed document using RAG
app.post("/api/documents/ask", async (req, res) => {
  const { documentId, question } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      success: false,
      error: "Question is required",
    });
  }

  if (typeof documentId !== "string" || !documentId.trim()) {
    return res.status(400).json({
      success: false,
      error: "Document ID is required",
    });
  }

  try {
    const embeddedChunks = getDocument(documentId);

    if (!embeddedChunks) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    console.log("[ask] Starting semantic search");

    const results = await semanticSearchPrepared(question, embeddedChunks);

    console.log(`[ask] Semantic search completed. Results: ${results.length}`);

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

    console.log("[ask] Sending question to Gemini");

    const answer = await answerQuestion(question, results);

    console.log("[ask] Gemini answer received");

    return res.status(200).json({
      success: true,
      documentId,
      question,
      answer,
      sources: results,
    });
  } catch (error) {
    return sendAiError(res, error, "Failed to answer question");
  }
});

// Upload a supported document, prepare its embeddings, and store it.
app.post("/api/documents/index", handleDocumentUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "A document file is required",
    });
  }

  try {
    const content = await extractDocumentText(req.file);
    const chunks = chunkText(content);
    const embeddedChunks = await prepareChunks(chunks);
    const documentId = saveDocument(embeddedChunks, req.file.originalname);

    return res.status(201).json({
      success: true,
      documentId,
      message: "Document indexed successfully",
      chunksCount: embeddedChunks.length,
    });
  } catch (error) {
    if (isDocumentInputError(error)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type or empty document",
      });
    }

    return sendAiError(res, error, "Failed to index document");
  }
});

// Export the app so it can be tested without starting a server
export default app;
