import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
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

  let body: { plan?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { plan } = body

  if (!plan || !['pro', 'unlimited'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planId =
    plan === 'pro'
      ? process.env.RAZORPAY_PRO_PLAN_ID
      : process.env.RAZORPAY_UNLIMITED_PLAN_ID

  if (!planId) {
    return NextResponse.json(
      { error: 'Razorpay plan ID not configured' },
      { status: 500 }
    )
  }

  const subscription = await getRazorpay().subscriptions.create({
    plan_id: planId,
    quantity: 1,
    total_count: 120, // 10 years — effectively lifetime
    notes: {
      user_id: user.id,
      plan,
      email: user.email ?? '',
    },
  })

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
