import "dotenv/config";

import {
  prepareChunks,
  semanticSearchPrepared,
} from "../services/semanticSearchService.js";

import type { SearchResult } from "../services/semanticSearchService.js";

import { evaluateRetrieval } from "../services/retrievalEvaluationService.js";

import {
  evaluationCases,
  evaluationChunks,
} from "../services/fixtures/retrieval-evaluation/retrievalEvaluationDataset.js";

const TOP_K = 3;

const SIMILARITY_THRESHOLDS = [0.62, 0.65, 0.7, 0.75, 0.8, 0.85];

interface EvaluatedCase {
  id: string;
  searchResults: SearchResult[];
  relevantChunkIndexes: number[];
}

async function runRetrievalEvaluation(): Promise<void> {
  console.log("Starting real Gemini retrieval evaluation...");
  console.log(`Dataset: ${evaluationChunks.length} chunks`);
  console.log(`Evaluation cases: ${evaluationCases.length}`);
  console.log(`Top K: ${TOP_K}`);
  console.log("");

  const startTime = Date.now();

  console.log("Generating document chunk embeddings...");
  const preparedChunks = await prepareChunks(evaluationChunks);

  console.log(`Generated ${preparedChunks.length} chunk embeddings.`);
  console.log("");

  const evaluatedCases: EvaluatedCase[] = [];

  for (const [index, evaluationCase] of evaluationCases.entries()) {
    console.log(
      `[${index + 1}/${evaluationCases.length}] Evaluating: ${evaluationCase.id}`,
    );

    const searchResults = await semanticSearchPrepared(
      evaluationCase.question,
      preparedChunks,
      TOP_K,
    );

    evaluatedCases.push({
      id: evaluationCase.id,
      searchResults,
      relevantChunkIndexes: evaluationCase.relevantChunkIndexes,
    });

    console.log(
      `  Retrieved: ${
        searchResults.length > 0
          ? searchResults
              .map(
                (result) =>
                  `${result.index} (score: ${result.score.toFixed(3)})`,
              )
              .join(", ")
          : "none"
      }`,
    );
  }

  console.log("");
  console.log("========== THRESHOLD SWEEP ==========");
  console.log(
    "Threshold | Answerable Recall | Answerable Precision | Unanswerable FPR",
  );
  console.log(
    "----------|------------------|----------------------|-----------------",
  );

  for (const threshold of SIMILARITY_THRESHOLDS) {
    const evaluationInputs = evaluatedCases.map((evaluationCase) => ({
      id: evaluationCase.id,
      retrievedChunkIndexes: evaluationCase.searchResults
        .filter((result) => result.score >= threshold)
        .slice(0, TOP_K)
        .map((result) => result.index),
      relevantChunkIndexes: evaluationCase.relevantChunkIndexes,
    }));

    const report = evaluateRetrieval(evaluationInputs);

    console.log(
      `${threshold.toFixed(2).padEnd(9)} | ` +
        `${(report.answerableRecall * 100).toFixed(2).padStart(16)}% | ` +
        `${(report.answerablePrecision * 100).toFixed(2).padStart(20)}% | ` +
        `${(report.unanswerableFalsePositiveRate * 100).toFixed(2).padStart(15)}%`,
    );

    const falsePositiveCases = report.results.filter(
      (result) => !result.isAnswerable && result.hasRetrievedResults,
    );

    if (falsePositiveCases.length > 0) {
      console.log(
        `  False positive cases: ${falsePositiveCases
          .map((result) => result.id)
          .join(", ")}`,
      );
    }
  }

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log(`Evaluation completed in ${durationSeconds}s.`);
}

runRetrievalEvaluation().catch((error: unknown) => {
  console.error("Retrieval evaluation failed:");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
