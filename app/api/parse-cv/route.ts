import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const buffer = Buffer.from(await file.arrayBuffer())

  // Dynamic import avoids pdf-parse's build-time test file loading
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)

  const text = data.text.trim()
  if (!text) {
    return NextResponse.json(
      { error: 'Could not extract text — the PDF may be image-based. Try copy-pasting instead.' },
      { status: 422 }
    )
  }

  return NextResponse.json({ text })
}
