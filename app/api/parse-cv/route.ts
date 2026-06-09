import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/octet-stream', // some browsers send this for PDFs
])

// PDF magic bytes: %PDF
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46])

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // File size guard
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5 MB.' },
      { status: 413 }
    )
  }

  // File name extension guard (defence in depth alongside MIME check)
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'pdf') {
    return NextResponse.json(
      { error: 'Only PDF files are accepted at this endpoint.' },
      { status: 415 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Magic bytes check — verify it actually starts with %PDF
  if (
    buffer.length < 4 ||
    !buffer.slice(0, 4).equals(PDF_MAGIC)
  ) {
    return NextResponse.json(
      { error: 'File does not appear to be a valid PDF.' },
      { status: 415 }
    )
  }

  // Dynamic import avoids pdf-parse's build-time test file loading
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)

  const text = data.text.trim()
  if (!text) {
    return NextResponse.json(
      {
        error:
          'Could not extract text — the PDF may be image-based (scanned). Try copy-pasting instead.',
      },
      { status: 422 }
    )
  }

  return NextResponse.json({ text })
}
