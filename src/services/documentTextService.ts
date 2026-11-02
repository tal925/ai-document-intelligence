import mammoth from "mammoth";

export type SupportedTextFileType = "txt" | "md" | "docx";

// Extract text from a supported document file.
export async function extractTextFromFile(
  buffer: Buffer,
  fileType: SupportedTextFileType,
): Promise<string> {
  let text: string;

  if (fileType === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value.trim();
    } catch {
      throw new Error("Invalid DOCX file");
    }
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer).trim();
    } catch {
      throw new Error("Invalid text file encoding");
    }
  }

  if (!text) {
    throw new Error("No extractable text found in file");
  }

  return text;
}
