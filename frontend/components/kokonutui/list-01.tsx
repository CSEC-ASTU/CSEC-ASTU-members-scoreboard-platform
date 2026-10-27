"use client"

import { useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Trophy,
  Sparkles,
  Shield,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  AlertTriangle,
  RotateCw,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react"
import { useCurrentUser } from "@/components/user-context"
import { TierBadge } from "@/components/csec/ui-bits"
import { getMemberBadge } from "@/lib/csec-data"
import { useDivisions, useEffectiveSettings, useMemberEvents } from "@/lib/hooks/use-queries"

export default function List01({ className }: { className?: string }) {
  const platformSettings = useEffectiveSettings()
  const { currentUser, liveUser, isAuthenticated, refetchUser } = useCurrentUser()

  // Query live member point events
  const {
    data: memberEventsData,
    isError: eventsError,
    refetch: refetchEvents,
  } = useMemberEvents(currentUser?.id ? currentUser.id : null, { page_size: 100 })

  const { data: divisions } = useDivisions()

  const resolvedDivision = useMemo(() => {
    if (liveUser?.division_name) return liveUser.division_name
    const divId = liveUser?.division_id || currentUser?.divisionId
    if (divId && divisions) {
      const found = divisions.find((d) => d.id === divId)
      if (found) return found.name
    }
    const currDiv = currentUser?.division
    if (
      currDiv &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currDiv)
    ) {
      return currDiv
    }
    if (divisions && currDiv) {
      const found = divisions.find((d) => d.id === currDiv)
      if (found) return found.name
    }
    return "General"
  }, [liveUser, divisions, currentUser])

  // Prefer live backend metrics
  const cycleScore = liveUser?.cycle_score ?? currentUser?.cycleScore ?? 50
  const careerScore = liveUser?.career_score ?? currentUser?.careerScore ?? 50
  const badge = ((liveUser?.badge || currentUser?.badge) as any) ?? getMemberBadge(cycleScore, platformSettings.scoreCap)

  const events = memberEventsData?.items || []
  const approvedCount = events.filter((e) => e.status === "approved").length
  const pendingCount = events.filter((e) => e.status === "pending").length
  const hasYellow = events.some((e) => e.event_type === "yellow_warning")
  const hasRed = events.some((e) => e.event_type === "red_warning")

  const isTelegramConnected = Boolean(
    liveUser?.telegram_connected ?? currentUser?.telegramConnected
  )
  const telegramUsername =
    liveUser?.telegram_username ?? currentUser?.telegramUsername

  const isFallback = eventsError || (!liveUser && Boolean(currentUser?.id))

  const progressPercent = Math.min(
    Math.round((cycleScore / platformSettings.scoreCap) * 100),
    100
  )

  function handleRetry() {
    refetchUser?.()
    refetchEvents?.()
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Offline / Fallback Alert Banner */}
      {isFallback && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Showing offline standing data · Live ledger sync unavailable</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
          >
            <RotateCw className="h-3 w-3" />
            Retry Sync
          </button>
        </div>
      )}

      {/* Unified Executive Ledger Strip — Single cohesive surface, no fragmented cards */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-white/[0.08]">
          {/* Section 1: Active Cycle Standing (Primary Metric) */}
          <div className="p-6 sm:p-7 lg:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Trophy className="h-3.5 w-3.5 text-amber-500/80" />
                    Active Cycle {platformSettings.currentAcademicYear}
                  </span>
                </div>
                {badge && <TierBadge tier={badge} />}
              </div>

              <div className="mt-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {cycleScore}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    points earned
                  </span>
                </div>

                {/* Streamlined Progress Track */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>
                      <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{progressPercent}%</strong> of {platformSettings.scoreCap.toLocaleString()} pt annual cap
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Resets Sept 1</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Status Meta */}
            <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-zinc-100 dark:border-white/[0.05] text-xs">
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{approvedCount}</strong> claims approved
                </span>
              </div>
              {pendingCount > 0 ? (
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{pendingCount}</strong> in review
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  All submissions verified
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Lifetime Career Standing */}
          <div className="p-6 sm:p-7 lg:col-span-3 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Lifetime Career
                </span>
                <Sparkles className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>

              <div className="mt-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {careerScore}
                  </span>
                  <span className="text-xs text-zinc-400">pts total</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Uncapped historical contributions
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.05] space-y-1">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {resolvedDivision}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Class of {currentUser.joiningYear || "2025"}
              </div>
            </div>
          </div>

          {/* Section 3: Standing & Integrations */}
          <div className="p-6 sm:p-7 lg:col-span-3 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Member Standing
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>

              <div className="mt-5 space-y-2">
                {hasRed ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 border border-red-500/20">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    Critical Notice
                  </div>
                ) : hasYellow ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    Active Warning
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Good Standing (+{platformSettings.initialBuffer} base)
                  </div>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {hasRed
                    ? "Notice logged. Attend division sessions to recover buffer."
                    : hasYellow
                    ? "Warning logged. Complete backlog tasks to restore standing."
                    : "Zero infractions. Eligible for elections & certification."}
                </p>
              </div>
            </div>

            {/* Telegram Sync Strip */}
            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.05]">
              <Link
                href="/profile"
                className="group flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isTelegramConnected
                        ? "bg-emerald-500"
                        : "bg-amber-500 animate-pulse"
                    )}
                  />
                  <span>
                    Telegram:{" "}
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {isTelegramConnected
                        ? telegramUsername
                          ? `@${telegramUsername}`
                          : "Connected"
                        : "Not Linked"}
                    </strong>
                  </span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
