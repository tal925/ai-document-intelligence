import type { TextChunk } from "./chunkingService.js";
import type { EmbeddedChunk, SearchResult } from "./semanticSearchService.js";

export function expandContext(
  searchResults: SearchResult[],
  allChunks: EmbeddedChunk[],
  neighborCount = 1,
): TextChunk[] {
  if (!Number.isInteger(neighborCount) || neighborCount < 0) {
    throw new Error("neighborCount must be a non-negative integer");
  }

  if (searchResults.length === 0 || allChunks.length === 0) {
    return [];
  }

  const chunksByIndex = new Map(allChunks.map((chunk) => [chunk.index, chunk]));

  const selectedIndexes = new Set<number>();

  for (const result of searchResults) {
    for (
      let index = result.index - neighborCount;
      index <= result.index + neighborCount;
      index++
    ) {
      if (chunksByIndex.has(index)) {
        selectedIndexes.add(index);
      }
    }
  }

  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => {
      const chunk = chunksByIndex.get(index)!;

      return {
        index: chunk.index,
        content: chunk.content,
      };
    });
}
