import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractTextFromFile } from "./documentTextService.js";

describe("extractTextFromFile", () => {
  it("should extract text from a TXT file", async () => {
    const buffer = Buffer.from("Hello world", "utf-8");

    await expect(extractTextFromFile(buffer, "txt")).resolves.toBe(
      "Hello world",
    );
  });

  it("should extract Hebrew text from a Markdown file", async () => {
    const content = "# כותרת\nתוכן בעברית";
    const buffer = Buffer.from(content, "utf-8");

    await expect(extractTextFromFile(buffer, "md")).resolves.toBe(content);
  });

  it("should reject an empty file", async () => {
    const buffer = Buffer.from("   ", "utf-8");

    await expect(extractTextFromFile(buffer, "txt")).rejects.toThrow(
      "No extractable text found in file",
    );
  });

  it("should extract text from a DOCX file", async () => {
    const buffer = fs.readFileSync(
      path.resolve("src/services/fixtures/test-document.docx"),
    );

    await expect(extractTextFromFile(buffer, "docx")).resolves.toBe(
      "DocuMind DOCX test content",
    );
  });

  it("should reject a text file with invalid UTF-8 encoding", async () => {
    const buffer = Buffer.from([0xff, 0xfe, 0xfd]);

    await expect(extractTextFromFile(buffer, "txt")).rejects.toThrow(
      "Invalid text file encoding",
    );
  });

  it("should reject an invalid DOCX file", async () => {
    const buffer = Buffer.from("This is not a valid DOCX file", "utf-8");

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });
});
