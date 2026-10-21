import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";

describe("documentStore persistence", () => {
  it("should preserve documents after the store module is loaded again", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "document-store-test-"),
    );
    const storageFile = join(temporaryDirectory, "documents.json");

    try {
      const storeModule = pathToFileURL(
        resolve("src/services/documentStore.ts"),
      ).href;

      const saveResult = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
            const store = await import(${JSON.stringify(storeModule)});
            const id = store.saveDocument([
              {
                index: 0,
                content: "Persistent test document",
                embedding: [0.1, 0.2, 0.3]
              }
            ]);
            console.log(id);
          `,
        ],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DOCUMENT_STORE_PATH: storageFile,
          },
        },
      );

      expect(saveResult.status, saveResult.stderr).toBe(0);

      const documentId = saveResult.stdout.trim();
      expect(documentId).toBeTruthy();

      const readResult = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
            const store = await import(${JSON.stringify(storeModule)});
            const document = store.getDocument(${JSON.stringify(documentId)});
            console.log(JSON.stringify(document));
          `,
        ],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DOCUMENT_STORE_PATH: storageFile,
          },
        },
      );

      expect(readResult.status, readResult.stderr).toBe(0);
      expect(JSON.parse(readResult.stdout.trim())).toEqual([
        {
          index: 0,
          content: "Persistent test document",
          embedding: [0.1, 0.2, 0.3],
        },
      ]);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
