"use client"

import { cn } from "@/lib/utils"
import { Trophy, Building2, Send, TrendingUp, Sparkles, Shield, AlertCircle } from "lucide-react"
import { useCurrentUser } from "@/frontend/components/user-context"
import {
  getMemberCycleScore,
  getMemberCareerScore,
  getMemberBadge,
  getMemberEvents,
  getMemberWarnings,
  TASK_CATEGORY_LABELS,
  PLATFORM_SETTINGS,
} from "@/lib/csec-data"
import { TierBadge, ScoreCapProgress } from "@/frontend/components/csec/ui-bits"
import { useState } from "react"

export default function List01({ className }: { className?: string }) {
  const { currentUser } = useCurrentUser()
  const [connected, setConnected] = useState(Boolean(currentUser.telegramUsername))

  const cycleScore = getMemberCycleScore(currentUser.id)
  const careerScore = getMemberCareerScore(currentUser.id)
  const badge = getMemberBadge(cycleScore, PLATFORM_SETTINGS.scoreCap)
  const events = getMemberEvents(currentUser.id)
  const warnings = getMemberWarnings(currentUser.id)
  const approvedCount = events.filter((e) => e.status === "approved").length
  const pendingCount = events.filter((e) => e.status === "pending").length

  // Loss aversion buffer status: +50 starting buffer - warnings
  const hasYellow = warnings.some((w) => w.level === "yellow")
  const hasRed = warnings.some((w) => w.level === "red")

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {/* 1. Cycle Score & Cap Progress */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Current Cycle ({PLATFORM_SETTINGS.currentAcademicYear})
          </span>
          <div className="rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{cycleScore}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">pts</span>
          {badge && <TierBadge tier={badge} className="ml-auto" />}
        </div>

        <div className="mt-3">
          <ScoreCapProgress cycleScore={cycleScore} scoreCap={PLATFORM_SETTINGS.scoreCap} />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> {approvedCount} approved
          </span>
          <span>{pendingCount} pending</span>
        </div>
      </div>

      {/* 2. Lifetime Career Score & Standing */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Lifetime Career Score</span>
          <div className="rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
            <Sparkles className="h-4 w-4 text-cyan-500" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{careerScore}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">pts (uncapped)</span>
        </div>

        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
          {currentUser.division} · Joined {currentUser.joiningYear}
        </div>

        {/* Accountability standing */}
        <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Buffer Status:</span>
          {hasRed ? (
            <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> Buffer Depleted (Red)
            </span>
          ) : hasYellow ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" /> Buffer Dropped (+25 pts)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Shield className="h-3.5 w-3.5" /> Good Standing (+{PLATFORM_SETTINGS.initialBuffer} base)
            </span>
          )}
        </div>
      </div>

      {/* 3. Telegram connection card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Telegram Notification Bot</span>
          <div className="rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
            <Send className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        {connected ? (
          <>
            <div className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {currentUser.telegramUsername}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> Handshake Connected
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Receiving warning &amp; approval notifications via bot chat ID.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Connect your Telegram username to complete the bot handshake.
            </p>
            <button
              type="button"
              onClick={() => setConnected(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Send className="h-3.5 w-3.5" /> Connect Telegram
            </button>
          </>
        )}
      </div>
    </div>
  )
}
