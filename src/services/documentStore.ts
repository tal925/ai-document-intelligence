import { randomUUID } from "node:crypto";
import type { EmbeddedChunk } from "./semanticSearchService.js";

// Store prepared document chunks in server memory.
const documents = new Map<string, EmbeddedChunk[]>();

// Save a document and return its unique ID.
export function saveDocument(chunks: EmbeddedChunk[]): string {
  const documentId = randomUUID();
  documents.set(documentId, chunks);
  return documentId;
}

// Retrieve a document by its ID.
export function getDocument(documentId: string): EmbeddedChunk[] | undefined {
  return documents.get(documentId);
}
