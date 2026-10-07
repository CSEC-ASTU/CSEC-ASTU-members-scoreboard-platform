"use client"

import Link from "next/link"
import { RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Membership status shown at the top of a member profile (e.g. after a laptop QR scan). */
export function MemberVerificationBanner({ name, isActive }: { name: string; isActive: boolean }) {
  if (isActive) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Verified CSEC ASTU member</p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {name} is an active member of the club.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Membership not active</p>
        <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
          {name} is registered but is not currently an active CSEC ASTU member.
        </p>
      </div>
    </div>
  )
}

/** Shown when a scanned/visited member ID does not belong to anyone in the club. */
export function NotAMemberNotice() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10">
        <ShieldX className="h-8 w-8 text-rose-600 dark:text-rose-400" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Not a CSEC ASTU member</h1>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          This QR code doesn&apos;t match anyone in the club roster. The person is not a registered CSEC ASTU
          member, or the sticker is invalid.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/members">Open members directory</Link>
      </Button>
    </div>
  )
}

/** Network/server failure — we could not determine membership either way. */
export function VerificationUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-amber-500" />
      <div className="space-y-1.5">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Couldn&apos;t verify right now</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          We couldn&apos;t reach the server to check this membership. Please try again.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try again
      </Button>
    </div>
  )
}
