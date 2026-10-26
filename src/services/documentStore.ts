import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmbeddedChunk } from "./semanticSearchService.js";

export interface StoredDocument {
  id: string;
  fileName: string;
  createdAt: string;
  chunks: EmbeddedChunk[];
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(currentDirectory, "../../data");
const storageFile =
  process.env.DOCUMENT_STORE_PATH ?? join(dataDirectory, "documents.json");

if (!existsSync(dataDirectory)) {
  mkdirSync(dataDirectory, { recursive: true });
}

if (!existsSync(storageFile)) {
  writeFileSync(storageFile, JSON.stringify({}, null, 2), "utf-8");
}

function readDocuments(): Record<string, StoredDocument> {
  const content = readFileSync(storageFile, "utf-8");
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const documents: Record<string, StoredDocument> = {};
  let migrated = false;

  for (const [id, value] of Object.entries(parsed)) {
    // Support the previous format, where each ID mapped directly to chunks.
    if (Array.isArray(value)) {
      documents[id] = {
        id,
        fileName: "Untitled document",
        createdAt: new Date(0).toISOString(),
        chunks: value as EmbeddedChunk[],
      };
      migrated = true;
      continue;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "chunks" in value &&
      Array.isArray(value.chunks)
    ) {
      const stored = value as Partial<StoredDocument>;

      documents[id] = {
        id,
        fileName:
          typeof stored.fileName === "string"
            ? stored.fileName
            : "Untitled document",
        createdAt:
          typeof stored.createdAt === "string"
            ? stored.createdAt
            : new Date(0).toISOString(),
        chunks: stored.chunks as EmbeddedChunk[],
      };
      continue;
    }

    throw new Error(`Invalid stored document format for ID: ${id}`);
  }

  if (migrated) {
    writeDocuments(documents);
  }

  return documents;
}

function writeDocuments(documents: Record<string, StoredDocument>): void {
  writeFileSync(storageFile, JSON.stringify(documents, null, 2), "utf-8");
}

export function saveDocument(
  chunks: EmbeddedChunk[],
  fileName = "Untitled document",
): string {
  const id = randomUUID();
  const documents = readDocuments();

  documents[id] = {
    id,
    fileName,
    createdAt: new Date().toISOString(),
    chunks,
  };

  writeDocuments(documents);

  return id;
}

export function getDocument(documentId: string): EmbeddedChunk[] | undefined {
  return readDocuments()[documentId]?.chunks;
}

export function listDocuments(): Omit<StoredDocument, "chunks">[] {
  return Object.values(readDocuments())
    .map(({ id, fileName, createdAt }) => ({
      id,
      fileName,
      createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
