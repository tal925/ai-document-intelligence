# AI Document Intelligence

A TypeScript-based document processing API that uses Google Gemini to generate structured Hebrew summaries from text and PDF documents.

## Features

- **AI-powered summarization** using the Google Gemini API.
- **PDF text extraction** from text-based PDF documents.
- **Hebrew summaries** generated from document content.
- **REST API** built with Express and TypeScript.
- **Input validation** for text content and uploaded files.
- **File size limit** of 5 MB per uploaded PDF.
- **Error handling and retry logic** for temporary Gemini API failures.
- **Automated API tests** using Vitest and Supertest.

## Technologies

- TypeScript
- Node.js
- Express
- Google Gemini API (`@google/genai`)
- `dotenv`
- `pdf-parse`
- `multer`
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

| Method | Endpoint                 | Description                                                |
| ------ | ------------------------ | ---------------------------------------------------------- |
| GET    | `/api/health`            | Checks server availability                                 |
| POST   | `/api/documents/summary` | Generates a summary from text provided in the request body |
| POST   | `/api/documents/upload`  | Uploads a PDF, extracts its text, and generates a summary  |

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
- Hebrew summary generation.
- REST API endpoints.
- Upload validation and file size limits.
- Automated tests for successful requests and error handling.
- Retry logic for temporary Gemini API failures.

### Planned

- Support for additional document formats.
- Retrieval-Augmented Generation (RAG) for answering questions based on document content.
- Source references and citations in generated answers.

## License

No license has been specified yet.
