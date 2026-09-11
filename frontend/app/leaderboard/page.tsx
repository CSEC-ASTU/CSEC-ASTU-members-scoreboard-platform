"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentUser } from "@/components/user-context"
import { DIVISIONS, ROLE_LABELS } from "@/lib/csec-data"
import { Trophy, Crown, Medal, Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { leaderboardService, type LeaderboardItemOut, type DivisionOut } from "@/lib/api"
import { LeaderboardSkeleton } from "@/components/csec/skeletons"
import { useDivisions } from "@/lib/hooks/use-queries"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"

export default function LeaderboardPage() {
  const { currentUser } = useCurrentUser()
  const [selectedDivision, setSelectedDivision] = useState<string>("all")
  const [academicYear, setAcademicYear] = useState<string>("2026")

  const isCurrentYear = academicYear === "2026"

  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const divisions: DivisionOut[] = divisionsData || []

  const divId = selectedDivision === "all" ? undefined : selectedDivision
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    isFetching: leaderboardFetching,
  } = useQuery({
    queryKey: ["leaderboard", academicYear, divId],
    queryFn: () =>
      isCurrentYear
        ? leaderboardService.getLeaderboard(divId)
        : leaderboardService.getLeaderboardHistory(Number(academicYear), divId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })

  const items = leaderboardData?.items || []
  const isInitialLoading = divisionsLoading || (leaderboardLoading && !leaderboardData)

  const divisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) {
      map[d.id] = d.name
    }
    return map
  }, [divisions])

  const currentRows = useMemo(() => items.map((item) => ({
    id: item.member_id,
    name: item.full_name,
    division: (item.division_id ? divisionMap[item.division_id] : null) || item.division_name || "General",
    displayScore: item.display_score,
    careerScore: item.career_score,
    badge: item.badge,
    rank: item.rank,
  })), [items, divisionMap])

  const podium = currentRows.slice(0, 3)
  const rest = currentRows.slice(3)

  function handleExportCsv() {
    const columns: CsvColumn<LeaderboardItemOut>[] = [
      { key: "rank", label: "Rank" },
      { key: "full_name", label: "Full Name" },
      {
        key: (item) =>
          (item.division_id ? divisionMap[item.division_id] : null) ||
          item.division_name ||
          "General",
        label: "Division",
      },
      { key: "display_score", label: "Cycle Score" },
      { key: "career_score", label: "Career Score" },
      { key: (item) => item.badge || "None", label: "Tier Badge" },
    ]
    exportToCsv(`csec_leaderboard_${academicYear}`, columns, items)
  }

  return (
    <Layout>
      {isInitialLoading ? (
        <LeaderboardSkeleton />
      ) : (
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Leaderboard &amp; Standings"
            description="Official member rankings by cycle score (capped at 2,500 pts). Graduate to tier badges beyond the ceiling."
          />

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={items.length === 0}
              className="h-9 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              Export Standings (CSV)
            </Button>

            {/* Academic Year Selector */}
            <div className="flex items-center gap-1.5">
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
        </div>

        {/* Division filter chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All divisions" active={selectedDivision === "all"} onClick={() => setSelectedDivision("all")} />
          {divisions.length > 0
            ? divisions.map((d) => (
                <FilterChip key={d.id} label={d.name} active={selectedDivision === d.id} onClick={() => setSelectedDivision(d.id)} />
              ))
            : DIVISIONS.map((d) => (
                <FilterChip key={d} label={d} active={selectedDivision === d} onClick={() => setSelectedDivision(d)} />
              ))}
        </div>

        <div className={`transition-opacity duration-150 ${leaderboardFetching ? "opacity-60" : "opacity-100"}`}>
        {isCurrentYear ? (
          <>
            {/* Top 3 Podium Cards */}
            {podium.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
                {/* Order: #2 (Left), #1 Champion (Center), #3 (Right) */}
                {[
                  { m: podium[1], rank: 2, order: "order-2 md:order-1", title: "Rank 2", border: "border-zinc-200/80 dark:border-white/[0.08]", bg: "bg-white dark:bg-zinc-900/40", badgeColor: "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/10" },
                  { m: podium[0], rank: 1, order: "order-1 md:order-2", title: "Champion", border: "border-zinc-900/30 dark:border-white/20 shadow-xl shadow-black/5 dark:shadow-black/30 md:-translate-y-2", bg: "bg-white dark:bg-zinc-900/60", badgeColor: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent", iconColor: "text-zinc-900 dark:text-zinc-100" },
                  { m: podium[2], rank: 3, order: "order-3 md:order-3", title: "Rank 3", border: "border-zinc-200/80 dark:border-white/[0.08]", bg: "bg-white dark:bg-zinc-900/40", badgeColor: "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/10" },
                ].map(({ m, rank, order, border, bg, badgeColor, iconColor }) => (
                  <div
                    key={m.id}
                    className={cn(
                      "relative rounded-2xl border p-6 flex flex-col items-center text-center transition-all duration-300 backdrop-blur-xl",
                      border,
                      bg,
                      order
                    )}
                  >
                    {/* Rank Badge Indicator */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {rank === 1 ? (
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border", badgeColor)}>
                          <Crown className="h-3.5 w-3.5 text-zinc-100 dark:text-zinc-900" /> #1 Champion
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border", badgeColor)}>
                          <Medal className="h-3.5 w-3.5 text-zinc-400" /> #{rank}
                        </span>
                      )}
                    </div>

                    <div className="relative my-2">
                      <MemberAvatar name={m.name} size={rank === 1 ? 76 : 64} />
                      {rank === 1 && (
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-zinc-900 dark:bg-zinc-100 p-1 text-white dark:text-zinc-900 shadow-md">
                          <Crown className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/members/${m.id}`}
                      className="mt-3 truncate text-base font-bold text-zinc-900 hover:underline dark:text-zinc-100 transition-colors"
                    >
                      {m.name}
                    </Link>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{m.division}</span>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className={cn("font-black tabular-nums tracking-tight", rank === 1 ? "text-3xl text-zinc-900 dark:text-zinc-50" : "text-2xl text-zinc-900 dark:text-zinc-100")}>
                        {m.displayScore}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">pts</span>
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-400">
                      Career: {m.careerScore} pts
                    </div>

                    {m.badge && <TierBadge tier={m.badge} className="mt-3" />}
                  </div>
                ))}
              </div>
            )}

            {/* Full ranked list */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
              <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <span>Rank &amp; Member</span>
                <span>Cycle Points</span>
              </div>
              {(podium.length < 3 ? currentRows : rest).map((m, i) => {
                const rank = podium.length < 3 ? i + 1 : i + 4
                const isMe = m.id === currentUser.id
                return (
                  <Link
                    key={m.id}
                    href={`/members/${m.id}`}
                    className={cn(
                      "flex items-center gap-3.5 px-5 py-4 transition-all duration-200",
                      i !== 0 && "border-t border-zinc-100 dark:border-white/[0.04]",
                      isMe
                        ? "bg-zinc-100/50 dark:bg-white/[0.04] border-l-2 border-l-zinc-900 dark:border-l-zinc-100"
                        : "hover:bg-zinc-50/80 dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                      #{rank}
                    </span>
                    <MemberAvatar name={m.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {m.name}
                        </span>
                        {isMe && (
                          <span className="bg-zinc-100 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                        {m.badge && <TierBadge tier={m.badge} />}
                      </div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {m.division}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                        <Trophy className="h-3.5 w-3.5 text-zinc-400" />
                        {m.displayScore} pts
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
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
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
            <div className="border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] px-5 py-3.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Archived Standings for Academic Year {academicYear}
            </div>
            {currentRows.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3.5 px-5 py-4",
                  i !== 0 && "border-t border-zinc-100 dark:border-white/[0.04]",
                )}
              >
                <span className="w-8 text-center text-sm font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                  #{m.rank}
                </span>
                <MemberAvatar name={m.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {m.name}
                    </span>
                    {m.badge && <TierBadge tier={m.badge} />}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {m.division}
                  </div>
                </div>
                <div className="text-right font-bold text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                  {m.displayScore} pts
                </div>
              </div>
            ))}
            {currentRows.length === 0 && (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No archived records found for academic year {academicYear}.
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      )}
    </Layout>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25"
          : "border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200",
      )}
    >
      {label}
    </button>
  )
}
