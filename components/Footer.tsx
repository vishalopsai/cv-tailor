import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-lg font-bold text-indigo-600">CV Tailor</span>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} CV Tailor. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/auth" className="hover:text-gray-900">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
