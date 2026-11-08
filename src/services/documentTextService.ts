import mammoth from "mammoth";
import * as yauzl from "yauzl";

export type SupportedTextFileType = "txt" | "md" | "docx";

const MAX_ZIP_ENTRIES = 100;
const MAX_ENTRY_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_SIZE = 20 * 1024 * 1024;
const MAX_DOCUMENT_XML_SIZE = 10 * 1024 * 1024;

async function validateDocxArchive(buffer: Buffer): Promise<void> {
  const zipFile = await yauzl.fromBufferPromise(buffer, {
    autoClose: true,
    lazyEntries: true,
    decodeStrings: true,
    validateEntrySizes: true,
    strictFileNames: true,
  });

  try {
    if (zipFile.entryCount > MAX_ZIP_ENTRIES) {
      throw new Error("Invalid DOCX file");
    }

    let totalSize = 0;
    let hasDocumentXml = false;
    const fileNames = new Set<string>();

    for await (const entry of zipFile.eachEntry()) {
      const fileName = entry.fileName;

      if (
        !fileName ||
        yauzl.validateFileName(fileName) !== null ||
        fileName.startsWith("/") ||
        fileName.includes("\\") ||
        fileName.split("/").includes("..") ||
        fileNames.has(fileName.toLowerCase())
      ) {
        throw new Error("Invalid DOCX file");
      }

      fileNames.add(fileName.toLowerCase());

      if (
        entry.isEncrypted() ||
        !entry.canDecodeFileData() ||
        !Number.isSafeInteger(entry.uncompressedSize) ||
        entry.uncompressedSize < 0 ||
        entry.uncompressedSize > MAX_ENTRY_SIZE
      ) {
        throw new Error("Invalid DOCX file");
      }

      if (fileName.endsWith("/") && entry.uncompressedSize !== 0) {
        throw new Error("Invalid DOCX file");
      }

      totalSize += entry.uncompressedSize;

      if (totalSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
        throw new Error("Invalid DOCX file");
      }

      if (fileName === "word/document.xml") {
        hasDocumentXml = true;

        if (entry.uncompressedSize > MAX_DOCUMENT_XML_SIZE) {
          throw new Error("Invalid DOCX file");
        }
      }

      if (!fileName.endsWith("/")) {
        const stream = await zipFile.openReadStreamPromise(entry);
        let actualSize = 0;

        for await (const chunk of stream) {
          actualSize += chunk.length;

          if (
            actualSize > MAX_ENTRY_SIZE ||
            actualSize > entry.uncompressedSize
          ) {
            stream.destroy();
            throw new Error("Invalid DOCX file");
          }
        }

        if (actualSize !== entry.uncompressedSize) {
          throw new Error("Invalid DOCX file");
        }
      }
    }

    if (!hasDocumentXml) {
      throw new Error("Invalid DOCX file");
    }
  } finally {
    zipFile.close();
  }
}

// Extract text from a supported document file.
export async function extractTextFromFile(
  buffer: Buffer,
  fileType: SupportedTextFileType,
): Promise<string> {
  let text: string;

  if (fileType === "docx") {
    try {
      await validateDocxArchive(buffer);

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
