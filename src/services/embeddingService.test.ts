import { beforeEach, describe, expect, it, vi } from "vitest";

const { embedContentMock } = vi.hoisted(() => ({
  embedContentMock: vi.fn(),
}));

vi.mock("./geminiClient.js", () => ({
  ai: {
    models: {
      embedContent: embedContentMock,
    },
  },
}));

import { generateEmbedding } from "./embeddingService.js";

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the embedding vector", async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    const result = await generateEmbedding("Test document");

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(embedContentMock).toHaveBeenCalledOnce();
    expect(embedContentMock).toHaveBeenCalledWith({
      model: "gemini-embedding-2",
      contents: "Test document",
    });
  });

  it("should reject empty text", async () => {
    await expect(generateEmbedding("   ")).rejects.toThrow(
      "Text cannot be empty",
    );

    expect(embedContentMock).not.toHaveBeenCalled();
  });

  it("should reject an empty embedding response", async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [] }],
    });

    await expect(generateEmbedding("Test document")).rejects.toThrow(
      "Gemini returned an empty embedding",
    );
  });

  it("should reject a response without embeddings", async () => {
    embedContentMock.mockResolvedValue({});

    await expect(generateEmbedding("Test document")).rejects.toThrow(
      "Gemini returned an empty embedding",
    );
  });

  it("should propagate an API error", async () => {
    embedContentMock.mockRejectedValue(new Error("Gemini API failed"));

    await expect(generateEmbedding("Test document")).rejects.toThrow(
      "Gemini API failed",
    );
  });
});
