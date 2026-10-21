/**
 * Calculate cosine similarity between two vectors.
 * A higher score means the vectors point in a more similar direction.
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0) {
    throw new Error("Vectors cannot be empty");
  }

  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const valueA = vectorA[i]!;
    const valueB = vectorB[i]!;

    dotProduct += valueA * valueB;
    magnitudeA += valueA ** 2;
    magnitudeB += valueB ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error("Vectors cannot have zero magnitude");
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
