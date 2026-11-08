import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
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

  it("should reject a ZIP archive that is not a DOCX document", async () => {
    const buffer = Buffer.from(
      "PK\u0003\u0004This is not a valid DOCX archive",
    );

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });

  it("should reject a valid ZIP archive that is not a DOCX document", async () => {
    const buffer = Buffer.from(
      "UEsDBBQAAAAIAHGnZV3Tb6+qKwAAACwAAAAKAAAAcmVhZG1lLnR4dAvJyCxWAKJEhbLEnMwUhSjPAIWk0hKFvPwSoJiLv3OEQkp+cmlual6JHgBQSwECFAAUAAAACABxp2Vd02+vqisAAAAsAAAACgAAAAAAAAAAAAAAAAAAAAAAcmVhZG1lLnR4dFBLBQYAAAAAAQABADgAAABTAAAAAAA=",
      "base64",
    );

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });

  it("should reject an invalid DOCX file", async () => {
    const buffer = Buffer.from("This is not a valid DOCX file", "utf-8");

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });

  it("should reject a DOCX archive with more than 100 entries", async () => {
    const zip = new JSZip();

    for (let i = 0; i < 101; i++) {
      zip.file(`entry-${i}.txt`, "test");
    }

    zip.file("word/document.xml", "<document/>");

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });

  it("should reject a DOCX archive with an entry larger than 10 MB", async () => {
    const zip = new JSZip();

    zip.file("word/document.xml", "A".repeat(10 * 1024 * 1024 + 1));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });

  it("should reject a DOCX archive with total uncompressed size larger than 20 MB", async () => {
    const zip = new JSZip();

    zip.file("word/document.xml", "A".repeat(8 * 1024 * 1024));
    zip.file("word/header1.xml", "B".repeat(8 * 1024 * 1024));
    zip.file("word/footer1.xml", "C".repeat(8 * 1024 * 1024));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(extractTextFromFile(buffer, "docx")).rejects.toThrow(
      "Invalid DOCX file",
    );
  });
});
