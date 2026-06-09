'use client'

import { useState, useEffect } from 'react'
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
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => setUsage(data))
      .catch(() => null)
  }, [])

  async function handleTailor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTailoredText('')

    const res = await fetch('/api/tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, jobDescription }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
    } else {
      setTailoredText(data.tailoredText)
      // Refresh usage
      fetch('/api/usage')
        .then((r) => r.json())
        .then((u) => setUsage(u))
        .catch(() => null)
    }

    setLoading(false)
  }

  async function handleDownload() {
    if (!tailoredText) return

    // Dynamically import docx to keep initial bundle lean
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } =
      await import('docx')
    const { saveAs } = await import('file-saver')

    const lines = tailoredText.split('\n').filter((l) => l.trim() !== '')

    const children = lines.map((line) => {
      const trimmed = line.trim()

      // Detect bullet-like lines
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return new Paragraph({
          text: trimmed.replace(/^[•\-*]\s*/, ''),
          bullet: { level: 0 },
          style: 'Normal',
        })
      }

      // Detect section headings (ALL CAPS or ends with colon)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
        return new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.LEFT,
        })
      }

      return new Paragraph({
        children: [
          new TextRun({
            text: trimmed,
            font: 'Calibri',
            size: 22, // 11pt
          }),
        ],
      })
    })

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22 },
          },
        },
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
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tailor your CV</h1>
              <p className="text-sm text-gray-500">
                Paste your CV and a job description below.
              </p>
            </div>
            {usage && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                <span className="capitalize font-medium text-indigo-600">
                  {usage.plan}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  {usedLabel} / {limitLabel} this month
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleTailor} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Your master CV
                </label>
                <textarea
                  required
                  rows={18}
                  value={cv}
                  onChange={(e) => setCv(e.target.value)}
                  placeholder="Paste your full CV here…"
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono"
                />
              </div>

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
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Tailoring your CV…
                </span>
              ) : (
                'Tailor My CV'
              )}
            </button>
          </form>

          {tailoredText && (
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Tailored sections
                </h2>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download DOCX
                </button>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {tailoredText}
                </pre>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Copy these sections into your full CV before submitting.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
