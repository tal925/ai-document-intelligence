import { beforeEach, describe, expect, it } from "vitest";
import { getDocument, saveDocument } from "./documentStore.js";
import type { EmbeddedChunk } from "./semanticSearchService.js";

describe("documentStore", () => {
  const chunks: EmbeddedChunk[] = [
    {
      index: 0,
      content: "The system sends email reminders.",
      embedding: [0.1, 0.2, 0.3],
    },
  ];

  beforeEach(() => {
    // The current store uses a Map, so each test uses a unique document ID.
  });

  it("should save a document and return its ID", () => {
    const documentId = saveDocument(chunks);

    expect(documentId).toBeTruthy();
    expect(getDocument(documentId)).toEqual(chunks);
  });

  it("should return undefined for an unknown document ID", () => {
    expect(getDocument("unknown-document-id")).toBeUndefined();
  });

  it("should preserve embeddings when retrieving a document", () => {
    const documentId = saveDocument(chunks);
    const savedChunks = getDocument(documentId);

    expect(savedChunks?.[0]?.embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
