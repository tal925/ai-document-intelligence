import { PDFParse } from "pdf-parse";

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
  } finally {
    // Release parser resources
    await parser.destroy();
  }
}
