import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import { summarizeDocument, answerQuestion } from "./services/geminiService.js";
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

// Replace Gemini with controllable mocks.
vi.mock("./services/geminiService.js", () => ({
  summarizeDocument: vi.fn(),
  answerQuestion: vi.fn(),
}));

// Replace PDF extraction with a controllable mock.
vi.mock("./services/pdfService.js", () => ({
  extractTextFromPdf: vi.fn(),
}));

// Replace text chunking with a predictable mock.
vi.mock("./services/chunkingService.js", () => ({
  chunkText: vi.fn(),
}));

// Replace semantic search and embedding preparation with mocks.
vi.mock("./services/semanticSearchService.js", () => ({
  semanticSearch: vi.fn(),
  prepareChunks: vi.fn(),
  semanticSearchPrepared: vi.fn(),
}));

// Replace document storage with controllable mocks.
vi.mock("./services/documentStore.js", () => ({
  saveDocument: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(),
}));

// Replace TXT and Markdown extraction with a controllable mock.
vi.mock("./services/documentTextService.js", () => ({
  extractTextFromFile: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(chunkText).mockImplementation((content) => [{ index: 0, content }]);

  vi.mocked(getDocument).mockReturnValue(undefined);
});

describe("GET /api/health", () => {
  it("should return 200 and a success message", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Server is running",
    });
  });
});

describe("GET /api/documents", () => {
  it("should return the list of stored documents", async () => {
    const documents = [
      {
        id: "document-123",
        fileName: "report.pdf",
        createdAt: "2026-10-26T10:00:00.000Z",
      },
    ];

    vi.mocked(listDocuments).mockReturnValue(documents);

    const response = await request(app).get("/api/documents");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      documents,
    });
    expect(listDocuments).toHaveBeenCalledOnce();
  });

  it("should return 500 when listing documents fails", async () => {
    vi.mocked(listDocuments).mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    const response = await request(app).get("/api/documents");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to list documents",
    });
  });
});

describe("DELETE /api/documents/:documentId", () => {
  it("should delete an existing document", async () => {
    vi.mocked(deleteDocument).mockReturnValue(true);

    const response = await request(app).delete("/api/documents/document-123");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Document deleted successfully",
    });
    expect(deleteDocument).toHaveBeenCalledWith("document-123");
  });

  it("should return 404 when the document does not exist", async () => {
    vi.mocked(deleteDocument).mockReturnValue(false);

    const response = await request(app).delete(
      "/api/documents/unknown-document-id",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: "Document not found",
    });
    expect(deleteDocument).toHaveBeenCalledWith("unknown-document-id");
  });

  it("should return 500 when document deletion fails", async () => {
    vi.mocked(deleteDocument).mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    const response = await request(app).delete("/api/documents/document-123");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to delete document",
    });
  });
});

describe("POST /api/documents/summary", () => {
  it("should return 400 when content is empty", async () => {
    const response = await request(app)
      .post("/api/documents/summary")
      .send({ content: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Content is required",
    });
  });

  it("should return 200 when summarization succeeds", async () => {
    vi.mocked(summarizeDocument).mockResolvedValue(
      "Summary line 1\nSummary line 2",
    );

    const response = await request(app)
      .post("/api/documents/summary")
      .send({ content: "A valid document" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      summary: "Summary line 1\nSummary line 2",
    });

    expect(summarizeDocument).toHaveBeenCalledWith("A valid document");
  });

  it("should return 500 when summarization fails", async () => {
    vi.mocked(summarizeDocument).mockRejectedValue(
      new Error("Simulated Gemini failure"),
    );

    const response = await request(app)
      .post("/api/documents/summary")
      .send({ content: "A valid document" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to summarize document",
    });
  });
});

