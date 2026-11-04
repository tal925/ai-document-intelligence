import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./embeddingService.js", () => ({
  generateEmbedding: vi.fn(),
}));

import { generateEmbedding } from "./embeddingService.js";
import {
  prepareChunks,
  semanticSearchPrepared,
} from "./semanticSearchService.js";
import { evaluateRetrieval } from "./retrievalEvaluationService.js";
import {
  evaluationCases,
  evaluationChunks,
} from "./fixtures/retrieval-evaluation/retrievalEvaluationDataset.js";

const mockGenerateEmbedding = vi.mocked(generateEmbedding);

describe("retrieval evaluation pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should evaluate semantic retrieval using the evaluation dataset", async () => {
    const embeddingForIndex = (index: number): number[] =>
      Array.from({ length: evaluationChunks.length }, (_, i) =>
        i === index ? 1 : 0,
      );

    const chunkIndexes = new Map(
      evaluationChunks.map((chunk) => [chunk.content, chunk.index]),
    );

    const queryIndexes = new Map(
      evaluationCases.map((evaluationCase) => [
        evaluationCase.question,
        evaluationCase.relevantChunkIndexes[0]!,
      ]),
    );

    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      const chunkIndex = chunkIndexes.get(text);

      if (chunkIndex !== undefined) {
        return embeddingForIndex(chunkIndex);
      }

      const queryIndex = queryIndexes.get(text);

      if (queryIndex !== undefined) {
        return embeddingForIndex(queryIndex);
      }

      throw new Error(`Unexpected embedding input: ${text}`);
    });

    const preparedChunks = await prepareChunks(evaluationChunks);

    const evaluationInputs = [];

    for (const evaluationCase of evaluationCases) {
      const searchResults = await semanticSearchPrepared(
        evaluationCase.question,
        preparedChunks,
        3,
      );

      evaluationInputs.push({
        id: evaluationCase.id,
        retrievedChunkIndexes: searchResults.map((result) => result.index),
        relevantChunkIndexes: evaluationCase.relevantChunkIndexes,
      });
    }

    const report = evaluateRetrieval(evaluationInputs);

    expect(report.totalCases).toBe(evaluationCases.length);
    expect(report.results).toHaveLength(evaluationCases.length);
    expect(report.averageRecall).toBe(1);
    expect(report.averagePrecision).toBe(1);

    for (const result of report.results) {
      expect(result.recall).toBe(1);
      expect(result.precision).toBe(1);
    }
  });
});
