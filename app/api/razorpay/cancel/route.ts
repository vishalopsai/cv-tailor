import { NextResponse } from 'next/server'
import { getRazorpay, PLAN_LIMITS } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('razorpay_subscription_id')
    .eq('id', user.id)
    .single()

  if (!userData?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  // Cancel at end of current billing cycle (false = don't cancel immediately)
  await getRazorpay().subscriptions.cancel(userData.razorpay_subscription_id, false)

  await supabase
    .from('users')
    .update({
      plan: 'free',
      tailors_limit: PLAN_LIMITS.free,
      razorpay_subscription_id: null,
    })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
