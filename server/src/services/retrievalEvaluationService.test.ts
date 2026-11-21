import { describe, expect, it } from "vitest";
import {
  calculatePrecisionAtK,
  calculateRecallAtK,
  evaluateRetrieval,
} from "./retrievalEvaluationService.js";

describe("retrievalEvaluationService", () => {
  describe("calculateRecallAtK", () => {
    it("should calculate the fraction of relevant chunks retrieved", () => {
      const recall = calculateRecallAtK([1, 2, 5], [1, 2, 3, 4]);
      expect(recall).toBe(0.5);
    });

    it("should return 1 when all relevant chunks are retrieved", () => {
      expect(calculateRecallAtK([1, 2, 3], [1, 2, 3])).toBe(1);
    });

    it("should return 0 when no relevant chunks are retrieved", () => {
      expect(calculateRecallAtK([5, 6], [1, 2, 3])).toBe(0);
    });

    it("should return 0 when there are no relevant chunks", () => {
      expect(calculateRecallAtK([1, 2], [])).toBe(0);
    });

    it("should not count duplicate retrieved indexes more than once", () => {
      expect(calculateRecallAtK([1, 1, 2], [1, 2, 3, 4])).toBe(0.5);
    });
  });

  describe("calculatePrecisionAtK", () => {
    it("should calculate the fraction of retrieved chunks that are relevant", () => {
      expect(calculatePrecisionAtK([1, 2, 5], [1, 2, 3, 4])).toBeCloseTo(2 / 3);
    });

    it("should return 1 when all retrieved chunks are relevant", () => {
      expect(calculatePrecisionAtK([1, 2], [1, 2, 3])).toBe(1);
    });

    it("should return 0 when no retrieved chunks are relevant", () => {
      expect(calculatePrecisionAtK([5, 6], [1, 2, 3])).toBe(0);
    });

    it("should return 0 when no chunks were retrieved", () => {
      expect(calculatePrecisionAtK([], [1, 2])).toBe(0);
    });

    it("should not count duplicate retrieved indexes more than once", () => {
      expect(calculatePrecisionAtK([1, 1, 2], [1, 2, 3])).toBe(1);
    });
  });

  describe("evaluateRetrieval", () => {
    it("should calculate individual results and average metrics", () => {
      const report = evaluateRetrieval([
        {
          id: "case-1",
          retrievedChunkIndexes: [1, 2],
          relevantChunkIndexes: [1, 2],
        },
        {
          id: "case-2",
          retrievedChunkIndexes: [3, 5],
          relevantChunkIndexes: [3, 4],
        },
      ]);

      expect(report).toEqual({
        totalCases: 2,
        answerableCases: 2,
        unanswerableCases: 0,
        averageRecall: 0.75,
        averagePrecision: 0.75,
        answerableRecall: 0.75,
        answerablePrecision: 0.75,
        unanswerableFalsePositiveRate: 0,
        results: [
          {
            id: "case-1",
            recall: 1,
            precision: 1,
            isAnswerable: true,
            hasRetrievedResults: true,
          },
          {
            id: "case-2",
            recall: 0.5,
            precision: 0.5,
            isAnswerable: true,
            hasRetrievedResults: true,
          },
        ],
      });
    });

    it("should distinguish answerable and unanswerable cases", () => {
      const report = evaluateRetrieval([
        {
          id: "answerable",
          retrievedChunkIndexes: [1, 2],
          relevantChunkIndexes: [1],
        },
        {
          id: "unanswerable-with-results",
          retrievedChunkIndexes: [5],
          relevantChunkIndexes: [],
        },
        {
          id: "unanswerable-without-results",
          retrievedChunkIndexes: [],
          relevantChunkIndexes: [],
        },
      ]);

      expect(report.totalCases).toBe(3);
      expect(report.answerableCases).toBe(1);
      expect(report.unanswerableCases).toBe(2);

      expect(report.answerableRecall).toBe(1);
      expect(report.answerablePrecision).toBe(0.5);

      expect(report.unanswerableFalsePositiveRate).toBe(0.5);

      expect(report.results[1]).toMatchObject({
        id: "unanswerable-with-results",
        isAnswerable: false,
        hasRetrievedResults: true,
      });

      expect(report.results[2]).toMatchObject({
        id: "unanswerable-without-results",
        isAnswerable: false,
        hasRetrievedResults: false,
      });
    });

    it("should return zero averages when there are no evaluation cases", () => {
      expect(evaluateRetrieval([])).toEqual({
        totalCases: 0,
        answerableCases: 0,
        unanswerableCases: 0,
        averageRecall: 0,
        averagePrecision: 0,
        answerableRecall: 0,
        answerablePrecision: 0,
        unanswerableFalsePositiveRate: 0,
        results: [],
      });
    });

    it("should preserve the evaluation case IDs", () => {
      const report = evaluateRetrieval([
        {
          id: "remote-work",
          retrievedChunkIndexes: [0],
          relevantChunkIndexes: [0],
        },
      ]);

      expect(report.results[0]?.id).toBe("remote-work");
    });
  });
});
