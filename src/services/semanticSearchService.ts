import { generateEmbedding } from "./embeddingService.js";
import { cosineSimilarity } from "./similarityService.js";
import type { TextChunk } from "./chunkingService.js";

// A document chunk with its embedding already calculated.
export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

export interface SearchResult extends TextChunk {
  score: number;
}

// Calculate embeddings for document chunks so they can be reused.
export async function prepareChunks(
  chunks: TextChunk[],
): Promise<EmbeddedChunk[]> {
  return Promise.all(
    chunks.map(async (chunk) => ({
      ...chunk,
      embedding: await generateEmbedding(chunk.content),
    })),
  );
}

// Minimum similarity score for a relevant search result.
export const MIN_SIMILARITY_SCORE = 0.5;

// Search chunks whose embeddings have already been calculated.
export async function semanticSearchPrepared(
  query: string,
  chunks: EmbeddedChunk[],
  topK: number = 3,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer");
  }

  if (chunks.length === 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);

  const results: SearchResult[] = chunks.map((chunk) => ({
    index: chunk.index,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return results
    .filter((result) => result.score >= MIN_SIMILARITY_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Keep the original function working for existing callers.
export async function semanticSearch(
  query: string,
  chunks: TextChunk[],
  topK: number = 3,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer");
  }

  if (chunks.length === 0) {
    return [];
  }

  const preparedChunks = await prepareChunks(chunks);
  return semanticSearchPrepared(query, preparedChunks, topK);
}
