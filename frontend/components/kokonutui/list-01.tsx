"use client"

import { cn } from "@/lib/utils"
import { Trophy, ArrowUpRight, TrendingUp, Sparkles, Shield, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useCurrentUser } from "@/components/user-context"
import { TierBadge, ScoreCapProgress } from "@/components/csec/ui-bits"
import { PLATFORM_SETTINGS } from "@/lib/csec-data"
import { useEffect, useMemo, useState } from "react"
import { authService, pointEventsService, type CurrentUserOut, type PointEventOut } from "@/lib/api"
import { useDivisions } from "@/lib/hooks/use-queries"

export default function List01({ className }: { className?: string }) {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const [userData, setUserData] = useState<CurrentUserOut | null>(null)
  const [events, setEvents] = useState<PointEventOut[]>([])

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated) return
      try {
        const [me, evts] = await Promise.all([
          authService.getMe(),
          pointEventsService.listEvents({ member_id: currentUser.id }),
        ])
        setUserData(me)
        setEvents(evts.items || [])
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err)
      }
    }
    loadData()
  }, [currentUser.id, isAuthenticated])

  const { data: divisions } = useDivisions()

  const resolvedDivision = useMemo(() => {
    if (userData?.division_name) return userData.division_name
    const divId = userData?.division_id || (currentUser as any).divisionId
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
  }, [userData, divisions, currentUser])

  const cycleScore = userData?.cycle_score ?? 50
  const careerScore = userData?.career_score ?? 50
  const badge = userData?.badge ?? null
  const approvedCount = events.filter((e) => e.status === "approved").length
  const pendingCount = events.filter((e) => e.status === "pending").length
  const hasYellow = events.some((e) => e.event_type === "yellow_warning")
  const hasRed = events.some((e) => e.event_type === "red_warning")

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6", className)}>
      {/* 1. HERO SPOTLIGHT CARD (60-65% width: 7-8 cols on lg) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/20 lg:col-span-7 xl:col-span-8 flex flex-col justify-between group transition-all duration-300">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                <Trophy className="h-3.5 w-3.5 text-zinc-500" />
                Active Cycle {PLATFORM_SETTINGS.currentAcademicYear}
              </span>
            </div>
            {badge && <TierBadge tier={badge} />}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Current Standing Score
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                  {cycleScore}
                </span>
                <span className="text-base font-semibold text-zinc-400">
                  / {PLATFORM_SETTINGS.scoreCap} pts cap
                </span>
              </div>
            </div>

            <Link
              href="/tasks"
              className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 text-xs font-medium transition-all duration-200"
            >
              <span>Submit Activity</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-2">
            <ScoreCapProgress cycleScore={cycleScore} scoreCap={PLATFORM_SETTINGS.scoreCap} />
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <span><strong className="font-semibold text-zinc-900 dark:text-zinc-100">{approvedCount}</strong> claims approved</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
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
        <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Lifetime Career
            </span>
            <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{careerScore}</span>
            <span className="text-xs font-medium text-zinc-400">pts (uncapped)</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {resolvedDivision} Division · Class of {currentUser.joiningYear}
          </p>
        </div>

        {/* Accountability Status Card */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Standing Status
            </span>
            <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2">
            {hasRed ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-400" /> Critical Notice (Buffer Depleted)
              </div>
            ) : hasYellow ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-400" /> Active Warning (+25 pts buffer)
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10">
                <Shield className="h-3.5 w-3.5 text-zinc-400" /> Good Standing (+{PLATFORM_SETTINGS.initialBuffer} base)
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
        <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Telegram Bot Handshake
            </span>
            <div className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {currentUser.telegramUsername || "@csec_member"}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Sync Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
