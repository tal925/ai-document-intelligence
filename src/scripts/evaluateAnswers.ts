import "dotenv/config";

import {
  prepareChunks,
  semanticSearchPrepared,
} from "../services/semanticSearchService.js";

import { expandContext } from "../services/contextExpansionService.js";
import { answerQuestion } from "../services/geminiService.js";
import { evaluateAnswers } from "../services/answerEvaluationService.js";

import { evaluationChunks } from "../services/fixtures/retrieval-evaluation/retrievalEvaluationDataset.js";

import { answerEvaluationCases } from "../services/fixtures/answer-evaluation/answerEvaluationDataset.js";

const TOP_K = 3;

async function runAnswerEvaluation(): Promise<void> {
  console.log("Starting answer evaluation...\n");

  console.log("Preparing document chunks and generating embeddings...");

  const preparedChunks = await prepareChunks(evaluationChunks);

  console.log(`Prepared ${preparedChunks.length} chunks.\n`);

  const evaluatedCases = [];

  for (const evaluationCase of answerEvaluationCases) {
    console.log(`Evaluating: ${evaluationCase.id}`);

    const searchResults = await semanticSearchPrepared(
      evaluationCase.question,
      preparedChunks,
      TOP_K,
    );

    const expandedContext = expandContext(searchResults, preparedChunks);

    const answer = await answerQuestion(
      evaluationCase.question,
      expandedContext,
    );

    evaluatedCases.push({
      id: evaluationCase.id,
      answer,
      expectedFacts: evaluationCase.expectedFacts,
      shouldAbstain: evaluationCase.shouldAbstain,
    });

    console.log(`Retrieved chunks: ${searchResults.length}`);
    console.log(`Answer: ${answer}\n`);
  }

  const report = evaluateAnswers(evaluatedCases);

  console.log("\n========== ANSWER EVALUATION REPORT ==========\n");

  console.log(`Total cases: ${report.totalCases}`);
  console.log(`Correct answers: ${report.correctAnswers}`);
  console.log(`Incorrect answers: ${report.incorrectAnswers}`);

  console.log(`Answer accuracy: ${(report.answerAccuracy * 100).toFixed(2)}%`);

  console.log(`Fact coverage: ${(report.factCoverage * 100).toFixed(2)}%`);

  console.log(
    `Abstention accuracy: ${(report.abstentionAccuracy * 100).toFixed(2)}%`,
  );

  console.log("\n========== CASE RESULTS ==========\n");

  for (const result of report.results) {
    console.log(`${result.id}: ${result.isCorrect ? "PASS" : "FAIL"}`);

    if (result.missingFacts.length > 0) {
      console.log(`Missing facts: ${result.missingFacts.join(", ")}`);
    }
  }

  console.log("\nAnswer evaluation completed.");
}

runAnswerEvaluation().catch((error: unknown) => {
  console.error("Answer evaluation failed:", error);
  process.exitCode = 1;
});
