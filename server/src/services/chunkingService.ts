export interface TextChunk {
  index: number;
  content: string;
}

// Split document text into smaller chunks with overlapping content.
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 150,
): TextChunk[] {
  // Validate chunk configuration.
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error("Invalid chunk size or overlap");
  }

  const normalizedText = text.trim();

  // Return an empty array when the document has no text.
  if (!normalizedText) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + chunkSize, normalizedText.length);

    // Prefer ending at a word boundary when possible.
    if (end < normalizedText.length) {
      const lastSpace = normalizedText.lastIndexOf(" ", end);

      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    const content = normalizedText.slice(start, end).trim();

    if (content) {
      chunks.push({
        index: chunks.length,
        content,
      });
    }

    if (end === normalizedText.length) {
      break;
    }

    // Keep part of the previous chunk to preserve context.
    start = Math.max(start + 1, end - overlap);

    // Avoid starting in the middle of a word.
    // Move to a word boundary only if a space exists.
    const nextSpace = normalizedText.indexOf(" ", start);

    if (nextSpace !== -1 && nextSpace < end) {
      start = nextSpace + 1;
    }

    // Skip whitespace before the next chunk.
    while (start < normalizedText.length && normalizedText[start] === " ") {
      start++;
    }
  }

  return chunks;
}
