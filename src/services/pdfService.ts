import { PDFParse } from "pdf-parse";

// Extract text from a PDF buffer
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
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