describe("POST /api/documents/upload", () => {
  it("should return 400 when no file is uploaded", async () => {
    const response = await request(app).post("/api/documents/upload");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "A document file is required",
    });
  });

  it("should return 400 when the file type is unsupported", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("image content"), {
        filename: "document.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Unsupported file type or empty document",
    });
  });

  it("should summarize a PDF successfully", async () => {
    vi.mocked(extractTextFromPdf).mockResolvedValue("A valid PDF document");
    vi.mocked(summarizeDocument).mockResolvedValue("PDF summary");

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      summary: "PDF summary",
    });

    expect(extractTextFromPdf).toHaveBeenCalledOnce();
    expect(chunkText).toHaveBeenCalledWith("A valid PDF document");
    expect(summarizeDocument).toHaveBeenCalledWith("A valid PDF document");
  });

  it("should summarize a TXT file successfully", async () => {
    vi.mocked(extractTextFromFile).mockReturnValue("Text file content");
    vi.mocked(summarizeDocument).mockResolvedValue("TXT summary");

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("Text file content"), {
        filename: "document.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      summary: "TXT summary",
    });

    expect(extractTextFromFile).toHaveBeenCalledWith(
      Buffer.from("Text file content"),
      "txt",
    );
    expect(summarizeDocument).toHaveBeenCalledWith("Text file content");
  });

  it("should summarize a Markdown file successfully", async () => {
    vi.mocked(extractTextFromFile).mockReturnValue(
      "# Document\nMarkdown content",
    );
    vi.mocked(summarizeDocument).mockResolvedValue("Markdown summary");

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("# Document\nMarkdown content"), {
        filename: "document.md",
        contentType: "text/markdown",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      summary: "Markdown summary",
    });

    expect(extractTextFromFile).toHaveBeenCalledWith(
      Buffer.from("# Document\nMarkdown content"),
      "md",
    );
  });

  it("should return 400 when a text file contains no extractable text", async () => {
    vi.mocked(extractTextFromFile).mockImplementation(() => {
      throw new Error("No extractable text found in file");
    });

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from(""), {
        filename: "empty.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Unsupported file type or empty document",
    });

    expect(summarizeDocument).not.toHaveBeenCalled();
  });

  it("should return 500 when PDF extraction fails", async () => {
    vi.mocked(extractTextFromPdf).mockRejectedValue(
      new Error("Simulated PDF extraction failure"),
    );

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to process document",
    });

    expect(summarizeDocument).not.toHaveBeenCalled();
  });
});

describe("POST /api/documents/search", () => {
  it("should return 400 when the query is empty", async () => {
    const response = await request(app)
      .post("/api/documents/search")
      .field("query", "   ")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Query is required",
    });
  });

  it("should return 400 when no file or documentId is provided", async () => {
    const response = await request(app)
      .post("/api/documents/search")
      .field("query", "How many remote work days?");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "A supported document file or documentId is required",
    });
  });

  it("should return search results when the request is valid", async () => {
    vi.mocked(extractTextFromPdf).mockResolvedValue(
      "Employees can work from home two days a week.",
    );

    vi.mocked(semanticSearch).mockResolvedValue([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ]);

    const response = await request(app)
      .post("/api/documents/search")
      .field("query", "How many remote work days?")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.query).toBe("How many remote work days?");
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].score).toBe(0.95);

    expect(semanticSearch).toHaveBeenCalledWith("How many remote work days?", [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
      },
    ]);
  });

  it("should return 500 when PDF extraction fails", async () => {
    vi.mocked(extractTextFromPdf).mockRejectedValue(
      new Error("Simulated PDF extraction failure"),
    );

    const response = await request(app)
      .post("/api/documents/search")
      .field("query", "How many remote work days?")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to search document",
    });

    expect(semanticSearch).not.toHaveBeenCalled();
  });

  it("should return 404 when the documentId does not exist", async () => {
    const response = await request(app).post("/api/documents/search").send({
      query: "What is this document about?",
      documentId: "non-existing-document-id",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: "Document not found",
    });

    expect(semanticSearchPrepared).not.toHaveBeenCalled();
  });

  it("should search a previously indexed document", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ]);

    const response = await request(app).post("/api/documents/search").send({
      query: "How many remote work days?",
      documentId: "existing-document-id",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.documentId).toBe("existing-document-id");
    expect(response.body.results).toHaveLength(1);

    expect(getDocument).toHaveBeenCalledWith("existing-document-id");
    expect(semanticSearchPrepared).toHaveBeenCalledWith(
      "How many remote work days?",
      embeddedChunks,
    );
  });
});

