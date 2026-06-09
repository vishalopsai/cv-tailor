'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  // unsubscribe ref so cleanup doesn't depend on re-creating the client
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Dynamic import keeps createBrowserClient out of SSR entirely
    let cancelled = false

    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      if (cancelled) return
      const supabase = createClient()

      const { data } = await supabase.auth.getUser()
      if (!cancelled) setUser(data.user)

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setUser(session?.user ?? null)
      })

      unsubRef.current = () => subscription.unsubscribe()
    })()

    return () => {
      cancelled = true
      unsubRef.current?.()
    }
  }, [])

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">CV Tailor</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Pricing
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Account
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
