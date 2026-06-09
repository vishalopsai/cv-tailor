'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    limit: '3 tailors / month',
    features: ['3 CV tailors per month', 'DOCX download', 'ATS optimisation', 'Email support'],
    cta: 'Get started free',
    ctaLink: '/auth?mode=signup',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '₹749',
    period: 'per month',
    limit: '50 tailors / month',
    features: [
      '50 CV tailors per month',
      'DOCX download',
      'ATS optimisation',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    ctaLink: null,
    highlight: true,
  },
  {
    key: 'unlimited',
    name: 'Unlimited',
    price: '₹1,599',
    period: 'per month',
    limit: 'Unlimited tailors',
    features: [
      'Unlimited CV tailors',
      'DOCX download',
      'ATS optimisation',
      'Priority support',
    ],
    cta: 'Go Unlimited',
    ctaLink: null,
    highlight: false,
  },
]

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('razorpay-script')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    setError('')

    try {
      // Get subscription_id from our backend
      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })

      if (res.status === 401) {
        window.location.href = '/auth?redirect=/pricing'
        return
      }

      const data = await res.json()

      if (!res.ok || !data.subscriptionId) {
        setError(data.error ?? 'Failed to initiate payment.')
        setLoading(null)
        return
      }

      await loadRazorpayScript()

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'CV Tailor',
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
        image: '/favicon.ico',
        theme: { color: '#4f46e5' },
        handler: function () {
          window.location.href = '/account?success=true'
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Start free, scale when you need more. Cancel anytime.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            All prices in INR. Accepts UPI, cards, net banking &amp; wallets.
          </p>

          {error && (
            <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-8 text-left ${
                  plan.highlight
                    ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-600'
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}

                <div>
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="mb-1 text-gray-500">/{plan.period}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-indigo-600">
                    {plan.limit}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.ctaLink ? (
                    <Link
                      href={plan.ctaLink}
                      className="block w-full rounded-xl border border-indigo-600 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loading === plan.key}
                      className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                        plan.highlight
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      {loading === plan.key ? 'Opening payment…' : plan.cta}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-gray-400">
            Subscriptions billed monthly. Cancel anytime from your account page.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
