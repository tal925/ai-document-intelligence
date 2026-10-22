import { afterEach, describe, expect, it, vi } from "vitest";
import { askDocument, indexDocument } from "./documentApi.js";

describe("documentApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("askDocument", () => {
    it("should send the question and return the answer", async () => {
      const responseData = {
        success: true,
        documentId: "doc-123",
        question: "What is the policy?",
        answer: "Employees can work remotely.",
        sources: [],
      };

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      vi.stubGlobal("fetch", fetchMock);

      const result = await askDocument("doc-123", "What is the policy?");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/documents/ask",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: "doc-123",
            question: "What is the policy?",
          }),
        }),
      );

      expect(result).toEqual(responseData);
    });

    it("should throw the server error message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              error: "Document not found",
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      await expect(
        askDocument("missing-doc", "What is inside?"),
      ).rejects.toThrow("Document not found");
    });

    it("should use a fallback when the error response is invalid JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response("Invalid response", { status: 500 })),
      );

      await expect(askDocument("doc-123", "Question")).rejects.toThrow(
        "An unexpected error occurred. Please try again later.",
      );
    });

    it("should use a fallback when the error message is missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: false }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      await expect(askDocument("doc-123", "Question")).rejects.toThrow(
        "An unexpected error occurred. Please try again later.",
      );
    });
  });

  describe("indexDocument", () => {
    it("should upload the file and return the indexing result", async () => {
      const responseData = {
        success: true,
        documentId: "doc-456",
        message: "Document indexed successfully",
        chunksCount: 3,
      };

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      vi.stubGlobal("fetch", fetchMock);

      const file = new File(["Document content"], "document.txt", {
        type: "text/plain",
      });

      const result = await indexDocument(file);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(url).toBe("/api/documents/index");
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get("file")).toBe(file);
      expect(result).toEqual(responseData);
    });

    it("should throw the server error message when indexing fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              error: "Unsupported file type",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      const file = new File(["content"], "document.exe");

      await expect(indexDocument(file)).rejects.toThrow(
        "Unsupported file type",
      );
    });
  });
});
