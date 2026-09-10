"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Lock, Sparkles } from "lucide-react"
import { authService } from "@/lib/api"

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Security state verification failed. This occurs if session cookies are blocked or domain mismatch.",
  oauth_failed: "Google token exchange failed. Check that GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI match exactly.",
  missing_profile: "Google did not return an email or profile for your account.",
  inactive: "Your membership account has been deactivated. Please contact an officer.",
  google_mismatch: "The Google account does not match the Google ID linked to this member profile.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const [loading, setLoading] = useState(false)

  function handleGoogleLogin() {
    setLoading(true)
    window.location.href = authService.getGoogleLoginUrl()
  }

  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] || `Authentication failed (${errorParam})`) : null

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#09090B] text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Subtle ambient lighting glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-zinc-800/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[350px] w-[500px] rounded-full bg-blue-600/5 blur-[120px]" />

      {/* Subtle background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top mini navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
            CS
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            CSEC ASTU
          </span>
        </Link>
      </header>

      {/* Centered Notion/Linear-Style Login Card */}
      <main className="w-full max-w-[400px] z-10 my-auto py-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner mb-1">
            <Sparkles className="h-6 w-6 text-zinc-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Sign in with your university Google account to access your points ledger and division tasks.
          </p>
        </div>

        {/* Error Alert if redirected with error */}
        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-300">Login Error</p>
              <p className="text-xs text-red-200/80 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* OAuth Box */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full relative flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-md hover:shadow-zinc-700/10 disabled:opacity-75 disabled:cursor-not-allowed group border border-zinc-200"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <Lock className="h-3 w-3 text-zinc-500" />
            <span>Secure session · ASTU student auth</span>
          </div>
        </div>

        {/* Bottom Helper Info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-500">
            Having trouble signing in? Reach out to your division lead or club admin.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl z-10 text-center py-2 text-xs text-zinc-600">
        <p>Adama Science and Technology University · Computer Science &amp; Engineering Club</p>
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
