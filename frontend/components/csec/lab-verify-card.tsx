"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { authService, membersService, type MemberLabVerifyOut } from "@/lib/api"
import { Loader2, ShieldCheck, ShieldAlert, LogIn } from "lucide-react"

interface LabVerifyCardProps {
  memberId: string
}

export function LabVerifyCard({ memberId }: LabVerifyCardProps) {
  const [data, setData] = useState<MemberLabVerifyOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await membersService.labVerify(memberId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) {
          setError("Could not verify this QR code. The member may not exist.")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [memberId])

  const handleLogin = () => {
    setLoginLoading(true)
    const redirectPath = `/members/${memberId}`
    try {
      localStorage.setItem("csec_post_login_redirect", redirectPath)
    } catch {
      // ignore
    }
    window.location.href = authService.getGoogleLoginUrl(redirectPath)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-[#09090B] p-4 font-sans">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex justify-center">
          <div className="h-14 w-18 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center">
            <img
              src="/csec_astu.svg"
              alt="CSEC ASTU"
              className="w-full h-full object-contain dark:invert"
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Lab Membership Check
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Quick verification from a laptop QR sticker
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Verifying member…</p>
            </div>
          ) : error || !data ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldAlert className="h-10 w-10 text-rose-500" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Not found</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {data.profile_image_url ? (
                  <img
                    src={data.profile_image_url}
                    alt={data.full_name}
                    className="h-28 w-28 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-400">
                    {data.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-zinc-950 ${
                    data.is_active ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {data.full_name}
                </h2>
                {data.is_active ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Active CSEC ASTU Member
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Not an active member
                  </div>
                )}
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Name and membership status only. Sign in to view the full profile.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loginLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-75"
        >
          {loginLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in for full profile
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-zinc-400">
          <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300 underline-offset-2 hover:underline">
            Back to home
          </Link>
          {" · "}
          Adama Science and Technology University
        </p>
      </div>
    </div>
  )
}
