"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { MemberAvatar, TierBadge } from "@/frontend/components/csec/ui-bits"
import { Badge } from "@/frontend/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { useCurrentUser } from "@/frontend/components/user-context"
import {
  DIVISIONS,
  ROLE_LABELS,
  getLeaderboard,
  getHistoricalLeaderboard,
  PLATFORM_SETTINGS,
  type Division,
} from "@/lib/csec-data"
import { Trophy, Crown, Medal, Sparkles, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LeaderboardPage() {
  const { currentUser } = useCurrentUser()
  const [division, setDivision] = useState<Division | "all">("all")
  const [academicYear, setAcademicYear] = useState<string>(String(PLATFORM_SETTINGS.currentAcademicYear))

  const isCurrentYear = Number(academicYear) === PLATFORM_SETTINGS.currentAcademicYear

  const currentRows = useMemo(
    () => getLeaderboard(division === "all" ? undefined : division, Number(academicYear)),
    [division, academicYear],
  )

  const historicalRows = useMemo(
    () =>
      isCurrentYear
        ? []
        : getHistoricalLeaderboard(Number(academicYear), division === "all" ? undefined : division),
    [isCurrentYear, academicYear, division],
  )

  const podium = currentRows.slice(0, 3)
  const rest = currentRows.slice(3)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Leaderboard &amp; Standings"
            description="Official member rankings by cycle score (capped at 2,500 pts). Graduate to tier badges beyond the ceiling."
          />

          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger className="w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026" className="text-xs">
                  2026 (Active Cycle)
                </SelectItem>
                <SelectItem value="2025" className="text-xs">
                  2025 (Past Year)
                </SelectItem>
                <SelectItem value="2024" className="text-xs">
                  2024 (Past Year)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Division filter chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All divisions" active={division === "all"} onClick={() => setDivision("all")} />
          {DIVISIONS.map((d) => (
            <FilterChip key={d} label={d} active={division === d} onClick={() => setDivision(d)} />
          ))}
        </div>

        {isCurrentYear ? (
          <>
            {/* Podium */}
            {podium.length === 3 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[podium[1], podium[0], podium[2]].map((m, idx) => {
                  const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
                  const heights = { 1: "pt-2", 2: "pt-6", 3: "pt-8" }
                  const tone =
                    rank === 1
                      ? "text-amber-500"
                      : rank === 2
                        ? "text-zinc-400"
                        : "text-orange-700 dark:text-orange-400"
                  return (
                    <div key={m.id} className={cn("flex flex-col items-center", heights[rank as 1 | 2 | 3])}>
                      <div className="relative">
                        <MemberAvatar name={m.name} size={rank === 1 ? 72 : 56} />
                        {rank === 1 ? (
                          <Crown className="absolute -top-3.5 left-1/2 h-6 w-6 -translate-x-1/2 text-amber-500" />
                        ) : (
                          <Medal className={cn("absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2", tone)} />
                        )}
                      </div>
                      <Link
                        href={`/members/${m.id}`}
                        className="mt-2.5 truncate text-center text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {m.name}
                      </Link>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{m.division}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {m.displayScore}
                        </span>
                        <span className="text-xs text-zinc-400">pts</span>
                      </div>
                      {m.badge && <TierBadge tier={m.badge} className="mt-1" />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full ranked list */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              {(podium.length < 3 ? currentRows : rest).map((m, i) => {
                const rank = podium.length < 3 ? i + 1 : i + 4
                const isMe = m.id === currentUser.id
                return (
                  <Link
                    key={m.id}
                    href={`/members/${m.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      i !== 0 && "border-t border-zinc-100 dark:border-zinc-800",
                      isMe
                        ? "bg-zinc-50 dark:bg-zinc-800/40"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                    )}
                  >
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                      #{rank}
                    </span>
                    <MemberAvatar name={m.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {m.name}
                        </span>
                        {isMe && (
                          <Badge variant="secondary" className="text-[10px]">
                            You
                          </Badge>
                        )}
                        {m.badge && <TierBadge tier={m.badge} />}
                      </div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {m.division} · {ROLE_LABELS[m.role]}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        {m.displayScore} pts
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Career: {m.careerScore} pts
                      </div>
                    </div>
                  </Link>
                )
              })}
              {currentRows.length === 0 && (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No active members found for this filter.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Historical Archive View */
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Archived Standings for Academic Year {academicYear}
            </div>
            {historicalRows.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i !== 0 && "border-t border-zinc-100 dark:border-zinc-800",
                )}
              >
                <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                  #{s.finalRank}
                </span>
                <MemberAvatar name={s.member?.name ?? "Unknown"} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {s.member?.name}
                    </span>
                    {s.badgesEarned && <TierBadge tier={s.badgesEarned} />}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {s.member?.division}
                  </div>
                </div>
                <div className="text-right font-bold text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                  {s.finalScore} pts
                </div>
              </div>
            ))}
            {historicalRows.length === 0 && (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No archived records found for academic year {academicYear}.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400",
      )}
    >
      {label}
    </button>
  )
}
