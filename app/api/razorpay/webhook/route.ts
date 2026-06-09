import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { PLAN_LIMITS } from '@/lib/razorpay'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const expectedSig = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body) as {
    event: string
    payload: {
      subscription: { entity: { id: string; plan_id: string; notes: Record<string, string> } }
    }
  }

  const supabase = getServiceClient()
  const sub = event.payload.subscription.entity

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.resumed': {
      const userId = sub.notes?.user_id
      const plan = sub.notes?.plan

      if (userId && plan && plan in PLAN_LIMITS) {
        await supabase
          .from('users')
          .update({
            plan,
            tailors_limit: PLAN_LIMITS[plan],
            razorpay_subscription_id: sub.id,
          })
          .eq('id', userId)
      }
      break
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.halted': {
      await supabase
        .from('users')
        .update({
          plan: 'free',
          tailors_limit: PLAN_LIMITS.free,
          razorpay_subscription_id: null,
        })
        .eq('razorpay_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
