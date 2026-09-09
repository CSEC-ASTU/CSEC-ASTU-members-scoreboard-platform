"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ExternalLink, Mail, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

function NotRegisteredContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || "your Google account"

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#09090B] text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-amber-500/10 blur-[140px]" />

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <Link href="/login" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
            CS
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            CSEC ASTU
          </span>
        </Link>
      </header>

      {/* Centered Message Card */}
      <main className="w-full max-w-[460px] z-10 my-auto py-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-inner mb-1">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Account Not Registered
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            The Google account <strong className="text-zinc-200 font-mono text-xs">{email}</strong> was not found in the verified CSEC ASTU member roster.
          </p>
        </div>

        {/* Informational Glass Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="space-y-3 text-xs text-zinc-300">
            <p>
              To maintain data integrity and prevent unauthorized access, membership accounts are imported from the official club registration Google Form.
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
              <span className="text-zinc-400 font-medium">Common reasons for this:</span>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                <li>You have not filled out the semester registration form yet.</li>
                <li>You signed in with a personal Gmail instead of your registered email.</li>
                <li>Your registration form submission is pending officer CSV import.</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <a
              href="https://forms.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-100 transition-all shadow-md"
            >
              Fill Out Member Registration Form
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 font-medium text-xs hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Try Another Google Account
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500">
          Need assistance? Contact your Division Head or message us at{" "}
          <span className="text-zinc-400">csec@astu.edu.et</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl z-10 text-center py-2 text-xs text-zinc-600">
        <p>Adama Science and Technology University · Computer Science &amp; Engineering Club</p>
      </footer>
    </div>
  )
}

export default function NotRegisteredPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}>
      <NotRegisteredContent />
    </Suspense>
  )
}
