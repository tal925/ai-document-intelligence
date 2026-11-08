import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTextMock,
  destroyMock,
  PDFParseMock,
  InvalidPDFException,
  FormatError,
  PasswordException,
} = vi.hoisted(() => {
  class InvalidPDFException extends Error {}
  class FormatError extends Error {}
  class PasswordException extends Error {}

  return {
    getTextMock: vi.fn(),
    destroyMock: vi.fn(),
    PDFParseMock: vi.fn(),
    InvalidPDFException,
    FormatError,
    PasswordException,
  };
});

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getText = getTextMock;
    destroy = destroyMock;

    constructor(options: { data: Buffer }) {
      PDFParseMock(options);
    }
  },
  InvalidPDFException,
  FormatError,
  PasswordException,
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

    const result = await extractTextFromPdf(Buffer.from("%PDF-1.7\nfake PDF"));

    expect(result).toBe("Extracted PDF text");
    expect(PDFParseMock).toHaveBeenCalledOnce();
    expect(getTextMock).toHaveBeenCalledOnce();
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("should reject a PDF with no extractable text", async () => {
    getTextMock.mockResolvedValue({
      text: "   \n ",
    });

    await expect(
      extractTextFromPdf(Buffer.from("%PDF-1.7\nfake PDF")),
    ).rejects.toThrow("No extractable text found in PDF");

    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["invalid PDF", InvalidPDFException],
    ["malformed PDF format", FormatError],
    ["password-protected PDF", PasswordException],
  ])(
    "should classify %s as an invalid PDF",
    async (_description, ErrorType) => {
      getTextMock.mockRejectedValue(new ErrorType("PDF parsing error"));

      await expect(
        extractTextFromPdf(Buffer.from("%PDF-1.7\nfake PDF")),
      ).rejects.toThrow("Invalid PDF file");

      expect(destroyMock).toHaveBeenCalledOnce();
    },
  );

  it("should reject a malformed file with a PDF signature", async () => {
    getTextMock.mockRejectedValue(
      new InvalidPDFException("Invalid PDF structure"),
    );

    await expect(
      extractTextFromPdf(Buffer.from("%PDF-1.7\nThis is not a real PDF")),
    ).rejects.toThrow("Invalid PDF file");

    expect(PDFParseMock).toHaveBeenCalledOnce();
    expect(getTextMock).toHaveBeenCalledOnce();
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("should propagate an unexpected text extraction error", async () => {
    const unexpectedError = new Error("Unexpected parser failure");
    getTextMock.mockRejectedValue(unexpectedError);

    await expect(
      extractTextFromPdf(Buffer.from("%PDF-1.7\nfake PDF")),
    ).rejects.toBe(unexpectedError);

    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("should reject a buffer shorter than the PDF signature", async () => {
    const buffer = Buffer.from("%PDF");

    await expect(extractTextFromPdf(buffer)).rejects.toThrow(
      "Invalid PDF file",
    );

    expect(PDFParseMock).not.toHaveBeenCalled();
    expect(destroyMock).not.toHaveBeenCalled();
  });
  it("should reject a buffer that is not a PDF file", async () => {
    const buffer = Buffer.from("This is not a PDF file");

    await expect(extractTextFromPdf(buffer)).rejects.toThrow(
      "Invalid PDF file",
    );

    expect(PDFParseMock).not.toHaveBeenCalled();
    expect(getTextMock).not.toHaveBeenCalled();
    expect(destroyMock).not.toHaveBeenCalled();
  });
});
