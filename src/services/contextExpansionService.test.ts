import { describe, expect, it } from "vitest";
import { expandContext } from "./contextExpansionService.js";
import type { EmbeddedChunk, SearchResult } from "./semanticSearchService.js";

const createChunk = (index: number, content: string): EmbeddedChunk => ({
  index,
  content,
  embedding: [0.1, 0.2],
});

const createSearchResult = (
  index: number,
  content: string,
  score: number,
): SearchResult => ({
  index,
  content,
  score,
});

describe("expandContext", () => {
  const allChunks = [
    createChunk(0, "Chunk zero"),
    createChunk(1, "Chunk one"),
    createChunk(2, "Chunk two"),
    createChunk(3, "Chunk three"),
    createChunk(4, "Chunk four"),
  ];

  it("should include the matching chunk and its adjacent chunks", () => {
    const results = [createSearchResult(2, "Chunk two", 0.9)];

    const expanded = expandContext(results, allChunks);

    expect(expanded).toEqual([
      { index: 1, content: "Chunk one" },
      { index: 2, content: "Chunk two" },
      { index: 3, content: "Chunk three" },
    ]);
  });

  it("should return chunks in their original document order", () => {
    const results = [
      createSearchResult(3, "Chunk three", 0.95),
      createSearchResult(1, "Chunk one", 0.85),
    ];

    const expanded = expandContext(results, allChunks);

    expect(expanded.map((chunk) => chunk.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("should not include duplicate chunks when neighborhoods overlap", () => {
    const results = [
      createSearchResult(1, "Chunk one", 0.9),
      createSearchResult(2, "Chunk two", 0.85),
    ];

    const expanded = expandContext(results, allChunks);

    expect(expanded.map((chunk) => chunk.index)).toEqual([0, 1, 2, 3]);
  });

  it("should not include chunks outside document boundaries", () => {
    const results = [createSearchResult(0, "Chunk zero", 0.9)];

    const expanded = expandContext(results, allChunks);

    expect(expanded.map((chunk) => chunk.index)).toEqual([0, 1]);
  });

  it("should return an empty array when there are no search results", () => {
    const expanded = expandContext([], allChunks);

    expect(expanded).toEqual([]);
  });

  it("should return only chunk indexes and content without embeddings or scores", () => {
    const results = [createSearchResult(2, "Chunk two", 0.9)];

    const expanded = expandContext(results, allChunks);

    expect(expanded[0]).toEqual({
      index: 1,
      content: "Chunk one",
    });

    expect(expanded[0]).not.toHaveProperty("embedding");
    expect(expanded[0]).not.toHaveProperty("score");
  });
});
