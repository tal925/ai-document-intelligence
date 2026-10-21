import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import { summarizeDocument, answerQuestion } from "./services/geminiService.js";
import { extractTextFromPdf } from "./services/pdfService.js";
import {
  prepareChunks,
  semanticSearch,
  semanticSearchPrepared,
} from "./services/semanticSearchService.js";

// Replace Gemini with controllable mocks.
vi.mock("./services/geminiService.js", () => ({
  summarizeDocument: vi.fn(),
  answerQuestion: vi.fn(),
}));

// Replace PDF extraction with a controllable mock.
vi.mock("./services/pdfService.js", () => ({
  extractTextFromPdf: vi.fn(),
}));

// Replace semantic search with controllable mocks.
vi.mock("./services/semanticSearchService.js", () => ({
  semanticSearch: vi.fn(),
  prepareChunks: vi.fn(),
  semanticSearchPrepared: vi.fn(),
}));

// Reset mocks before each test.
beforeEach(() => {
  vi.clearAllMocks();
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
      "* המסמך מאפשר ליצור משימות.\n* המערכת שולחת תזכורות.",
    );

    const response = await request(app)
      .post("/api/documents/summary")
      .send({ content: "A valid document" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary).toContain("המסמך");
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
      error: "A PDF file is required",
    });
  });

  it("should return 400 when the uploaded file is not a PDF", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("plain text"), {
        filename: "document.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Only PDF files are supported",
    });
  });

  it("should return 200 when PDF extraction and summarization succeed", async () => {
    vi.mocked(extractTextFromPdf).mockResolvedValue("A valid PDF document");

    vi.mocked(summarizeDocument).mockResolvedValue(
      "* המסמך מתאר מערכת לניהול משימות.\n* המערכת שולחת תזכורות.",
    );

    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary).toContain("המסמך");

    expect(extractTextFromPdf).toHaveBeenCalledOnce();
    expect(summarizeDocument).toHaveBeenCalledWith("A valid PDF document");
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
      error: "Failed to process PDF",
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

  it("should return 400 when no file is uploaded", async () => {
    const response = await request(app)
      .post("/api/documents/search")
      .field("query", "How many remote work days?");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "A PDF file or documentId is required",
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
      error: "Failed to search PDF",
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
});

describe("POST /api/documents/index", () => {
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

    const response = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.documentId).toBeTypeOf("string");
    expect(response.body.chunksCount).toBe(1);
    expect(prepareChunks).toHaveBeenCalledOnce();
  });
});

describe("POST /api/documents/search with documentId", () => {
  it("should search an indexed document using its documentId", async () => {
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

    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ]);

    // Step 1: Index the PDF.
    const indexResponse = await request(app)
      .post("/api/documents/index")
      .attach("file", Buffer.from("fake PDF content"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(indexResponse.status).toBe(201);
    expect(indexResponse.body.success).toBe(true);

    const documentId = indexResponse.body.documentId;

    // Step 2: Search the indexed document using its ID.
    const searchResponse = await request(app)
      .post("/api/documents/search")
      .send({
        query: "How many remote work days?",
        documentId,
      });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.success).toBe(true);
    expect(searchResponse.body.documentId).toBe(documentId);
    expect(searchResponse.body.results).toHaveLength(1);
    expect(searchResponse.body.results[0].score).toBe(0.95);

    expect(semanticSearchPrepared).toHaveBeenCalledWith(
      "How many remote work days?",
      embeddedChunks,
    );

    // Embeddings are prepared once during indexing.
    expect(prepareChunks).toHaveBeenCalledOnce();

    // Searching by documentId should use prepared embeddings.
    expect(semanticSearch).not.toHaveBeenCalled();
  });
});

describe("POST /api/documents/ask", () => {
  it("should return 400 when question is missing", async () => {
    const response = await request(app)
      .post("/api/documents/ask")
      .send({ documentId: "document-123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Question is required");
  });

  it("should return 400 when documentId is missing", async () => {
    const response = await request(app)
      .post("/api/documents/ask")
      .send({ question: "What is this document about?" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Document ID is required");
  });

  it("should return 404 when document does not exist", async () => {
    const response = await request(app).post("/api/documents/ask").send({
      documentId: "non-existent-document",
      question: "What is this document about?",
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Document not found");
  });

  it("should return an answer based on the indexed document", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [1, 0],
      },
    ];

    const searchResults = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ];

    const { saveDocument } = await import("./services/documentStore.js");
    const documentId = saveDocument(embeddedChunks);

    vi.mocked(semanticSearchPrepared).mockResolvedValue(searchResults);
    vi.mocked(answerQuestion).mockResolvedValue(
      "Employees can work from home two days a week.",
    );

    const response = await request(app).post("/api/documents/ask").send({
      documentId,
      question: "How many days can employees work from home?",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.answer).toBe(
      "Employees can work from home two days a week.",
    );
    expect(response.body.sources).toEqual(searchResults);
    expect(semanticSearchPrepared).toHaveBeenCalledOnce();
    expect(answerQuestion).toHaveBeenCalledOnce();
  });

  it("should return 500 when answering the question fails", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [1, 0],
      },
    ];

    const { saveDocument } = await import("./services/documentStore.js");
    const documentId = saveDocument(embeddedChunks);

    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ]);

    vi.mocked(answerQuestion).mockRejectedValue(
      new Error("Simulated Gemini failure"),
    );

    const response = await request(app).post("/api/documents/ask").send({
      documentId,
      question: "How many days can employees work from home?",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Failed to answer question",
    });
  });

  it("should return 503 when the Gemini quota is exceeded", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        embedding: [1, 0],
      },
    ];

    const { saveDocument } = await import("./services/documentStore.js");
    const documentId = saveDocument(embeddedChunks);

    vi.mocked(semanticSearchPrepared).mockResolvedValue([
      {
        index: 0,
        content: "Employees can work from home two days a week.",
        score: 0.95,
      },
    ]);

    vi.mocked(answerQuestion).mockRejectedValue(
      Object.assign(new Error("Quota exceeded"), { status: 429 }),
    );

    const response = await request(app).post("/api/documents/ask").send({
      documentId,
      question: "How many days can employees work from home?",
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: "AI service quota exceeded. Please try again later.",
    });
  });

  it("should return a fallback answer when search results are empty", async () => {
    const embeddedChunks = [
      {
        index: 0,
        content: "Some document content",
        embedding: [0.1, 0.2, 0.3],
      },
    ];

    const { saveDocument } = await import("./services/documentStore.js");
    const documentId = saveDocument(embeddedChunks);

    // Simulate a search that returns no relevant results.
    vi.mocked(semanticSearchPrepared).mockResolvedValue([]);

    const response = await request(app).post("/api/documents/ask").send({
      documentId,
      question: "What information is missing?",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      documentId,
      question: "What information is missing?",
      answer: "אין מספיק מידע במסמך כדי לענות על השאלה.",
      sources: [],
    });

    expect(semanticSearchPrepared).toHaveBeenCalledOnce();

    // Gemini must not be called when no relevant chunks are found.
    expect(answerQuestion).not.toHaveBeenCalled();
  });
});