describe("POST /api/documents/index", () => {
  it("should return 400 when no file is uploaded", async () => {
    const response = await request(app).post("/api/documents/index");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "A document file is required",
    });
  });

  it("should index a PDF and return a documentId", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(extractTextFromPdf).mockResolvedValue(
      "Employees can work from home two days a week.",
    );
    vi.mocked(prepareChunks).mockResolvedValue(embeddedChunks);
    vi.mocked(saveDocument).mockReturnValue("test-document-id");

    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      documentId: "test-document-id",
      message: "Document indexed successfully",
      chunksCount: 1,
    });

    expect(prepareChunks).toHaveBeenCalledWith([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
      },
    ]);
    expect(saveDocument).toHaveBeenCalledWith(embeddedChunks, "sample.pdf");
  });

  it("should index a TXT file successfully", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Text document content",
        embedding: [0.5, 0.5],
      },
    ];

    vi.mocked(extractTextFromFile).mockReturnValue("Text document content");
    vi.mocked(prepareChunks).mockResolvedValue(embeddedChunks);
    vi.mocked(saveDocument).mockReturnValue("txt-document-id");

    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("Text document content"), {
        filename: "document.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(201);
    expect(response.body.documentId).toBe("txt-document-id");
    expect(response.body.chunksCount).toBe(1);
    expect(saveDocument).toHaveBeenCalledWith(embeddedChunks, "document.txt");
  });

  it("should return 400 when the uploaded file type is unsupported", async () => {
    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("image content"), {
        filename: "document.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Unsupported file type or empty document",
    });

    expect(prepareChunks).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("should return 500 when preparing chunks fails", async () => {
    vi.mocked(extractTextFromPdf).mockResolvedValue("A valid PDF document");
    vi.mocked(prepareChunks).mockRejectedValue(
      new Error("Simulated embedding failure"),
    );

    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to index document",
    });

    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("should return 503 when the AI service quota is exceeded", async () => {
    vi.mocked(extractTextFromPdf).mockResolvedValue("A valid PDF document");

    vi.mocked(prepareChunks).mockRejectedValue({
      status: 429,
      message: "Quota exceeded",
    });

    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: "AI service quota exceeded. Please try again later.",
    });

    expect(saveDocument).not.toHaveBeenCalled();
  });
});

describe("POST /api/documents/ask", () => {
  it("should return 400 when the question is empty", async () => {
    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "   ",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Question is required",
    });
  });

  it("should return 400 when the documentId is missing", async () => {
    const response = await request(app).post("/api/documents/ask").send({
      question: "What does the document say?",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Document ID is required",
    });
  });

  it("should return 404 when the document does not exist", async () => {
    const response = await request(app).post("/api/documents/ask").send({
      documentId: "non-existing-document-id",
      question: "What does the document say?",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: "Document not found",
    });

    expect(semanticSearchPrepared).not.toHaveBeenCalled();
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("should answer a question using the indexed document", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [0.8, 0.2],
      },
    ];

    const searchResults = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue(searchResults);
    vi.mocked(answerQuestion).mockResolvedValue(
      "Employees can work remotely two days a week.",
    );

    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "How many remote work days?",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      documentId: "test-document-id",
      question: "How many remote work days?",
      answer: "Employees can work remotely two days a week.",
      sources: searchResults,
    });

    expect(semanticSearchPrepared).toHaveBeenCalledWith(
      "How many remote work days?",
      embeddedChunks,
    );
    expect(answerQuestion).toHaveBeenCalledWith(
      "How many remote work days?",
      searchResults,
    );
  });

  it("should return a fallback answer when no relevant chunks are found", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "A document about office policies.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue([]);

    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "What is the weather today?",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.documentId).toBe("test-document-id");
    expect(response.body.question).toBe("What is the weather today?");
    expect(response.body.sources).toEqual([]);
    expect(response.body.answer).toBe(
      "אין מספיק מידע במסמך כדי לענות על השאלה.",
    );

    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("should return 500 when answering the question fails", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "A document about office policies.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "A document about office policies.",
        score: 0.9,
      },
    ]);
    vi.mocked(answerQuestion).mockRejectedValue(
      new Error("Simulated Gemini failure"),
    );

    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "What does the document say?",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to answer question",
    });
  });

  it("should return 503 when the AI service quota is exceeded", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "A document about office policies.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "A document about office policies.",
        score: 0.9,
      },
    ]);
    vi.mocked(answerQuestion).mockRejectedValue({
      status: 429,
      message: "Quota exceeded",
    });

    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "What does the document say?",
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: "AI service quota exceeded. Please try again later.",
    });
  });

  it("should return 503 when the AI service is temporarily unavailable", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "A document about office policies.",
        embedding: [0.8, 0.2],
      },
    ];

    vi.mocked(getDocument).mockReturnValue(embeddedChunks);
    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "A document about office policies.",
        score: 0.9,
      },
    ]);
    vi.mocked(answerQuestion).mockRejectedValue({
      status: 503,
      message: "Service unavailable",
    });

    const response = await request(app).post("/api/documents/ask").send({
      documentId: "test-document-id",
      question: "What does the document say?",
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: "AI service is temporarily unavailable. Please try again later.",
    });
  });
});
