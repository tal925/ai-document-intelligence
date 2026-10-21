
import { describe, expect, it } from "vitest";
import { chunkText } from "./chunkingService.js";

describe("chunkText", () => {
  it("should split text into chunks", () => {
    const result = chunkText("abcdefghij", 4, 1);

    expect(result.map((chunk) => chunk.content)).toEqual([
      "abcd",
      "defg",
      "ghij",
    ]);
  });

  it("should return an empty array for empty text", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("should return one chunk for short text", () => {
    expect(chunkText("Hello world")).toEqual([
      { index: 0, content: "Hello world" },
    ]);
  });

  it("should reject invalid configuration", () => {
    expect(() => chunkText("hello", 10, 10)).toThrow(
      "Invalid chunk size or overlap"
    );
  });
});
