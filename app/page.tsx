import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 bg-gradient-to-b from-indigo-50 to-white px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            Powered by Claude AI
          </span>
          <h1 className="text-balance text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Tailor your CV to every job.{' '}
            <span className="text-indigo-600">Beat the ATS.</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600">
            Paste your master CV and a job description. CV Tailor rewrites your
            Personal Summary and Skills sections to mirror the JD keywords —
            naturally, in seconds.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth?mode=signup"
              className="rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors"
            >
              Tailor my CV — it&apos;s free
            </Link>
            <Link
              href="/pricing"
              className="text-base font-medium text-gray-600 hover:text-gray-900"
            >
              See pricing →
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Free plan includes 3 tailors per month. No credit card required.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Three steps to a tailored CV
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Paste your master CV',
                desc: 'Upload or paste the full CV you use as your base. Keep it comprehensive.',
              },
              {
                step: '2',
                title: 'Add the job description',
                desc: 'Copy the entire JD — the more context, the better the keyword match.',
              },
              {
                step: '3',
                title: 'Download your DOCX',
                desc: 'Receive a tailored CV with an ATS-optimised summary and skills in seconds.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-indigo-50 py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Why CV Tailor?
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🎯', title: 'ATS-first', desc: 'Keywords mirrored from the JD so your CV passes automated screening.' },
              { icon: '⚡', title: 'Instant results', desc: 'Tailored output in under 10 seconds, not hours of manual editing.' },
              { icon: '📄', title: 'DOCX download', desc: 'Download a formatted Word document ready to submit.' },
              { icon: '🔒', title: 'Private & secure', desc: 'Your data is never stored long-term or shared with third parties.' },
              { icon: '🤖', title: 'Claude AI', desc: 'Powered by Anthropic\'s Claude — one of the most capable AI models.' },
              { icon: '💸', title: 'Affordable', desc: 'Start free, upgrade when you need more. No surprise charges.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 text-3xl">{icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white">
            Ready to land more interviews?
          </h2>
          <p className="mt-4 text-indigo-200">
            Start tailoring your CV today — free, no credit card required.
          </p>
          <Link
            href="/auth?mode=signup"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-indigo-600 shadow hover:bg-indigo-50 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
