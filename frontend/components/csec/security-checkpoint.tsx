"use client"

import { useState } from "react"
import Link from "next/link"
import { authService } from "@/lib/api"
import { ShieldCheck, Lock, QrCode, Sparkles, ArrowRight, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SecurityCheckpointProps {
  memberId: string
}

export function SecurityCheckpoint({ memberId }: SecurityCheckpointProps) {
  const [loading, setLoading] = useState(false)

  const handleAuthenticate = () => {
    setLoading(true)
    const redirectPath = `/members/${memberId}`
    window.location.href = authService.getGoogleLoginUrl(redirectPath)
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#09090B] text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Ambient glowing radial lights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-violet-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[350px] w-[500px] rounded-full bg-emerald-600/10 blur-[130px]" />

      {/* Subtle background cyber grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top Navbar Brand */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
            CS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white leading-tight">
              CSEC ASTU
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
              Physical Lab Security
            </span>
          </div>
        </Link>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          GATEKEEPER ACTIVE
        </div>
      </header>

      {/* Center Security Checkpoint Container */}
      <main className="w-full max-w-[460px] z-10 my-auto py-8 space-y-6">
        {/* Security Crest & Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center mb-1">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-violet-500/20 blur-md" />
            <div className="relative inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-emerald-400/90 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
              <QrCode className="h-3 w-3" />
              Hardware Security Checkpoint
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Verify Lab Member Identity
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            You have scanned an official QR verification sticker affixed to a laptop in the CSEC ASTU Security Lab.
          </p>
        </div>

        {/* Security Card */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Lock className="h-3.5 w-3.5 text-violet-400" />
              <span>Authentication Required</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To protect student privacy and ensure physical lab integrity, only verified CSEC ASTU club members can view member photo profiles and security clearances.
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleAuthenticate}
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
                <span>Authenticate with ASTU Account</span>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <Sparkles className="h-3 w-3 text-violet-400" />
            <span>Instant single sign-on · Redirects directly to member</span>
          </div>
        </div>

        {/* Security Disclaimer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-zinc-400">
            Scanning a laptop sticker grants read-only visual confirmation.
          </p>
          <p className="text-[10px] text-zinc-400">
            Adama Science and Technology University · Department of Computer Science &amp; Engineering
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl z-10 text-center py-2 text-xs text-zinc-400 flex items-center justify-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" />
        <span>Physical Hardware Security Protocol §4.2 · CSEC ASTU</span>
      </footer>
    </div>
  )
}
