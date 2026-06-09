'use client'

import { useRef, useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

interface UsageData {
  plan: string
  tailors_used: number
  tailors_limit: number
}

export default function DashboardPage() {
  const [cv, setCv] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tailoredText, setTailoredText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')
  const [usage, setUsage] = useState<UsageData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => setUsage(data))
      .catch(() => null)
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileLoading(true)
    setFileError('')
    setFileName(file.name)

    try {
      const name = file.name.toLowerCase()

      if (name.endsWith('.txt')) {
        const text = await file.text()
        setCv(text)
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        const { default: mammoth } = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        setCv(result.value.trim())
      } else if (name.endsWith('.pdf')) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/parse-cv', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) {
          setFileError(data.error ?? 'Failed to read PDF.')
          setFileName('')
        } else {
          setCv(data.text)
        }
      } else {
        setFileError('Unsupported file type. Use PDF, DOCX, or TXT.')
        setFileName('')
      }
    } catch {
      setFileError('Failed to read file. Try copy-pasting instead.')
      setFileName('')
    }

    setFileLoading(false)
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleTailor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTailoredText('')

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, jobDescription }),
      })

      // Non-2xx responses come back as JSON errors
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Stream text chunks as they arrive
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setTailoredText(result)
      }

      // Flush any remaining bytes
      result += decoder.decode()
      setTailoredText(result)

      // Refresh usage counter after stream completes
      fetch('/api/usage')
        .then((r) => r.json())
        .then((u) => setUsage(u))
        .catch(() => null)
    } catch {
      setError('Connection error. Please try again.')
    }

    setLoading(false)
  }

  async function handleDownload() {
    if (!tailoredText) return

    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } =
      await import('docx')
    const { saveAs } = await import('file-saver')

    const lines = tailoredText.split('\n').filter((l) => l.trim() !== '')

    const children = lines.map((line) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return new Paragraph({
          text: trimmed.replace(/^[•\-*]\s*/, ''),
          bullet: { level: 0 },
        })
      }

      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
        return new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.LEFT,
        })
      }

      return new Paragraph({
        children: [new TextRun({ text: trimmed, font: 'Calibri', size: 22 })],
      })
    })

    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Calibri', size: 22 } } },
      },
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Tailored CV Sections',
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            }),
            ...children,
          ],
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, 'tailored-cv.docx')
  }

  const limitLabel =
    usage?.tailors_limit === -1 ? '∞' : String(usage?.tailors_limit ?? '—')
  const usedLabel = usage?.tailors_used ?? '—'

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tailor your CV</h1>
              <p className="text-sm text-gray-500">
                Upload or paste your CV, then add the job description.
              </p>
            </div>
            {usage && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                <span className="capitalize font-medium text-indigo-600">{usage.plan}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  {usedLabel} / {limitLabel} this month
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleTailor} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* CV column */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Your CV</label>

                  {/* Upload button */}
                  <div className="flex items-center gap-2">
                    {fileName && !fileLoading && (
                      <span className="max-w-[140px] truncate text-xs text-gray-500">
                        {fileName}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={fileLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                    >
                      {fileLoading ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Reading…
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4m0 0l4 4m-4-4v12" />
                          </svg>
                          Upload CV
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {fileError && (
                  <p className="mb-2 text-xs text-red-600">{fileError}</p>
                )}

                <textarea
                  required
                  rows={18}
                  value={cv}
                  onChange={(e) => setCv(e.target.value)}
                  placeholder="Upload a PDF / DOCX / TXT, or paste your CV here…"
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono"
                />
                <p className="mt-1 text-xs text-gray-400">Accepted: PDF, DOCX, TXT</p>
              </div>

              {/* JD column */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Job description
                </label>
                <textarea
                  required
                  rows={18}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here…"
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}{' '}
                {error.includes('limit') && (
                  <a href="/pricing" className="font-medium underline">
                    Upgrade now →
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || fileLoading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {tailoredText ? 'Writing…' : 'Analysing your CV…'}
                </span>
              ) : (
                'Tailor My CV'
              )}
            </button>
          </form>

          {/* Result — visible as soon as first tokens arrive */}
          {tailoredText && (
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">Tailored sections</h2>
                  {loading && (
                    <span className="text-xs font-medium text-indigo-500 animate-pulse">
                      Writing…
                    </span>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download DOCX
                </button>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {tailoredText}
                  {loading && <span className="ml-0.5 inline-block w-0.5 h-4 bg-indigo-500 animate-pulse align-middle" />}
                </pre>
              </div>
              {!loading && (
                <p className="mt-3 text-xs text-gray-400">
                  Copy these sections into your full CV before submitting.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
