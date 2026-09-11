"use client"

import { useState } from "react"
import { authService } from "@/lib/api"
import { Loader2 } from "lucide-react"

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
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-[#09090B] p-4 font-sans">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* CSEC ASTU Logo */}
        <div className="flex justify-center">
          <div className="h-16 w-20 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center">
            <img
              src="/csec_astu.svg"
              alt="CSEC ASTU"
              className="w-full h-full object-contain dark:invert"
            />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Member Verification
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Sign in with your university Google account to view this member&apos;s profile.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAuthenticate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.99] transition-all shadow-sm border border-zinc-200 dark:border-zinc-800 disabled:opacity-75 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-400" />
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

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Adama Science and Technology University · CSEC
        </p>
      </div>
    </div>
  )
}
