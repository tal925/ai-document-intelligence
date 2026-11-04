export interface RetrievalEvaluationCase {
  id: string;
  retrievedChunkIndexes: number[];
  relevantChunkIndexes: number[];
}

export interface RetrievalCaseResult {
  id: string;
  recall: number;
  precision: number;
  isAnswerable: boolean;
  hasRetrievedResults: boolean;
}

export interface RetrievalEvaluationReport {
  totalCases: number;
  answerableCases: number;
  unanswerableCases: number;
  averageRecall: number;
  averagePrecision: number;
  answerableRecall: number;
  answerablePrecision: number;
  unanswerableFalsePositiveRate: number;
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
    isAnswerable: evaluationCase.relevantChunkIndexes.length > 0,
    hasRetrievedResults: evaluationCase.retrievedChunkIndexes.length > 0,
  }));

  const answerableResults = results.filter((result) => result.isAnswerable);

  const unanswerableResults = results.filter((result) => !result.isAnswerable);

  const average = (values: number[]): number =>
    values.length === 0
      ? 0
      : values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    totalCases: results.length,
    answerableCases: answerableResults.length,
    unanswerableCases: unanswerableResults.length,

    averageRecall: average(results.map((result) => result.recall)),
    averagePrecision: average(results.map((result) => result.precision)),

    answerableRecall: average(answerableResults.map((result) => result.recall)),

    answerablePrecision: average(
      answerableResults.map((result) => result.precision),
    ),

    unanswerableFalsePositiveRate: average(
      unanswerableResults.map((result) => (result.hasRetrievedResults ? 1 : 0)),
    ),

    results,
  };
}
