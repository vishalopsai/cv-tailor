import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  if (periodStart < currentMonthStart) {
    await supabase
      .from('users')
      .update({ tailors_used: 0, period_start: currentMonthStart.toISOString() })
      .eq('id', user.id)
    userData.tailors_used = 0
  }

  // Rate-limit check
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
