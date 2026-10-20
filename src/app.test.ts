import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import { summarizeDocument } from "./services/geminiService.js";
import { extractTextFromPdf } from "./services/pdfService.js";

// Replace Gemini with a controllable mock
vi.mock("./services/geminiService.js", () => ({
  summarizeDocument: vi.fn(),
}));

// Replace PDF extraction with a controllable mock
vi.mock("./services/pdfService.js", () => ({
  extractTextFromPdf: vi.fn(),
}));

// Reset mocks before each test
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
