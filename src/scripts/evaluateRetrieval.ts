import "dotenv/config";

import {
  prepareChunks,
  semanticSearchPrepared,
} from "../services/semanticSearchService.js";

import { evaluateRetrieval } from "../services/retrievalEvaluationService.js";

import {
  evaluationCases,
  evaluationChunks,
} from "../services/fixtures/retrieval-evaluation/retrievalEvaluationDataset.js";

const TOP_K = 3;

async function runRetrievalEvaluation(): Promise<void> {
  console.log("Starting retrieval evaluation with real Gemini embeddings...");
  console.log(`Dataset: ${evaluationChunks.length} chunks`);
  console.log(`Evaluation cases: ${evaluationCases.length}`);
  console.log(`Top K: ${TOP_K}`);
  console.log("");

  const startTime = Date.now();

  // Generate real embeddings for all document chunks once.
  console.log("Generating document chunk embeddings...");
  const preparedChunks = await prepareChunks(evaluationChunks);

  console.log(`Generated ${preparedChunks.length} chunk embeddings.`);
  console.log("");

  const evaluationInputs = [];

  // Evaluate each question using the real embedding model.
  for (const [index, evaluationCase] of evaluationCases.entries()) {
    console.log(
      `[${index + 1}/${evaluationCases.length}] Evaluating: ${evaluationCase.id}`,
    );

    const searchResults = await semanticSearchPrepared(
      evaluationCase.question,
      preparedChunks,
      TOP_K,
    );

    const retrievedChunkIndexes = searchResults.map((result) => result.index);

    evaluationInputs.push({
      id: evaluationCase.id,
      retrievedChunkIndexes,
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

  const report = evaluateRetrieval(evaluationInputs);
  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("========== RETRIEVAL EVALUATION REPORT ==========");
  console.log(`Total cases: ${report.totalCases}`);
  console.log(
    `Average Recall@${TOP_K}: ${(report.averageRecall * 100).toFixed(2)}%`,
  );
  console.log(
    `Average Precision@${TOP_K}: ${(report.averagePrecision * 100).toFixed(2)}%`,
  );
  console.log(`Duration: ${durationSeconds}s`);
  console.log("");

  console.log("Per-case results:");

  for (const result of report.results) {
    console.log(
      `${result.id}: Recall=${(result.recall * 100).toFixed(0)}%, Precision=${(result.precision * 100).toFixed(0)}%`,
    );
  }

  const failedCases = report.results.filter(
    (result) => result.recall < 1 || result.precision < 1,
  );

  console.log("");
  console.log(`Cases requiring review: ${failedCases.length}`);

  for (const failedCase of failedCases) {
    console.log(
      `- ${failedCase.id}: Recall=${(failedCase.recall * 100).toFixed(0)}%, Precision=${(failedCase.precision * 100).toFixed(0)}%`,
    );
  }
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
