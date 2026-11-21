import {
  PDFParse,
  InvalidPDFException,
  FormatError,
  PasswordException,
} from "pdf-parse";

// Extract text from a PDF buffer
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Validate the PDF file signature before parsing.
  if (
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("Invalid PDF file");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text.trim();

    // Reject PDFs that contain no extractable text
    if (!text) {
      throw new Error("No extractable text found in PDF");
    }

    return text;
  } catch (error) {
    if (
      error instanceof InvalidPDFException ||
      error instanceof FormatError ||
      error instanceof PasswordException
    ) {
      throw new Error("Invalid PDF file", { cause: error });
    }

    // Preserve unexpected errors so they can be handled as server errors.
    throw error;
  } finally {
    // Release parser resources
    await parser.destroy();
  }
}
