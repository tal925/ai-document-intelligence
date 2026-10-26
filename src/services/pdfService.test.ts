import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTextMock, destroyMock, PDFParseMock } = vi.hoisted(() => ({
  getTextMock: vi.fn(),
  destroyMock: vi.fn(),
  PDFParseMock: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getText = getTextMock;
    destroy = destroyMock;

    constructor(_options: { data: Buffer }) {
      PDFParseMock(_options);
    }
  },
}));

import { extractTextFromPdf } from "./pdfService.js";

describe("extractTextFromPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getTextMock.mockReset();
    destroyMock.mockReset();
    PDFParseMock.mockReset();

    destroyMock.mockResolvedValue(undefined);
  });

  it("should return trimmed text from a PDF", async () => {
    getTextMock.mockResolvedValue({
      text: "  Extracted PDF text  \n",
    });

    const result = await extractTextFromPdf(Buffer.from("fake PDF"));

    expect(result).toBe("Extracted PDF text");
    expect(PDFParseMock).toHaveBeenCalledOnce();
    expect(getTextMock).toHaveBeenCalledOnce();
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("should reject a PDF with no extractable text", async () => {
    getTextMock.mockResolvedValue({
      text: "   \n ",
    });

    await expect(extractTextFromPdf(Buffer.from("fake PDF"))).rejects.toThrow(
      "No extractable text found in PDF",
    );

    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("should propagate a text extraction error", async () => {
    getTextMock.mockRejectedValue(new Error("PDF extraction failed"));

    await expect(extractTextFromPdf(Buffer.from("fake PDF"))).rejects.toThrow(
      "PDF extraction failed",
    );

    expect(destroyMock).toHaveBeenCalledOnce();
  });
});
