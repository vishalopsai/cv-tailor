import Razorpay from 'razorpay'

// Lazy getter — avoids module-level init that crashes during `next build`
let _client: Razorpay | null = null
export function getRazorpay(): Razorpay {
  if (!_client) {
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }
  return _client
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 50,
  unlimited: -1,
}

export const PLANS = {
  free: { name: 'Free', priceINR: 0, limit: 3, planId: null },
  pro: {
    name: 'Pro',
    priceINR: 749,
    limit: 50,
    planId: process.env.RAZORPAY_PRO_PLAN_ID,
  },
  unlimited: {
    name: 'Unlimited',
    priceINR: 1599,
    limit: -1,
    planId: process.env.RAZORPAY_UNLIMITED_PLAN_ID,
  },
} as const
