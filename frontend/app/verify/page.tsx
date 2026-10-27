"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle2,
  Lock,
  Building2,
} from "lucide-react"

export default function VerifyPortalPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Please enter a credential code to verify.")
      return
    }
    setError(null)
    router.push(`/verify/certificate/${encodeURIComponent(trimmed)}`)
  }

  const sampleCodes = [
    { label: "Engineering Distinction", code: "CSEC-2026-DEV-A9B8C7" },
  ]

  return (
    <div className="relative min-h-screen w-full bg-[#0B0C0E] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200 flex flex-col justify-between">
      {/* ── Authentic Student Photo Backdrop (Exact Match to Login & Hero) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-50">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members"
          fill
          priority
          className="object-cover object-[center_60%] grayscale-[10%]"
        />
        {/* Balanced vignettes: deeper contrast while preserving student photo presence */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/75 via-[#0B0C0E]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/80 via-[#0B0C0E]/25 to-transparent" />
      </div>

      {/* ── Architectural Header ────────────────────────────────────────── */}
      <header className="relative z-10 w-full border-b border-zinc-800/60 px-6 py-4 md:px-12 md:py-5 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/csec_astu.svg"
              alt="CSEC ASTU"
              width={26}
              height={18}
              className="h-5 w-auto invert opacity-90 transition-opacity group-hover:opacity-100"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                CSEC ASTU
              </span>
              <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">
                Dept. of Computer Science &amp; Engineering
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </header>

      {/* ── Verification Terminal Card ──────────────────────────────────── */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-lg px-6 py-8 sm:py-10">
        <div className="rounded-xl border border-zinc-800/80 bg-[#121316]/85 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {/* Eyebrow & Headline */}
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
              <span>ASTU · DEPT OF CSE</span>
              <span className="text-zinc-600">/</span>
              <span>CREDENTIAL REGISTRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              Verify an official credential
            </h1>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">
              Enter the unique certificate code printed directly under the QR code or cited by the candidate to confirm authenticity against our cryptographic ledger.
            </p>
          </div>

          {/* Form Terminal */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="cert-code"
                className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Credential Identifier Code
              </label>

              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  id="cert-code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    if (error) setError(null)
                  }}
                  placeholder="e.g. CSEC-2026-DEV-A9B8C7"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/70 border border-zinc-800 focus:border-zinc-500 rounded-lg text-xs sm:text-sm font-mono tracking-wider text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors uppercase"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {error && (
                <p className="mt-2 text-xs text-rose-400 font-medium">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-white active:scale-[0.99] cursor-pointer shadow-sm"
            >
              <span>Verify Credential Authenticity</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Sample Codes Quick-Fill */}
          {sampleCodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-500">Need a test code?</span>
              {sampleCodes.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setCode(s.code)}
                  className="font-mono text-[11px] text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer transition-colors"
                >
                  {s.code}
                </button>
              ))}
            </div>
          )}

          {/* Institutional Trust Spec Strip */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-start gap-1.5 text-[11px] text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <span>HMAC-SHA256 signature</span>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-zinc-400">
              <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <span>Dept. of CSE registry</span>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 shrink-0 mt-0.5" />
              <span>Real-time revocation check</span>
            </div>
          </div>
        </div>

        {/* Quiet Sub-Navigation */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-zinc-500 font-mono">
            Issued certificates include a QR code linking directly to this registry.
          </p>
        </div>
      </main>

      {/* ── Collegiate Minimal Footer ────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-zinc-800/60 px-6 py-5 text-center text-xs font-mono text-zinc-500">
        Dept. of Computer Science &amp; Engineering · Adama Science and Technology University · Adama, Ethiopia
      </footer>
    </div>
  )
}
