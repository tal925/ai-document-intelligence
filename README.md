# AI Document Intelligence

A TypeScript-based document processing API that uses Google Gemini to generate structured Hebrew summaries from text and PDF documents. The project also includes text chunking, vector embeddings, and cosine similarity calculations as foundations for semantic search and Retrieval-Augmented Generation (RAG).

## Features

- **AI-Powered Summarization** — Generates structured Hebrew summaries using the Google Gemini API.
- **PDF Processing** — Extracts text from uploaded PDF documents.
- **Text Chunking** — Splits document content into smaller chunks for downstream processing.
- **Vector Embeddings** — Converts text into numerical vector representations using Gemini Embeddings.
- **Cosine Similarity** — Calculates similarity between vectors to support semantic retrieval.
- **REST API** — Provides document processing endpoints using Express and TypeScript.
- **Input Validation** — Validates text input and uploaded PDF files.
- **File Size Limits** — Restricts PDF uploads to a maximum of 5 MB.
- **Error Handling and Retries** — Handles temporary Gemini API failures with retry logic.
- **Automated Testing** — Includes unit and API tests using Vitest and Supertest.

## Technologies

- TypeScript
- Node.js
- Express
- Google Gemini API (`@google/genai`)
- dotenv
- pdf-parse
- multer
- Vitest
- Supertest

## Getting Started

### Prerequisites

- Node.js
- A Google Gemini API key

### Installation

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/tal925/ai-document-intelligence.git
cd ai-document-intelligence
npm install
```

### Environment Variables

Create a `.env` file in the project root and add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your own API key. Never commit your `.env` file to GitHub.

### Run the Application

```bash
npx tsx src/server.ts
```

The server runs on port `3000`.

### Run Tests

```bash
npm test
```

## API Endpoints

| Method | Endpoint                 | Description                                                 |
| ------ | ------------------------ | ----------------------------------------------------------- |
| `GET`  | `/api/health`            | Checks server availability.                                 |
| `POST` | `/api/documents/summary` | Generates a summary from text provided in the request body. |
| `POST` | `/api/documents/upload`  | Uploads a PDF, extracts its text, and generates a summary.  |

### Text Summarization Request

Send a JSON request to `/api/documents/summary`:

```json
{
  "content": "Text to summarize"
}
```

### PDF Upload

Send a `multipart/form-data` request to `/api/documents/upload` using the field name `file`.

Only PDF files are accepted, with a maximum size of 5 MB.

## Project Status

### Implemented

- Text-based document summarization.
- PDF upload and text extraction.
- Hebrew summary generation using Gemini.
- Configurable text chunking.
- Vector embedding generation using Gemini Embeddings.
- Cosine similarity calculation.
- REST API endpoints and input validation.
- File size limits and error handling.
- Retry logic for temporary Gemini API failures.
- Automated unit and API tests.

### Planned

- Semantic search to retrieve relevant document chunks based on a query.
- Retrieval-Augmented Generation (RAG) for answering questions using document content.
- Source references and citations in generated answers.
- Persistent vector storage.
- Support for additional document formats.

## License

No license has been specified yet.
