import express from "express";
import { summarizeDocument } from "./services/geminiService.js";
import multer from "multer";
import { extractTextFromPdf } from "./services/pdfService.js";

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
    const summary = await summarizeDocument(content);

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

// Export the app so it can be tested without starting a server
export default app;
