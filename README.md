# AI Document Intelligence

A TypeScript-based document intelligence API that uses Google Gemini to summarize documents and perform semantic search over PDF content.

## Features

### Implemented

- **AI-powered summarization** of text using Google Gemini.
- **PDF text extraction** and document summarization.
- **Text chunking** with configurable chunk size and overlap.
- **Semantic search** using vector embeddings and cosine similarity.
- **Document indexing** with generated embeddings.
- **Document identification** using unique document IDs.
- **In-memory document storage** for reusing indexed embeddings across search requests.
- **Input validation** and error handling for API requests.
- **Automated tests** for core services and API routes.

## Tech Stack

- **Node.js**
- **TypeScript**
- **Express**
- **Google Gemini API**
- **Gemini Embeddings**
- **pdf-parse**
- **Multer**
- **Vitest**
- **Supertest**

## API Endpoints

| Method | Endpoint                 | Description                                        |
| ------ | ------------------------ | -------------------------------------------------- |
| GET    | `/api/health`            | Check server status                                |
| POST   | `/api/documents/summary` | Summarize text provided as JSON                    |
| POST   | `/api/documents/upload`  | Upload a PDF and receive an AI-generated summary   |
| POST   | `/api/documents/index`   | Upload and index a PDF for later semantic searches |
| POST   | `/api/documents/search`  | Search a PDF or a previously indexed document      |

### Semantic Search Workflow

1. Upload a PDF to `/api/documents/index`.
2. The API extracts the document text and splits it into chunks.
3. Gemini generates embeddings for the chunks.
4. The API stores the chunks and embeddings in memory and returns a `documentId`.
5. Send a search query with the `documentId` to `/api/documents/search`.
6. The API compares the query embedding with the stored embeddings and returns the most relevant chunks.

## Getting Started

### Prerequisites

- Node.js and npm
- A Google Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

Do not commit your `.env` file or expose your API key.

### Run the Application

Use the development command configured in `package.json`. For example, if the project uses `tsx`:

```bash
npx tsx src/index.ts
```

### Run Tests

```bash
npm test
```

### TypeScript Check

```bash
npx tsc --noEmit
```

## Current Limitations

- Indexed documents are stored **in memory** and are lost when the server restarts.
- PDF is currently the supported document format.
- Semantic search uses embeddings and similarity scoring; it does not yet provide a complete retrieval-augmented generation (RAG) answer-generation workflow.

## Planned Improvements

- Persistent storage for documents and embeddings.
- Support for additional document formats.
- Retrieval-augmented generation (RAG) with answers grounded in retrieved document passages.
- Additional API validation and integration coverage.
