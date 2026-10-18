import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import { summarizeDocument } from "./services/geminiService.js";

// Replace the real Gemini service with a controllable mock
vi.mock("./services/geminiService.js", () => ({
  summarizeDocument: vi.fn(),
}));

// Reset the mock before each test
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
