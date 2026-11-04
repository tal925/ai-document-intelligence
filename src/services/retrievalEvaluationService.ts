export interface RetrievalEvaluationCase {
  id: string;
  retrievedChunkIndexes: number[];
  relevantChunkIndexes: number[];
}

export interface RetrievalCaseResult {
  id: string;
  recall: number;
  precision: number;
}

export interface RetrievalEvaluationReport {
  totalCases: number;
  averageRecall: number;
  averagePrecision: number;
  results: RetrievalCaseResult[];
}

/**
 * Calculates the fraction of relevant chunks found among retrieved chunks.
 */
export function calculateRecallAtK(
  retrievedChunkIndexes: number[],
  relevantChunkIndexes: number[],
): number {
  if (relevantChunkIndexes.length === 0) {
    return 0;
  }

  const relevantIndexes = new Set(relevantChunkIndexes);

  const relevantRetrievedCount = new Set(
    retrievedChunkIndexes.filter((index) => relevantIndexes.has(index)),
  ).size;

  return relevantRetrievedCount / relevantIndexes.size;
}

/**
 * Calculates the fraction of retrieved chunks that are relevant.
 */
export function calculatePrecisionAtK(
  retrievedChunkIndexes: number[],
  relevantChunkIndexes: number[],
): number {
  if (retrievedChunkIndexes.length === 0) {
    return 0;
  }

  const relevantIndexes = new Set(relevantChunkIndexes);

  const relevantRetrievedCount = new Set(
    retrievedChunkIndexes.filter((index) => relevantIndexes.has(index)),
  ).size;

  return relevantRetrievedCount / new Set(retrievedChunkIndexes).size;
}

/**
 * Evaluates retrieval results across multiple cases.
 */
export function evaluateRetrieval(
  cases: RetrievalEvaluationCase[],
): RetrievalEvaluationReport {
  const results = cases.map((evaluationCase) => ({
    id: evaluationCase.id,
    recall: calculateRecallAtK(
      evaluationCase.retrievedChunkIndexes,
      evaluationCase.relevantChunkIndexes,
    ),
    precision: calculatePrecisionAtK(
      evaluationCase.retrievedChunkIndexes,
      evaluationCase.relevantChunkIndexes,
    ),
  }));

  if (results.length === 0) {
    return {
      totalCases: 0,
      averageRecall: 0,
      averagePrecision: 0,
      results: [],
    };
  }

  return {
    totalCases: results.length,
    averageRecall:
      results.reduce((sum, result) => sum + result.recall, 0) / results.length,
    averagePrecision:
      results.reduce((sum, result) => sum + result.precision, 0) /
      results.length,
    results,
  };
}
