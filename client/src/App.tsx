
import { useEffect, useRef, useState } from 'react'
import {
  askDocument,
  deleteDocument,
  indexDocument,
  listDocuments,
} from './services/documentApi.js'
import type {
  AskDocumentResponse,
  DocumentSource,
  DocumentSummary,
} from './services/documentApi.js'
import { translate, type Language, type TranslationKey } from './i18n.js'
import './App.css'

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const INITIAL_VISIBLE_DOCUMENTS = 3

const ACCEPTED_FILE_TYPES = [
  '.pdf',
  '.txt',
  '.md',
  '.docx',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

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

function isSupportedFile(file: File): boolean {
  const fileName = file.name.toLowerCase()

  return SUPPORTED_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  )
}

function App() {
  const [language, setLanguage] = useState<Language>('he')

  function t(
    key: TranslationKey,
    values?: Record<string, string | number>,
  ): string {
    let result = translate(language, key)

    if (values) {
      for (const [placeholder, value] of Object.entries(values)) {
        result = result.replace(`{${placeholder}}`, String(value))
      }
    }

    return result
  }

  const [question, setQuestion] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState('')
  const [indexedMessage, setIndexedMessage] = useState('')
  const [answerResult, setAnswerResult] =
    useState<AskDocumentResponse | null>(null)
  const [uploading, setUploading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')

  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [showAllDocuments, setShowAllDocuments] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [libraryError, setLibraryError] = useState('')
  const [deletingDocumentId, setDeletingDocumentId] = useState('')

  const visibleDocuments = showAllDocuments
    ? documents
    : documents.slice(0, INITIAL_VISIBLE_DOCUMENTS)

  const askingRef = useRef(false)

  async function refreshDocuments() {
    setLibraryError('')

    try {
      const result = await listDocuments()
      setDocuments(result.documents)
    } catch (err) {
      setLibraryError(
        err instanceof Error ? err.message : t('loadFailed'),
      )
    }
  }

  useEffect(() => {
    let active = true

    async function loadDocuments() {
      setLoadingDocuments(true)

      try {
        const result = await listDocuments()

        if (active) {
          setDocuments(result.documents)
          setLibraryError('')
        }
      } catch (err) {
        if (active) {
          setLibraryError(
            err instanceof Error ? err.message : t('loadFailed'),
          )
        }
      } finally {
        if (active) {
          setLoadingDocuments(false)
        }
      }
    }

    void loadDocuments()

    return () => {
      active = false
    }
  }, [])

  function handleSelectDocument(document: DocumentSummary) {
    setDocumentId(document.id)
    setSelectedFile(null)
    setQuestion('')
    setAnswerResult(null)
    setError('')
    setIndexedMessage(
      language === 'he'
        ? `נבחר מסמך שמור: ${document.fileName}`
        : `Selected saved document: ${document.fileName}`,
    )
  }

  async function handleDeleteDocument(document: DocumentSummary) {
    const confirmed = window.confirm(
      t('deleteConfirmation', { fileName: document.fileName }),
    )

    if (!confirmed) {
      return
    }

    setLibraryError('')
    setError('')
    setDeletingDocumentId(document.id)

    try {
      await deleteDocument(document.id)

      setDocuments((currentDocuments) =>
        currentDocuments.filter((item) => item.id !== document.id),
      )

      if (documentId === document.id) {
        setDocumentId('')
        setSelectedFile(null)
        setQuestion('')
        setAnswerResult(null)
        setIndexedMessage('')
      }
    } catch (err) {
      setLibraryError(
        err instanceof Error ? err.message : t('deleteFailed'),
      )
    } finally {
      setDeletingDocumentId('')
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return

    setError('')
    setAnswerResult(null)
    setDocumentId('')
    setIndexedMessage('')

    if (!isSupportedFile(file)) {
      setSelectedFile(null)
      setError(t('unsupportedFile'))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setError(t('fileTooLarge'))
      return
    }

    setSelectedFile(file)
    setUploading(true)

    try {
      const result = await indexDocument(file)

      setDocumentId(result.documentId)
      setIndexedMessage(
        t('indexedMessage', { count: result.chunksCount }),
      )

      await refreshDocuments()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('uploadFailed'),
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
        err instanceof Error ? err.message : t('askFailed'),
      )
    } finally {
      askingRef.current = false
      setAsking(false)
    }
  }

  return (
    <div
      className="app"
      lang={language}
      dir={language === 'he' ? 'rtl' : 'ltr'}
    >
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon" aria-hidden="true">
            D
          </span>
          <span>{t('brand')}</span>
        </a>

        <div className="header-actions">
          <span className="status">
            <span className="status-dot" aria-hidden="true" />
            {t('status')}
          </span>

          <button
            className="language-button"
            type="button"
            onClick={() =>
              setLanguage((current) =>
                current === 'he' ? 'en' : 'he',
              )
            }
            aria-label={
              language === 'he'
                ? 'Switch to English'
                : 'החלפה לעברית'
            }
          >
            {t('language')}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="intro">
          <p className="eyebrow">{t('eyebrow')}</p>

          <h1>
            {t('titleFirst')}
            <br />
            <span>{t('titleSecond')}</span>
          </h1>

          <p className="subtitle">{t('subtitle')}</p>
        </section>

        {error && (
          <div className="error-message" role="alert">
            <strong>{t('errorHeading')}</strong>
            <p>{error}</p>
          </div>
        )}

        <section className="workspace">
          {/* Documents */}
          <div className="panel documents-panel">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div>
                <h2>{t('libraryTitle')}</h2>
                <p>{t('libraryDescription')}</p>
              </div>
            </div>

            {loadingDocuments ? (
              <p className="hint">{t('loadingDocuments')}</p>
            ) : documents.length > 0 ? (
              <>
                <div className="document-list">
                  {visibleDocuments.map((document) => (
                    <div className="document-item-wrapper" key={document.id}>
                      <button
                        className={`document-item ${
                          documentId === document.id ? 'selected' : ''
                        }`}
                        type="button"
                        disabled={
                          uploading || asking || Boolean(deletingDocumentId)
                        }
                        aria-pressed={documentId === document.id}
                        onClick={() => handleSelectDocument(document)}
                      >
                        <span className="document-name">
                          {document.fileName}
                        </span>

                        <span className="document-date">
                          {Number.isNaN(Date.parse(document.createdAt))
                            ? t('dateUnavailable')
                            : new Date(
                                document.createdAt,
                              ).toLocaleDateString(
                                language === 'he' ? 'he-IL' : 'en-US',
                              )}
                        </span>
                      </button>

                      <button
                        className="delete-document-button"
                        type="button"
                        aria-label={`${t('delete')} ${document.fileName}`}
                        title={t('delete')}
                        disabled={
                          uploading || asking || Boolean(deletingDocumentId)
                        }
                        onClick={() => void handleDeleteDocument(document)}
                      >
                        {deletingDocumentId === document.id ? (
                          <span className="delete-loading">...</span>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="m19 6-1 14H6L5 6" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {documents.length > INITIAL_VISIBLE_DOCUMENTS && (
                  <button
                    className="library-toggle-button"
                    type="button"
                    aria-expanded={showAllDocuments}
                    onClick={() =>
                      setShowAllDocuments((current) => !current)
                    }
                  >
                    {showAllDocuments
                      ? language === 'he'
                        ? 'הצג פחות'
                        : 'Show less'
                      : language === 'he'
                        ? `הצג את כל ${documents.length} המסמכים`
                        : `Show all ${documents.length} documents`}

                    <span aria-hidden="true">
                      {showAllDocuments ? '↑' : '↓'}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <p className="hint">{t('noDocuments')}</p>
            )}

            {libraryError && (
              <p className="library-error" role="status">
                {libraryError}{' '}
                <button type="button" onClick={() => void refreshDocuments()}>
                  {t('retry')}
                </button>
              </p>
            )}

            <div className="upload-section">
              <div className="upload-section-heading">
                <span className="upload-small-icon" aria-hidden="true">
                  ↑
                </span>
                <strong>{t('uploadTitle')}</strong>
              </div>

              <label className="upload-area">
                <strong>
                  {selectedFile ? selectedFile.name : t('chooseDocument')}
                </strong>

                <span>{t('supportedFiles')}</span>

                <input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  disabled={uploading || asking}
                  onChange={(event) => {
                    void handleFileChange(event.target.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
              </label>

              <p className="hint upload-hint">
                {uploading
                  ? t('uploading')
                  : indexedMessage || t('uploadHint')}
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="panel question-panel">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div>
                <h2>{t('questionTitle')}</h2>
                <p>{t('questionDescription')}</p>
              </div>
            </div>

            <label className="question-label" htmlFor="question">
              {t('yourQuestion')}
            </label>

            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t('questionPlaceholder')}
              rows={5}
              disabled={!documentId || asking}
            />

            <button
              className="ask-button"
              type="button"
              disabled={!documentId || !question.trim() || asking}
              onClick={() => void handleAsk()}
            >
              {asking ? t('asking') : t('ask')}
              {!asking && <span aria-hidden="true">↗</span>}
            </button>

            <p className="hint">
              {!documentId
                ? t('selectDocumentHint')
                : t('answerHint')}
            </p>
          </div>

          {/* Answers */}
          <section className="answer-panel">
            <div className="answer-heading">
              <span className="answer-icon" aria-hidden="true">
                ✦
              </span>

              <div>
                <h2>{t('answerHeading')}</h2>
                <p>{t('answerDescription')}</p>
              </div>
            </div>

            {asking ? (
              <div className="empty-state" role="status">
                <strong>{t('findingAnswer')}</strong>
                <p>{t('findingAnswerDescription')}</p>
              </div>
            ) : answerResult ? (
              <div className="answer-content">
                <h3>{t('answer')}</h3>
                <p className="answer-text">{answerResult.answer}</p>

                <h3>{t('sources')}</h3>

                {answerResult.sources.length > 0 ? (
                  <div className="sources-list">
                    {answerResult.sources.map((source, index) => {
                      const sourceText = getSourceText(source)
                      const score = getSourceScore(source)

                      return (
                        <article className="source-item" key={index}>
                          <div className="source-title">
                            <strong>
                              {t('source')} {index + 1}
                            </strong>

                            {score !== undefined && (
                              <span>
                                {t('similarity')}:{' '}
                                {(score * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <p>
                            {sourceText || t('unknownSource')}
                          </p>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="hint">{t('noSources')}</p>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  ◇
                </div>

                <strong>{t('emptyAnswer')}</strong>
                <p>{t('emptyAnswerDescription')}</p>
              </div>
            )}
          </section>
        </section>

        <footer>
          <span>{t('brand')}</span>
          <span>{t('footer')}</span>
        </footer>
      </main>
    </div>
  )
}

export default App
