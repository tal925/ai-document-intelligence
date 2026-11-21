import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteDocument,
  getDocument,
  listDocuments,
  saveDocument,
} from "./documentStore.js";
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
    // Each test saves its own document with a unique ID.
  });

  it("should save a document and return its ID", () => {
    const documentId = saveDocument(chunks, "reminders.pdf");

    expect(documentId).toBeTruthy();
    expect(getDocument(documentId)).toEqual(chunks);
  });

  it("should return undefined for an unknown document ID", () => {
    expect(getDocument("unknown-document-id")).toBeUndefined();
  });

  it("should preserve embeddings when retrieving a document", () => {
    const documentId = saveDocument(chunks, "reminders.pdf");
    const savedChunks = getDocument(documentId);

    expect(savedChunks?.[0]?.embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it("should list saved documents with their metadata", () => {
    const documentId = saveDocument(chunks, "reminders.pdf");

    const documents = listDocuments();
    const savedDocument = documents.find(
      (document) => document.id === documentId,
    );

    expect(savedDocument).toBeDefined();
    expect(savedDocument?.fileName).toBe("reminders.pdf");
    expect(savedDocument?.createdAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(savedDocument!.createdAt))).toBe(false);
    expect(savedDocument).not.toHaveProperty("chunks");
  });

  it("should list newer documents before older documents", async () => {
    const firstId = saveDocument(chunks, "first.pdf");

    await new Promise((resolve) => setTimeout(resolve, 5));

    const secondId = saveDocument(chunks, "second.pdf");
    const documents = listDocuments();

    expect(
      documents.findIndex((document) => document.id === secondId),
    ).toBeLessThan(documents.findIndex((document) => document.id === firstId));
  });

  it("should delete an existing document", () => {
    const documentId = saveDocument(chunks, "to-delete.pdf");

    const deleted = deleteDocument(documentId);

    expect(deleted).toBe(true);
    expect(getDocument(documentId)).toBeUndefined();
    expect(listDocuments().some((document) => document.id === documentId)).toBe(
      false,
    );
  });

  it("should return false when deleting an unknown document ID", () => {
    const existingId = saveDocument(chunks, "keep.pdf");

    const deleted = deleteDocument("unknown-document-id");

    expect(deleted).toBe(false);
    expect(getDocument(existingId)).toEqual(chunks);
  });
});
