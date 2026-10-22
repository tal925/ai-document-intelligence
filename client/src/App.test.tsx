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
});
