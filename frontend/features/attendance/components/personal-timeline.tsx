"use client"

import { Flame, CheckCircle2, Clock, Award, Table as TableIcon, Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PersonalSessionItem, PersonalStats } from "../types"

interface PersonalTimelineProps {
  personalStats: PersonalStats & { bestStreak: number; late: number }
  personalFilter: "all" | "club_wide" | "division"
  setPersonalFilter: (f: "all" | "club_wide" | "division") => void
  userDivisionName: string
  hasDivision: boolean
  days: number
  setDays: (days: number) => void
  personalTimelineItems: PersonalSessionItem[]
  filteredPersonalTimeline: PersonalSessionItem[]
  isLoading: boolean
}

export function PersonalTimeline({
  personalStats,
  personalFilter,
  setPersonalFilter,
  userDivisionName,
  hasDivision,
  days,
  setDays,
  personalTimelineItems,
  filteredPersonalTimeline,
  isLoading,
}: PersonalTimelineProps) {
  return (
    <>
      {/* Personal KPI Cards - Dynamic Streak, Turnout & Points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Streak */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Attendance Streak</span>
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {personalStats.currentStreak} {personalStats.currentStreak === 1 ? "Session" : "Sessions"}
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400/90 font-medium flex items-center gap-0.5">
              🔥 {personalStats.currentStreak > 0 ? "Active streak" : "Start a streak"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Best streak: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{personalStats.bestStreak}</strong> sessions in a row
          </div>
        </div>

        {/* Card 2: Personal Turnout Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">My Turnout Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400/80" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {personalStats.turnoutRate}%
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">
              {personalStats.attended} of {personalStats.total} sessions
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Overall presence in club & division sessions
          </div>
        </div>

        {/* Card 3: Punctuality Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">On-Time Rate</span>
            <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400/80" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {personalStats.onTimeRate}%
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">
              {personalStats.onTime} on-time arrivals
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {personalStats.late} late check-in{personalStats.late === 1 ? "" : "s"} (&gt;15 min delay)
          </div>
        </div>

        {/* Card 4: Attendance Points */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Attendance Points</span>
            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400/80" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              +{personalStats.totalPoints} pts
            </span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400/80 font-normal">
              Earned
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Credited toward your leaderboard score
          </div>
        </div>
      </div>

      {/* Personal Session Ledger Toolbar */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Scope Filter Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPersonalFilter("all")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                personalFilter === "all"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 font-medium"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
              )}
            >
              <TableIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>All My Sessions</span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-0.5">
                {personalTimelineItems.length}
              </span>
            </button>

            <button
              onClick={() => setPersonalFilter("club_wide")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                personalFilter === "club_wide"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 font-medium"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
              )}
            >
              <Globe className="w-3.5 h-3.5 text-purple-500" />
              <span>Club-Wide</span>
            </button>

            {hasDivision && (
              <button
                onClick={() => setPersonalFilter("division")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                  personalFilter === "division"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 font-medium"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                )}
              >
                <span>{userDivisionName}</span>
              </button>
            )}
          </div>

          {/* Days Filter */}
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
                <SelectItem value="14">Last 14 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="60">Last 60 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Personal Notion Database Table */}
        <div className="relative overflow-x-auto w-full pt-1">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-zinc-500">
              Loading your personal session ledger...
            </div>
          ) : filteredPersonalTimeline.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500">
              No sessions recorded for this timeframe.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
                  <th className="sticky left-0 z-20 bg-white dark:bg-[#0B0B0E] py-3.5 px-5 min-w-[280px] font-semibold">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                      <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                      <span className="font-semibold">Meeting / Session Topic</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[160px] font-semibold">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                      <span className="text-[13px]">🎯</span>
                      <span className="font-semibold">Scope</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                      <span className="text-[13px]">📅</span>
                      <span className="font-semibold">Date</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[140px] font-semibold text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-900 dark:text-white">
                      <span className="text-[13px]">⚪</span>
                      <span className="font-semibold">Status</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[120px] font-semibold text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-900 dark:text-white">
                      <span className="text-[13px]">📊</span>
                      <span className="font-semibold">Points</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[170px] font-semibold">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                      <span className="text-[13px]">⏰</span>
                      <span className="font-semibold">Check-In Standing</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonalTimeline.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Sticky Column 1: Session Title */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] py-4 px-5 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="font-normal text-sm text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </span>
                      </div>
                    </td>

                    {/* Column 2: Scope */}
                    <td className="py-4 px-5">
                      <span className="text-xs text-zinc-800 dark:text-white font-normal flex items-center gap-1.5">
                        {item.isClubWide && <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                        <span>{item.scope}</span>
                      </span>
                    </td>

                    {/* Column 3: Date */}
                    <td className="py-4 px-5 text-xs text-zinc-600 dark:text-zinc-300 font-normal">
                      {item.dateDisplay}
                    </td>

                    {/* Column 4: Status Badge */}
                    <td className="py-4 px-5 text-center">
                      {item.status === "present" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                          <span>Present</span>
                        </span>
                      )}
                      {item.status === "late" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-950 border border-amber-300/80 dark:bg-amber-300 dark:text-amber-950 dark:border-amber-400/40 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-950/80" />
                          <span>Late (+{item.delayMinutes}m)</span>
                        </span>
                      )}
                      {item.status === "absent" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-normal bg-purple-100 text-purple-900 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600/70 dark:bg-purple-400/80" />
                          <span>Absent</span>
                        </span>
                      )}
                    </td>

                    {/* Column 5: Points Awarded */}
                    <td className="py-4 px-5 text-center font-mono text-xs font-medium text-zinc-900 dark:text-zinc-200">
                      {item.pointsAwarded > 0 ? `+${item.pointsAwarded}` : "0"} pts
                    </td>

                    {/* Column 6: Check-In Info */}
                    <td className="py-4 px-5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.status === "present" && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>On-time check-in</span>
                        </span>
                      )}
                      {item.status === "late" && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Delay: {item.delayMinutes} mins (full points credited)
                        </span>
                      )}
                      {item.status === "absent" && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          No check-in recorded
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
