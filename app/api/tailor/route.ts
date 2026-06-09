import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Per-user cooldown: max 1 request per 10 seconds (in-memory, per instance)
// Protects against rapid-fire abuse on top of the monthly plan limits.
const lastRequestAt = new Map<string, number>()
const COOLDOWN_MS = 10_000

const MAX_CV_LENGTH = 15_000   // ~10 pages of text
const MAX_JD_LENGTH = 8_000

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Per-user cooldown check
  const now = Date.now()
  const last = lastRequestAt.get(user.id) ?? 0
  if (now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return NextResponse.json(
      { error: `Please wait ${retryAfter}s before tailoring again.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // Fetch user row
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('plan, tailors_used, tailors_limit, period_start')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 })
  }

  // Monthly reset check
  const periodStart = new Date(userData.period_start)
  const currentMonthStart = new Date(now)
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)

  if (periodStart < currentMonthStart) {
    await supabase
      .from('users')
      .update({ tailors_used: 0, period_start: currentMonthStart.toISOString() })
      .eq('id', user.id)
    userData.tailors_used = 0
  }

  // Monthly plan limit check
  if (userData.tailors_limit !== -1 && userData.tailors_used >= userData.tailors_limit) {
    return NextResponse.json(
      { error: 'Monthly limit reached. Upgrade your plan to continue.' },
      { status: 429 }
    )
  }

  let body: { cv?: string; jobDescription?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { cv, jobDescription } = body

  if (!cv?.trim() || !jobDescription?.trim()) {
    return NextResponse.json(
      { error: 'Both CV and job description are required.' },
      { status: 400 }
    )
  }

  // Input length caps — prevent oversized payloads and prompt abuse
  if (cv.length > MAX_CV_LENGTH) {
    return NextResponse.json(
      { error: `CV is too long (max ${MAX_CV_LENGTH.toLocaleString()} characters).` },
      { status: 400 }
    )
  }
  if (jobDescription.length > MAX_JD_LENGTH) {
    return NextResponse.json(
      { error: `Job description is too long (max ${MAX_JD_LENGTH.toLocaleString()} characters).` },
      { status: 400 }
    )
  }

  // Record request time before the (slow) Claude call
  lastRequestAt.set(user.id, now)

  // Call Claude
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    system:
      'You are an expert CV writer and ATS specialist. Rewrite the Personal Summary and Skills sections of this CV to match the job description. Mirror JD keywords naturally. Output plain text only, no markdown.',
    messages: [
      {
        role: 'user',
        content: `CV:\n${cv}\n\nJob Description:\n${jobDescription}`,
      },
    ],
  })

  const tailoredText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  // Increment usage counter
  await supabase
    .from('users')
    .update({ tailors_used: userData.tailors_used + 1 })
    .eq('id', user.id)

  // Log to tailors table
  await supabase.from('tailors').insert({
    user_id: user.id,
    jd_snippet: jobDescription.slice(0, 200),
    output_length: tailoredText.length,
  })

  return NextResponse.json({ tailoredText })
}
