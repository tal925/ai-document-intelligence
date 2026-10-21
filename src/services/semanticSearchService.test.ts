import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./embeddingService.js", () => ({
  generateEmbedding: vi.fn(),
}));

import { generateEmbedding } from "./embeddingService.js";
import {
  semanticSearch,
  semanticSearchPrepared,
} from "./semanticSearchService.js";
import type { TextChunk } from "./chunkingService.js";

const mockGenerateEmbedding = vi.mocked(generateEmbedding);

describe("semanticSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const chunks: TextChunk[] = [
    { index: 0, content: "Employees can work from home two days a week." },
    { index: 1, content: "The office is open from Sunday to Thursday." },
  ];

  it("should return chunks ranked by similarity", async () => {
    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      if (text === "How many remote work days?") {
        return [1, 0];
      }

      if (text === "Employees can work from home two days a week.") {
        return [0.8, 0.2];
      }

      if (text === "The office is open from Sunday to Thursday.") {
        return [0.6, 0.8];
      }

      throw new Error(`Unexpected text: ${text}`);
    });

    const results = await semanticSearch("How many remote work days?", chunks);

    expect(results).toHaveLength(1);
    expect(results[0]?.index).toBe(0);
    expect(results[0]!.score).toBeGreaterThan(0.7);
  });

  it("should return only topK results", async () => {
    mockGenerateEmbedding
      .mockResolvedValueOnce([0.8, 0.6]) // Embedding for chunk 0
      .mockResolvedValueOnce([0.6, 0.8]) // Embedding for chunk 1
      .mockResolvedValueOnce([1, 0]); // Embedding for the query

    const results = await semanticSearch("Office question", chunks, 1);

    expect(results).toHaveLength(1);
    expect(results[0]?.index).toBe(0);
    expect(results[0]!.score).toBeGreaterThan(0.7);
  });

  it("should return an empty array when there are no chunks", async () => {
    const results = await semanticSearch("Any question", []);

    expect(results).toEqual([]);
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("should reject an empty query", async () => {
    await expect(semanticSearch("   ", chunks)).rejects.toThrow(
      "Query cannot be empty",
    );
  });

  it("should reject an invalid topK", async () => {
    await expect(semanticSearch("Question", chunks, 0)).rejects.toThrow(
      "topK must be a positive integer",
    );
  });
});

describe("semanticSearchPrepared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter out chunks below the minimum similarity score", async () => {
    const preparedChunks = [
      {
        index: 0,
        content: "Relevant information",
        embedding: [1, 0],
      },
      {
        index: 1,
        content: "Irrelevant information",
        embedding: [0, 1],
      },
    ];

    mockGenerateEmbedding.mockResolvedValue([1, 0]);

    const results = await semanticSearchPrepared(
      "Relevant question",
      preparedChunks,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.index).toBe(0);
  });
});
