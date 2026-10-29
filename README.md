# DocuMind — AI Document Intelligence

A full-stack document intelligence application built with TypeScript, Express, React, and Google Gemini. DocuMind extracts text from supported documents, generates AI-powered summaries through its API, performs semantic search, and answers questions grounded in relevant document passages.

## Features

### Implemented

**Backend**

- PDF, TXT, Markdown, and DOCX text extraction.
- AI-powered document summarization using Google Gemini.
- Text chunking and embedding generation.
- Semantic search over document content.
- Retrieval-Augmented Generation (RAG) for document-grounded question answering.
- Relevant source passages and similarity scores in search and Q&A responses.
- Persistent local JSON storage for indexed documents.
- Document listing and deletion through the API.
- Upload size limit of 5 MB and input validation.
- API error handling and automated tests.

**Frontend**

- React and TypeScript user interface.
- PDF upload and indexing.
- Saved document library with document selection and reuse for follow-up questions.
- Ability to delete saved documents from the library.
- Question submission for indexed documents.
- AI-generated answers and source display, including similarity scores when available.
- Loading, success, and error states.
- Client-side file-type and file-size validation.
- Protection against duplicate question submissions.

### Planned

- Frontend support for TXT, Markdown, and DOCX uploads.
- Dedicated UI for document summarization and semantic search.
- Database-backed document storage.
- More extensive retrieval-quality evaluation and end-to-end testing.
- OCR support for scanned documents.
- User accounts and access permissions.
- Conversation history.

## Technology Stack

- **Runtime:** Node.js 24+
- **Language:** TypeScript
- **Backend:** Express
- **Frontend:** React, Vite
- **AI:** Google Gemini API and embedding models
- **Document processing:** `pdf-parse`, `mammoth`, custom text extraction and chunking
- **Uploads:** Multer
- **Testing:** Vitest, Supertest, React Testing Library

## Architecture

1. **Upload:** The frontend currently sends PDF files to the backend for indexing.
2. **Extraction:** The backend extracts text from supported PDF, TXT, Markdown, and DOCX files.
3. **Chunking and embeddings:** Text is split into chunks, and embeddings are generated.
4. **Storage:** Indexed chunks and embeddings are saved in a local JSON file. Document metadata is exposed through the document-list API for the frontend library.
5. **Retrieval:** A user question is compared with stored document chunks using semantic search.
6. **Answer generation:** Relevant passages are sent to Gemini to generate a grounded answer.
7. **Sources:** The API returns the answer alongside relevant source passages and similarity scores.
8. **Deletion:** Users can delete saved documents through the frontend. The backend removes the corresponding document from persistent storage.

## API Endpoints

| Method | Endpoint                     | Description                                            |
| ------ | ---------------------------- | ------------------------------------------------------ |
| GET    | `/api/health`                | Check server status                                    |
| GET    | `/api/documents`             | List previously indexed documents                      |
| POST   | `/api/documents/summary`     | Summarize submitted text                               |
| POST   | `/api/documents/upload`      | Upload a supported document and return a summary       |
| POST   | `/api/documents/index`       | Extract, chunk, embed, and persist a document          |
| POST   | `/api/documents/search`      | Search a newly uploaded or previously indexed document |
| POST   | `/api/documents/ask`         | Answer a question about an indexed document using RAG  |
| DELETE | `/api/documents/:documentId` | Delete an indexed document from persistent storage     |

### API Notes

- Document upload and indexing endpoints accept multipart form data with a `file` field.
- The search endpoint accepts a `query` and either a file or an existing `documentId`.
- The ask endpoint accepts JSON containing `documentId` and `question`.
- The maximum upload size is 5 MB.
- The backend API supports PDF, TXT, Markdown, and DOCX files.
- The frontend currently accepts PDF files only.
- Deleting a document removes its saved content from the local document store.

## Getting Started

### Prerequisites

- Node.js 24 or later
- npm
- A Google Gemini API key

### 1. Install Dependencies

From the repository root:

```bash
npm install
npm --prefix client install
```

### 2. Configure Environment Variables

Create a `.env` file in the repository root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Do not commit `.env` or expose your API key.

### 3. Start the Backend

From the repository root:

```bash
npx tsx src/server.ts
```

The backend runs on port `3000`.

Check its status at:

`http://localhost:3000/api/health`

### 4. Start the Frontend

Open a second terminal from the repository root:

```bash
npm --prefix client run dev
```

Open the local URL printed by Vite in the terminal.

### 5. Run Backend Tests

```bash
npm test
npx tsc --noEmit
```

### 6. Run Frontend Tests and Build

```bash
npm --prefix client test
npm --prefix client run build
```

## Storage and Limitations

- Indexed documents are persisted in `data/documents.json` by default.
- Set `DOCUMENT_STORE_PATH` to use a different storage-file path.
- Local JSON storage is intended for the current project scope and is not a substitute for a production database.
- The frontend currently supports PDF uploads, while the backend API supports PDF, TXT, Markdown, and DOCX.
- Document-grounded answers depend on retrieval quality and the content available in the indexed document.
- Scanned PDFs requiring OCR are not currently supported.
- The frontend does not yet expose every backend capability; summarization and semantic search are available through the API.

## Project Status

DocuMind is a working full-stack prototype with document indexing, semantic retrieval, grounded question answering, and document management. Features listed under **Planned** are not represented as implemented functionality.

## License

No open-source license has been selected for this project yet.
