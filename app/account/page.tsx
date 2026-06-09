'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

interface UsageData {
  plan: string
  tailors_used: number
  tailors_limit: number
  period_start: string
  razorpay_subscription_id: string | null
}

function AccountContent() {
  const searchParams = useSearchParams()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMsg('Plan upgraded successfully! Your new limits are now active.')
    }

    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => {
        setUsage(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [searchParams])

  async function handleCancel() {
    if (!cancelConfirm) {
      setCancelConfirm(true)
      return
    }
    setCancelLoading(true)
    setError('')

    const res = await fetch('/api/razorpay/cancel', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to cancel subscription.')
      setCancelLoading(false)
      setCancelConfirm(false)
      return
    }

    setSuccessMsg('Subscription cancelled. You have been moved to the free plan.')
    setCancelConfirm(false)
    setCancelLoading(false)

    // Refresh usage
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d) => setUsage(d))
      .catch(() => null)
  }

  const limitLabel =
    usage?.tailors_limit === -1 ? 'Unlimited' : String(usage?.tailors_limit)
  const usedPercent =
    usage && usage.tailors_limit > 0
      ? Math.min(100, (usage.tailors_used / usage.tailors_limit) * 100)
      : 0
  const periodStart = usage?.period_start
    ? new Date(usage.period_start).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <main className="flex-1 bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Account</h1>

        {successMsg && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            Loading…
          </div>
        ) : usage ? (
          <div className="space-y-6">
            {/* Plan card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current plan</p>
                  <p className="mt-1 text-xl font-bold capitalize text-gray-900">
                    {usage.plan}
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  {usage.plan === 'free' ? 'Upgrade' : 'Change plan'}
                </Link>
              </div>
            </div>

            {/* Usage card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Usage — {periodStart}
              </p>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">
                  {usage.tailors_used}{' '}
                  <span className="text-base font-normal text-gray-400">
                    / {limitLabel} tailors used
                  </span>
                </p>
              </div>

              {usage.tailors_limit !== -1 && (
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usedPercent >= 90
                          ? 'bg-red-500'
                          : usedPercent >= 70
                          ? 'bg-yellow-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  {usedPercent >= 80 && usage.plan === 'free' && (
                    <p className="mt-2 text-sm text-orange-600">
                      Almost at your limit.{' '}
                      <Link href="/pricing" className="font-medium underline">
                        Upgrade for more.
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-medium text-gray-700">Quick actions</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Tailor a CV
                </Link>
                {usage.plan === 'free' && (
                  <Link
                    href="/pricing"
                    className="flex-1 rounded-lg border border-indigo-300 px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    View plans
                  </Link>
                )}
                {usage.razorpay_subscription_id && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className="flex-1 rounded-lg border border-red-300 px-4 py-2.5 text-center text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {cancelLoading
                      ? 'Cancelling…'
                      : cancelConfirm
                      ? 'Confirm cancel?'
                      : 'Cancel subscription'}
                  </button>
                )}
              </div>
              {cancelConfirm && (
                <p className="mt-2 text-xs text-gray-500">
                  Click again to confirm. Your plan will revert to free immediately.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-500">Failed to load account data.</p>
        )}
      </div>
    </main>
  )
}

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center text-gray-400">
            Loading…
          </main>
        }
      >
        <AccountContent />
      </Suspense>
      <Footer />
    </div>
  )
}
