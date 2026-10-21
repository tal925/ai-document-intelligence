# AI Document Intelligence

A TypeScript-based document intelligence API that uses Google Gemini to summarize PDF documents, perform semantic search, and answer questions grounded in indexed document content.

## Features

### Implemented

- **AI-powered summarization** using Google Gemini.
- **PDF text extraction** and document summarization.
- **Text chunking** to split documents into smaller passages for retrieval.
- **Embeddings and semantic search** to identify relevant document passages.
- **Document indexing** with generated embeddings and unique document IDs.
- **Persistent document storage** using a local JSON file, allowing indexed documents and embeddings to survive server restarts.
- **Retrieval-Augmented Generation (RAG)** to answer questions using relevant passages retrieved from an indexed document.
- **Source passages and similarity scores** returned with answers when relevant passages are found.
- **Input validation and error handling** for API requests.
- **Automated tests** for API routes, core services, and persistence across separate Node.js processes.

## Tech Stack

- Node.js
- TypeScript
- Express
- Google Gemini API
- Gemini embeddings
- pdf-parse
- Multer
- Vitest
- Supertest

## API Endpoints

| Method | Endpoint                 | Description                                        |
| ------ | ------------------------ | -------------------------------------------------- |
| GET    | `/api/health`            | Check server status                                |
| POST   | `/api/documents/summary` | Summarize text provided as JSON                    |
| POST   | `/api/documents/upload`  | Upload a PDF and receive an AI-generated summary   |
| POST   | `/api/documents/index`   | Upload and index a PDF for later retrieval         |
| POST   | `/api/documents/search`  | Search document content using semantic similarity  |
| POST   | `/api/documents/ask`     | Ask a question about an indexed document using RAG |

## How It Works

### Indexing a Document

1. Upload a PDF to `/api/documents/index`.
2. The API extracts its text and splits it into chunks.
3. Gemini generates embeddings for the chunks.
4. The API saves the chunks and embeddings in a local JSON file and returns a unique `documentId`.

### Searching and Asking Questions

1. Submit a search query to `/api/documents/search`, or ask a question through `/api/documents/ask`.
2. The API compares the query with the indexed passages using semantic similarity.
3. For question answering, the most relevant passages are sent to Gemini as context.
4. Gemini generates an answer grounded in the retrieved content. If sufficient information cannot be found, the API can return a message indicating that the document does not contain enough information.

Indexed documents are stored locally and remain available after a server restart, as long as the storage file is preserved.

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

Start the development server:

```bash
npx tsx src/server.ts
```

The server runs on port `3000` by default.

### Run Tests

```bash
npm test
```

### TypeScript Check

```bash
npx tsc --noEmit
```

## Current Limitations

- PDF is the currently supported document format.
- Document data is stored in a local JSON file rather than a dedicated database.
- Semantic retrieval quality depends on the generated embeddings, similarity threshold, and relevance of the document content.
- The project currently provides an API rather than a complete end-user web interface.

## Planned Improvements

- Support for additional document formats.
- Database-backed storage for improved scalability.
- Further improvements to retrieval quality, evaluation, and API test coverage.
- A user-facing interface for uploading documents and interacting with them.
