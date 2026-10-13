# AI Document Intelligence

A TypeScript application that integrates the Google Gemini API to generate structured Hebrew summaries from text documents using customized prompts.

## Features

- Integrates with the Google Gemini API.
- Generates Hebrew summaries from text input.
- Uses customized prompts to control the structure and length of AI responses.
- Loads API credentials from environment variables.

## Technologies

- TypeScript
- Node.js
- Google Gemini API
- `@google/genai`
- `dotenv`
- `tsx`

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

Replace `your_api_key_here` with your own API key. Do not commit the `.env` file to GitHub.

### Run the Application

```bash
npx tsx src/index.ts
```

## Project Status

The current version demonstrates AI-powered text summarization with Google Gemini. Document upload, PDF processing, retrieval-augmented generation (RAG), and source citations are not yet implemented.

## License

No license has been specified yet.
