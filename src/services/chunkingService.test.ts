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
      "Invalid chunk size or overlap",
    );
  });

  it("should preserve sequential chunk indexes", () => {
    const result = chunkText("abcdefghij", 4, 1);

    expect(result.map((chunk) => chunk.index)).toEqual([0, 1, 2]);
  });

  it("should preserve word boundaries when possible", () => {
    const result = chunkText("one two three four five six", 12, 3);

    expect(result.every((chunk) => !chunk.content.startsWith(" "))).toBe(true);
    expect(result.every((chunk) => !chunk.content.endsWith(" "))).toBe(true);
  });

  it("should preserve the complete document content across chunks", () => {
    const text = "one two three four five six seven eight nine ten";
    const result = chunkText(text, 15, 5);

    for (const word of text.split(" ")) {
      expect(result.some((chunk) => chunk.content.includes(word))).toBe(true);
    }
  });

  it("should preserve overlap between consecutive chunks", () => {
    const result = chunkText(
      "one two three four five six seven eight nine ten",
      15,
      5,
    );

    expect(result).toHaveLength(5);
    expect(result[0]?.content).toContain("three");
    expect(result[1]?.content).toContain("three");
    expect(result[1]?.content).toContain("five");
    expect(result[2]?.content).toContain("five");
  });
});
