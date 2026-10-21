import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmbeddedChunk } from "./semanticSearchService.js";

// Get the directory containing this file.
const currentDirectory = dirname(fileURLToPath(import.meta.url));

// Store persistent data outside the source directory.
const dataDirectory = join(currentDirectory, "../../data");
const storageFile =
  process.env.DOCUMENT_STORE_PATH ?? join(dataDirectory, "documents.json");

// Create the data directory if it does not exist.
if (!existsSync(dataDirectory)) {
  mkdirSync(dataDirectory, { recursive: true });
}

// Create an empty storage file on the first run.
if (!existsSync(storageFile)) {
  writeFileSync(storageFile, JSON.stringify({}, null, 2), "utf-8");
}

// Read all saved documents from the JSON file.
function readDocuments(): Record<string, EmbeddedChunk[]> {
  const content = readFileSync(storageFile, "utf-8");
  return JSON.parse(content) as Record<string, EmbeddedChunk[]>;
}

// Write all documents to the JSON file.
function writeDocuments(documents: Record<string, EmbeddedChunk[]>): void {
  writeFileSync(storageFile, JSON.stringify(documents, null, 2), "utf-8");
}

// Save a document and return its unique ID.
export function saveDocument(chunks: EmbeddedChunk[]): string {
  const documentId = randomUUID();
  const documents = readDocuments();

  documents[documentId] = chunks;
  writeDocuments(documents);

  return documentId;
}

// Retrieve a document by its ID.
export function getDocument(documentId: string): EmbeddedChunk[] | undefined {
  const documents = readDocuments();
  return documents[documentId];
}
