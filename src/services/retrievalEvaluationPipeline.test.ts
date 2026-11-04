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

  it("should evaluate semantic retrieval across varied evaluation cases", async () => {
    const vectorSize = evaluationChunks.length + evaluationCases.length;

    const chunkVectors = new Map(
      evaluationChunks.map((chunk) => [
        chunk.content,
        Array.from({ length: vectorSize }, (_, index) =>
          index === chunk.index ? 1 : 0,
        ),
      ]),
    );

    const queryVectors = new Map(
      evaluationCases.map((evaluationCase, caseIndex) => {
        const vector: number[] = Array.from(
          { length: vectorSize },
          (_, index) =>
            index === evaluationChunks.length + caseIndex ? 0.1 : 0,
        );

        evaluationCase.relevantChunkIndexes.forEach((chunkIndex) => {
          vector[chunkIndex] = 1;
        });

        return [evaluationCase.question, vector];
      }),
    );

    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      const chunkVector = chunkVectors.get(text);

      if (chunkVector) {
        return chunkVector;
      }

      const queryVector = queryVectors.get(text);

      if (queryVector) {
        return queryVector;
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

    for (const evaluationCase of evaluationCases) {
      const result = report.results.find(
        (item) => item.id === evaluationCase.id,
      );

      expect(result).toBeDefined();

      if (evaluationCase.relevantChunkIndexes.length === 0) {
        expect(result?.recall).toBe(0);
        expect(result?.precision).toBe(0);
      } else {
        expect(result?.recall).toBe(1);
        expect(result?.precision).toBe(1);
      }
    }
  });

  it("should retrieve all relevant chunks for a multi-chunk question", async () => {
    const multiChunkCase = evaluationCases.find(
      (evaluationCase) => evaluationCase.id === "attendance-process-combined",
    );

    expect(multiChunkCase).toBeDefined();

    if (!multiChunkCase) {
      throw new Error("Multi-chunk evaluation case was not found");
    }

    const vectorSize = evaluationChunks.length + 1;
    const queryVector = Array.from({ length: vectorSize }, (_, index) =>
      multiChunkCase.relevantChunkIndexes.includes(index) ? 0.8 : 0,
    );

    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      const chunk = evaluationChunks.find((item) => item.content === text);

      if (chunk) {
        return Array.from({ length: vectorSize }, (_, index) =>
          index === chunk.index ? 1 : 0,
        );
      }

      if (text === multiChunkCase.question) {
        return queryVector;
      }

      throw new Error(`Unexpected embedding input: ${text}`);
    });

    const preparedChunks = await prepareChunks(evaluationChunks);

    const results = await semanticSearchPrepared(
      multiChunkCase.question,
      preparedChunks,
      3,
    );

    expect(results.map((result) => result.index)).toEqual(
      expect.arrayContaining(multiChunkCase.relevantChunkIndexes),
    );
  });
});
