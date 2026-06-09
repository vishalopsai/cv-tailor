import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CV Tailor – ATS-Optimized CVs in Seconds',
  description:
    'Paste your CV and a job description. CV Tailor rewrites your Personal Summary and Skills to beat ATS screening — powered by Claude AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
