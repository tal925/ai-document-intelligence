import { describe, expect, it, vi } from "vitest";

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
  it("should return the embedding vector", async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    const result = await generateEmbedding("Test document");

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(embedContentMock).toHaveBeenCalledOnce();
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
});
