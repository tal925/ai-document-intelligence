const API_BASE_URL = "";

export interface IndexDocumentResponse {
  success: boolean;
  documentId: string;
  message: string;
  chunksCount: number;
}

export interface DocumentSource {
  content?: string;
  text?: string;
  score?: number;
  similarity?: number;
  [key: string]: unknown;
}

export interface AskDocumentResponse {
  success: boolean;
  documentId: string;
  question: string;
  answer: string;
  sources: DocumentSource[];
}

interface ApiErrorResponse {
  success: false;
  error: string;
}

async function readError(response: Response): Promise<string> {
  const data = (await response.json()) as ApiErrorResponse;
  return data.error || "An unexpected error occurred";
}

export async function indexDocument(
  file: File,
): Promise<IndexDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/documents/index`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as IndexDocumentResponse;
}

export async function askDocument(
  documentId: string,
  question: string,
): Promise<AskDocumentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId, question }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as AskDocumentResponse;
}
