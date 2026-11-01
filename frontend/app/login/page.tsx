"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { authService } from "@/lib/api"

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Security state verification failed. This occurs if session cookies are blocked or domain mismatch.",
  oauth_failed: "Google token exchange failed. Check that GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI match exactly.",
  missing_profile: "Google did not return an email or profile for your account.",
  inactive: "Your membership account has been deactivated. Please contact an officer.",
  google_mismatch: "The Google account does not match the Google ID linked to this member profile.",
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const [loading, setLoading] = useState(false)

  function handleGoogleLogin() {
    setLoading(true)
    const redirectParam = searchParams.get("redirect") || undefined
    window.location.href = authService.getGoogleLoginUrl(redirectParam)
  }

  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] || `Authentication failed (${errorParam})`) : null

  return (
    <div className="relative min-h-screen w-full bg-[#0B0C0E] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200 flex flex-col justify-between">
      {/* Authentic Student Photo Backdrop matching Hero */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-65">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members"
          fill
          priority
          className="object-cover object-[center_60%] grayscale-[5%]"
        />
        {/* Very light, airy vignettes letting the authentic student backdrop shine through */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/50 via-[#0B0C0E]/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/60 via-transparent to-transparent" />
      </div>

      {/* Architectural Header */}
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
              <span className="font-semibold text-sm tracking-tight text-zinc-100">CSEC ASTU</span>
              <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">Dept. of Computer Science &amp; Engineering</span>
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

      {/* Centered Minimalist Login Core */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-md px-6 py-12">
        <div className="rounded-xl border border-zinc-800/80 bg-[#121316]/85 p-8 backdrop-blur-md shadow-2xl">
          {/* Eyebrow & Headline */}
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
              <span>ASTU · DEPT OF CSE</span>
              <span className="text-zinc-600">/</span>
              <span>MEMBER PORTAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              Sign in to your ledger
            </h1>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">
              Authenticate with your verified personal Google account to manage your points, division tasks, and credentials.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-3.5 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-red-300">Authentication Error</div>
                <div className="text-xs text-red-200/80 leading-relaxed">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded bg-zinc-100 px-4 py-3 text-xs font-semibold text-zinc-950 transition-all hover:bg-white active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google Single Sign-On</span>
              </>
            )}
          </button>

          {/* Verification Badge */}
          <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-zinc-800/80 pt-4 text-[11px] font-mono text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            <span>· CSEC ASTU verified member session</span>
          </div>
        </div>

        {/* Public Events Alternative */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <Link
            href="/events/explore"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>Looking for public workshops? Browse campus events</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <p className="text-[11px] text-zinc-600">
            Need access? Check with your division head or email your club lead.
          </p>
        </div>
      </main>

      {/* Collegiate Minimal Footer */}
      <footer className="relative z-10 w-full border-t border-zinc-800/60 px-6 py-5 text-center text-xs font-mono text-zinc-500">
        Dept. of Computer Science &amp; Engineering · Adama Science and Technology University · Adama, Ethiopia
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
