import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("./geminiClient.js", () => ({
  ai: {
    models: {
      generateContent: generateContentMock,
    },
  },
}));

import { answerQuestion, summarizeDocument } from "./geminiService.js";

describe("summarizeDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the generated summary", async () => {
    generateContentMock.mockResolvedValue({
      text: "- Point one\n- Point two",
    });

    const result = await summarizeDocument("Test document");

    expect(result).toBe("- Point one\n- Point two");
    expect(generateContentMock).toHaveBeenCalledOnce();
    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-3.8-flash",
      contents: expect.stringContaining("Test document"),
    });
  });

  it("should reject an empty response", async () => {
    generateContentMock.mockResolvedValue({ text: "" });

    await expect(summarizeDocument("Test document")).rejects.toThrow(
      "Gemini returned an empty response",
    );

    expect(generateContentMock).toHaveBeenCalledOnce();
  });

  it("should retry a temporary API error and then succeed", async () => {
    generateContentMock
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ text: "Summary" });

    const result = await summarizeDocument("Test document");

    expect(result).toBe("Summary");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("should not retry a non-retryable error", async () => {
    const error = new Error("Invalid request");
    generateContentMock.mockRejectedValue(error);

    await expect(summarizeDocument("Test document")).rejects.toThrow(
      "Invalid request",
    );

    expect(generateContentMock).toHaveBeenCalledOnce();
  });

  it("should stop after three attempts for a retryable error", async () => {
    generateContentMock.mockRejectedValue({ status: 503 });

    await expect(summarizeDocument("Test document")).rejects.toEqual({
      status: 503,
    });

    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });
});

describe("answerQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject an empty question without calling Gemini", async () => {
    await expect(answerQuestion("   ", [])).rejects.toThrow(
      "Question cannot be empty",
    );

    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("should return the fallback when there are no chunks", async () => {
    const result = await answerQuestion("What is in the document?", []);

    expect(result).toBeTruthy();
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("should return the generated answer", async () => {
    generateContentMock.mockResolvedValue({
      text: "The document describes a task management system.",
    });

    const chunks = [
      {
        index: 0,
        content: "The system manages tasks and sends deadline reminders.",
        score: 0.9,
      },
    ];

    const result = await answerQuestion("What does the system do?", chunks);

    expect(result).toBe("The document describes a task management system.");
    expect(generateContentMock).toHaveBeenCalledOnce();
    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-3.8-flash",
      contents: expect.stringContaining(
        "The system manages tasks and sends deadline reminders.",
      ),
    });
  });

  it("should reject an empty answer", async () => {
    generateContentMock.mockResolvedValue({ text: "" });

    const chunks = [
      {
        index: 0,
        content: "Some document content",
        score: 0.9,
      },
    ];

    await expect(answerQuestion("A question", chunks)).rejects.toThrow(
      "Gemini returned an empty answer",
    );

    expect(generateContentMock).toHaveBeenCalledOnce();
  });

  it("should retry a temporary API error and then succeed", async () => {
    generateContentMock
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ text: "Answer" });

    const chunks = [
      {
        index: 0,
        content: "Relevant content",
        score: 0.9,
      },
    ];

    const result = await answerQuestion("A question", chunks);

    expect(result).toBe("Answer");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("should stop after three attempts for a retryable error", async () => {
    generateContentMock.mockRejectedValue({ status: 503 });

    const chunks = [
      {
        index: 0,
        content: "Relevant content",
        score: 0.9,
      },
    ];

    await expect(answerQuestion("A question", chunks)).rejects.toEqual({
      status: 503,
    });

    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });
});
