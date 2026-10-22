export type SupportedTextFileType = "txt" | "md";

// Extract text from a supported text file.
export function extractTextFromFile(
  buffer: Buffer,
  fileType: SupportedTextFileType,
): string {
  const text = buffer.toString("utf-8").trim();

  if (!text) {
    throw new Error("No extractable text found in file");
  }

  if (fileType !== "txt" && fileType !== "md") {
    throw new Error("Unsupported file type");
  }

  return text;
}
