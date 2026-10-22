import { describe, expect, it } from "vitest";
import { extractTextFromFile } from "./documentTextService.js";

describe("extractTextFromFile", () => {
  it("should extract text from a TXT file", () => {
    const buffer = Buffer.from("Hello world", "utf-8");

    expect(extractTextFromFile(buffer, "txt")).toBe("Hello world");
  });

  it("should extract Hebrew text from a Markdown file", () => {
    const buffer = Buffer.from("# כותרת\nתוכן המסמך", "utf-8");

    expect(extractTextFromFile(buffer, "md")).toBe("# כותרת\nתוכן המסמך");
  });

  it("should reject an empty file", () => {
    const buffer = Buffer.from("   ", "utf-8");

    expect(() => extractTextFromFile(buffer, "txt")).toThrow(
      "No extractable text found in file",
    );
  });
});
