"use client"

import { cn } from "@/lib/utils"
import { Trophy, ArrowUpRight, TrendingUp, Sparkles, Shield, AlertCircle, Clock, CheckCircle2, Send, AlertTriangle, RotateCw } from "lucide-react"
import Link from "next/link"
import { useCurrentUser } from "@/components/user-context"
import { TierBadge, ScoreCapProgress } from "@/components/csec/ui-bits"
import { getMemberBadge } from "@/lib/csec-data"
import { useMemo } from "react"
import { useDivisions, useEffectiveSettings, useMemberEvents } from "@/lib/hooks/use-queries"

export default function List01({ className }: { className?: string }) {
  const platformSettings = useEffectiveSettings()
  const { currentUser, liveUser, isAuthenticated, refetchUser } = useCurrentUser()

  // Query live member point events (page size 100 for comprehensive count)
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

  // Prefer live backend metrics, gracefully falling back to baseline session or mock defaults
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

  // Fallback active if events query failed or liveUser failed to load
  const isFallback = eventsError || (!liveUser && Boolean(currentUser?.id))

  function handleRetry() {
    refetchUser?.()
    refetchEvents?.()
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-5", className)}>
      {/* Offline / Fallback Alert Banner */}
      {isFallback && (
        <div className="col-span-1 lg:col-span-12 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Showing offline standing data · Live ledger metric sync unavailable</span>
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

      {/* 1. HERO SPOTLIGHT CARD (60-65% width: 7-8 cols on lg) */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-6 sm:p-7 shadow-sm lg:col-span-7 xl:col-span-8 flex flex-col justify-between transition-all duration-200">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800/80">
                <Trophy className="h-3.5 w-3.5 text-zinc-500" />
                Active Cycle {platformSettings.currentAcademicYear}
              </span>
            </div>
            {badge && <TierBadge tier={badge} />}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
            <div>
              <p className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Current Standing Score
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                  {cycleScore}
                </span>
                <span className="text-sm font-mono text-zinc-400">
                  / {platformSettings.scoreCap} pts cap
                </span>
              </div>
            </div>

            <Link
              href="/tasks"
              className="inline-flex items-center gap-2 self-start sm:self-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Submit Activity</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6 space-y-2">
            <ScoreCapProgress cycleScore={cycleScore} scoreCap={platformSettings.scoreCap} />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span><strong className="font-semibold text-zinc-900 dark:text-zinc-100">{approvedCount}</strong> claims approved</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span><strong className="font-semibold text-zinc-900 dark:text-zinc-100">{pendingCount}</strong> in review</span>
              </div>
            )}
          </div>

          <span className="text-zinc-400 text-[11px]">
            Cap resets annually on Sept 1
          </span>
        </div>
      </div>

      {/* 2. QUICK PULSE STACK (35-40% width: 5-4 cols on lg) */}
      <div className="space-y-4 lg:col-span-5 xl:col-span-4 flex flex-col justify-between">
        {/* Career & Division Standing */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-5 shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Lifetime Career
            </span>
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{careerScore}</span>
            <span className="text-xs font-mono text-zinc-400">pts (uncapped)</span>
          </div>
          <p className="mt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {resolvedDivision} Division · Class of {currentUser.joiningYear}
          </p>
        </div>

        {/* Accountability Status Card */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-5 shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Standing Status
            </span>
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2">
            {hasRed ? (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-mono font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Critical Notice (Buffer Depleted)
              </div>
            ) : hasYellow ? (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-mono font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Active Warning (+25 pts buffer)
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Good Standing (+{platformSettings.initialBuffer} base)
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {hasRed
              ? "Critical notice logged. Attend division sprint sessions to maintain standing."
              : hasYellow
              ? "Notice recorded. Complete assigned backlog tasks to restore standing."
              : "Zero active infractions. Eligible for division officer elections & certification."}
          </p>
        </div>

        {/* Telegram Bot Notification Status */}
        <Link
          href="/profile"
          className="group block rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-5 shadow-sm hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-blue-500" />
              Telegram Bot Status
            </span>
            <div
              className={cn(
                "h-2 w-2 rounded-full ring-4 transition-colors",
                isTelegramConnected
                  ? "bg-emerald-500 ring-emerald-500/20"
                  : "bg-amber-500 ring-amber-500/20 animate-pulse"
              )}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-medium font-mono",
                isTelegramConnected
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-amber-600 dark:text-amber-400 font-semibold"
              )}
            >
              {isTelegramConnected
                ? telegramUsername
                  ? `@${telegramUsername}`
                  : "Connected"
                : "Not Linked"}
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-medium px-2 py-0.5 rounded border",
                isTelegramConnected
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40"
                  : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40"
              )}
            >
              {isTelegramConnected ? "Sync Active" : "Action Required"}
            </span>
          </div>
          {!isTelegramConnected && (
            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span>Required for notifications</span>
              <span className="font-semibold underline underline-offset-2">Link Account &rarr;</span>
            </p>
          )}
        </Link>
      </div>
    </div>
  )
}
