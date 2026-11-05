export interface AnswerEvaluationCase {
  id: string;
  answer: string;
  expectedFacts: string[];
  shouldAbstain: boolean;

  // Optional accepted alternatives for specific expected facts.
  expectedFactAliases?: Record<string, string[]>;
}

export interface AnswerCaseResult {
  id: string;
  isCorrect: boolean;
  abstained: boolean;
  missingFacts: string[];
  factCoverage: number;
}

export interface AnswerEvaluationReport {
  totalCases: number;
  correctAnswers: number;
  incorrectAnswers: number;
  answerAccuracy: number;
  factCoverage: number;
  abstentionAccuracy: number;
  results: AnswerCaseResult[];
}

const FALLBACK_ANSWER = "אין מספיק מידע במסמך כדי לענות על השאלה.";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isAbstention(answer: string): boolean {
  return normalizeText(answer) === normalizeText(FALLBACK_ANSWER);
}

function factIsPresent(
  answer: string,
  fact: string,
  aliases: string[] = [],
): boolean {
  const normalizedAnswer = normalizeText(answer);

  const acceptedVariants = [fact, ...aliases];

  return acceptedVariants.some((variant) =>
    normalizedAnswer.includes(normalizeText(variant)),
  );
}

function evaluateCase(evaluationCase: AnswerEvaluationCase): AnswerCaseResult {
  const abstained = isAbstention(evaluationCase.answer);

  const missingFacts = evaluationCase.expectedFacts.filter((fact) => {
    const aliases = evaluationCase.expectedFactAliases?.[fact] ?? [];

    return !factIsPresent(evaluationCase.answer, fact, aliases);
  });

  const factCoverage =
    evaluationCase.expectedFacts.length === 0
      ? 0
      : (evaluationCase.expectedFacts.length - missingFacts.length) /
        evaluationCase.expectedFacts.length;

  const isCorrect = evaluationCase.shouldAbstain
    ? abstained
    : !abstained && missingFacts.length === 0;

  return {
    id: evaluationCase.id,
    isCorrect,
    abstained,
    missingFacts,
    factCoverage,
  };
}

export function evaluateAnswers(
  cases: AnswerEvaluationCase[],
): AnswerEvaluationReport {
  const results = cases.map(evaluateCase);

  const average = (values: number[]): number =>
    values.length === 0
      ? 0
      : values.reduce((sum, value) => sum + value, 0) / values.length;

  const correctAnswers = results.filter((result) => result.isCorrect).length;

  const answerableResults = results.filter(
    (_, index) => (cases[index]?.expectedFacts.length ?? 0) > 0,
  );

  return {
    totalCases: results.length,
    correctAnswers,
    incorrectAnswers: results.length - correctAnswers,

    answerAccuracy: results.length === 0 ? 0 : correctAnswers / results.length,

    factCoverage: average(
      answerableResults.map((result) => result.factCoverage),
    ),

    abstentionAccuracy:
      cases.length === 0
        ? 0
        : average(
            cases.map((evaluationCase, index) =>
              results[index]?.abstained === evaluationCase.shouldAbstain
                ? 1
                : 0,
            ),
          ),

    results,
  };
}
