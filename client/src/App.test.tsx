
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App.js";
import * as documentApi from "./services/documentApi.js";

vi.mock("./services/documentApi.js", () => ({
  askDocument: vi.fn(),
  indexDocument: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an error when a non-PDF file is selected", () => {
    const indexDocumentMock = vi.mocked(documentApi.indexDocument);

    render(<App />);

    const fileInput = screen.getByLabelText(/choose a pdf file/i);
    const file = new File(["hello"], "notes.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Please select a PDF file.",
    );
    expect(indexDocumentMock).not.toHaveBeenCalled();
  });

  it("indexes a PDF and displays an answer with its source", async () => {
    vi.mocked(documentApi.indexDocument).mockResolvedValue({
      success: true,
      documentId: "document-123",
      message: "Document indexed successfully",
      chunksCount: 2,
    });

    vi.mocked(documentApi.askDocument).mockResolvedValue({
      success: true,
      documentId: "document-123",
      question: "What is the main point?",
      answer: "The document explains task management.",
      sources: [
        {
          content: "The system creates and assigns tasks.",
          score: 0.85,
        },
      ],
    });

    render(<App />);

    const file = new File(["PDF test content"], "document.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText(/choose a pdf file/i), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("Document indexed successfully (2 chunks)."),
    ).toBeTruthy();

    expect(documentApi.indexDocument).toHaveBeenCalledWith(file);

    const questionInput = screen.getByLabelText("Your question");

    fireEvent.change(questionInput, {
      target: { value: "What is the main point?" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /ask a question/i }),
    );

    expect(
      await screen.findByText("The document explains task management."),
    ).toBeTruthy();

    expect(
      screen.getByText("The system creates and assigns tasks."),
    ).toBeTruthy();

    expect(screen.getByText("Similarity: 85.0%")).toBeTruthy();

    expect(documentApi.askDocument).toHaveBeenCalledWith(
      "document-123",
      "What is the main point?",
    );
  });

  it("shows an error when PDF indexing fails", async () => {
    vi.mocked(documentApi.indexDocument).mockRejectedValue(
      new Error("Failed to upload document"),
    );

    render(<App />);

    const file = new File(["PDF test content"], "document.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText(/choose a pdf file/i), {
      target: { files: [file] },
    });

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("Failed to upload document");
  });
});
