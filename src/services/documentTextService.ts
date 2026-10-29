import mammoth from "mammoth";

export type SupportedTextFileType = "txt" | "md" | "docx";

// Extract text from a supported document file.
export async function extractTextFromFile(
  buffer: Buffer,
  fileType: SupportedTextFileType,
): Promise<string> {
  let text: string;

  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value.trim();
  } else {
    text = buffer.toString("utf-8").trim();
  }

  if (!text) {
    throw new Error("No extractable text found in file");
  }

  return text;
}