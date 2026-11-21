import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "./similarityService.js";

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
  });

  it("should return 0 for perpendicular vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("should reject vectors of different lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow(
      "Vectors must have the same length",
    );
  });

  it("should reject empty vectors", () => {
    expect(() => cosineSimilarity([], [])).toThrow("Vectors cannot be empty");
  });

  it("should reject zero vectors", () => {
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow(
      "Vectors cannot have zero magnitude",
    );
  });
});
