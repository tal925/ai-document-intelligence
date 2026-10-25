
import { useRef, useState } from 'react'
import { askDocument, indexDocument } from './services/documentApi.js'
import type {
  AskDocumentResponse,
  DocumentSource,
} from './services/documentApi.js'
import './App.css'

function getSourceText(source: DocumentSource): string {
  for (const key of ['content', 'text', 'chunk', 'snippet']) {
    const value = source[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return ''
}

function getSourceScore(source: DocumentSource): number | undefined {
  const value = source.score ?? source.similarity
  return typeof value === 'number' ? value : undefined
}

function App() {
  const [question, setQuestion] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState('')
  const [indexedMessage, setIndexedMessage] = useState('')
  const [answerResult, setAnswerResult] =
    useState<AskDocumentResponse | null>(null)
  const [uploading, setUploading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')

  const askingRef = useRef(false)

  async function handleFileChange(file: File | undefined) {
    if (!file) return

    setError('')
    setAnswerResult(null)
    setDocumentId('')
    setIndexedMessage('')

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null)
      setError('Please select a PDF file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedFile(null)
      setError('The file is too large. Maximum file size is 5 MB.')
      return
    }

    setSelectedFile(file)
    setUploading(true)

    try {
      const result = await indexDocument(file)

      setDocumentId(result.documentId)
      setIndexedMessage(
        `Document indexed successfully (${result.chunksCount} chunks).`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to upload and index the document.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk() {
    if (!documentId || !question.trim() || askingRef.current) {
      return
    }

    askingRef.current = true
    setError('')
    setAnswerResult(null)
    setAsking(true)

    try {
      const result = await askDocument(documentId, question.trim())
      setAnswerResult(result)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get an answer.',
      )
    } finally {
      askingRef.current = false
      setAsking(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">D</span>
          <span>DocuMind</span>
        </a>

        <span className="status">
          <span className="status-dot" />
          AI Document Intelligence
        </span>
      </header>

      <main className="main-content">
        <section className="intro">
          <p className="eyebrow">YOUR DOCUMENTS, UNDERSTOOD</p>
          <h1>
            Understand your documents.
            <br />
            <span>Ask better questions.</span>
          </h1>
          <p className="subtitle">
            Upload a document, explore its content, and get answers
            grounded in the information that matters.
          </p>
        </section>

        <section className="workspace">
          <div className="panel upload-panel">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Upload a document</h2>
                <p>Start with a PDF document</p>
              </div>
            </div>

            <label className="upload-area">
              <span className="upload-icon">↑</span>
              <strong>
                {selectedFile ? selectedFile.name : 'Choose a PDF file'}
              </strong>
              <span>PDF format · Maximum 5 MB</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={uploading || asking}
                onChange={(event) => {
                  void handleFileChange(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </label>

            <p className="hint">
              {uploading
                ? 'Uploading and indexing your document...'
                : indexedMessage ||
                  'Your document will be processed for searching and Q&A.'}
            </p>
          </div>

          <div className="panel question-panel">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Ask your document</h2>
                <p>Find answers in your content</p>
              </div>
            </div>

            <label className="question-label" htmlFor="question">
              Your question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What are the main points in this document?"
              rows={4}
              disabled={!documentId || asking}
            />

            <button
              className="ask-button"
              type="button"
              disabled={!documentId || !question.trim() || asking}
              onClick={() => void handleAsk()}
            >
              {asking ? 'Finding an answer...' : 'Ask a question'}
              {!asking && <span>→</span>}
            </button>

            <p className="hint">
              {!documentId
                ? 'Upload a document before asking a question.'
                : 'Answers are generated from relevant passages in your document.'}
            </p>
          </div>
        </section>

        {error && (
          <div className="error-message" role="alert">
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        )}

        <section className="answer-panel">
          <div className="answer-heading">
            <span className="answer-icon">✦</span>
            <div>
              <h2>Answer &amp; sources</h2>
              <p>AI-generated answers grounded in your document</p>
            </div>
          </div>

          {asking ? (
            <div className="empty-state">
              <strong>Finding an answer...</strong>
              <p>
                The AI is searching your document and preparing a response.
              </p>
            </div>
          ) : answerResult ? (
            <div className="answer-content">
              <h3>Answer</h3>
              <p className="answer-text">{answerResult.answer}</p>

              <h3>Relevant sources</h3>
              {answerResult.sources.length > 0 ? (
                <div className="sources-list">
                  {answerResult.sources.map((source, index) => {
                    const sourceText = getSourceText(source)
                    const score = getSourceScore(source)

                    return (
                      <article className="source-item" key={index}>
                        <div className="source-title">
                          <strong>Source {index + 1}</strong>
                          {score !== undefined && (
                            <span>
                              Similarity: {(score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p>
                          {sourceText ||
                            'A relevant source passage was returned, but its text field is not recognized by the UI yet.'}
                        </p>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <p className="hint">
                  No relevant source passages were found for this question.
                </p>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✧</div>
              <strong>Your answer will appear here</strong>
              <p>Upload a document and ask a question to get started.</p>
            </div>
          )}
        </section>

        <footer>
          <span>DocuMind</span>
          <span>Powered by Gemini · Retrieval-Augmented Generation</span>
        </footer>
      </main>
    </div>
  )
}

export default App
