"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentUser } from "@/components/user-context"
import { DIVISIONS } from "@/lib/csec-data"
import { Trophy, Crown, Medal, Calendar, Download, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { leaderboardService, type LeaderboardItemOut, type DivisionOut } from "@/lib/api"
import { LeaderboardSkeleton } from "@/components/csec/skeletons"
import { useDivisions } from "@/lib/hooks/use-queries"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"

export default function LeaderboardPage() {
  const router = useRouter()
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
              title="Leaderboard & Standings"
              description="Official member rankings by cycle score (capped at 2,500 pts). Graduate to tier badges beyond the ceiling."
            />

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={items.length === 0}
                className="h-8 gap-1.5 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                Export Standings (CSV)
              </Button>

              {/* Academic Year Selector */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="h-8 w-[155px] text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
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

          {/* Division filter chips - Notion clean tags */}
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All Divisions" active={selectedDivision === "all"} onClick={() => setSelectedDivision("all")} />
            {divisions.length > 0
              ? divisions.map((d) => (
                  <FilterChip key={d.id} label={d.name} active={selectedDivision === d.id} onClick={() => setSelectedDivision(d.id)} />
                ))
              : DIVISIONS.map((d) => (
                  <FilterChip key={d} label={d} active={selectedDivision === d} onClick={() => setSelectedDivision(d)} />
                ))}
          </div>

          <div className={`transition-opacity duration-150 ${leaderboardFetching ? "opacity-60" : "opacity-100"}`}>
            {isCurrentYear && podium.length >= 3 && (
              /* Top 3 Podium Cards - Editorial, Flat, Notion-Aligned */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 pb-6 items-end">
                {/* Order: #2 (Left), #1 Champion (Center), #3 (Right) */}
                {[
                  { m: podium[1], rank: podium[1]?.rank ?? 2, order: "order-2 md:order-1", title: `Rank ${podium[1]?.rank ?? 2}`, border: "border-zinc-200 dark:border-white/[0.06]", bg: "bg-zinc-50/50 dark:bg-white/[0.01]", badgeColor: "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10" },
                  { m: podium[0], rank: podium[0]?.rank ?? 1, order: "order-1 md:order-2", title: podium[0]?.rank === 1 ? "Champion" : `Rank ${podium[0]?.rank}`, border: "border-zinc-300 dark:border-white/15 md:-translate-y-1.5", bg: "bg-white dark:bg-[#101014]", badgeColor: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent", iconColor: "text-zinc-900 dark:text-zinc-100" },
                  { m: podium[2], rank: podium[2]?.rank ?? 3, order: "order-3 md:order-3", title: `Rank ${podium[2]?.rank ?? 3}`, border: "border-zinc-200 dark:border-white/[0.06]", bg: "bg-zinc-50/50 dark:bg-white/[0.01]", badgeColor: "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10" },
                ].map(({ m, rank, order, border, bg, badgeColor }) => (
                  <div
                    key={m.id}
                    onClick={() => router.push(`/members/${m.id}`)}
                    className={cn(
                      "rounded-xl border p-5 flex flex-col items-center text-center transition-all duration-200 cursor-pointer hover:border-zinc-400 dark:hover:border-white/30",
                      border,
                      bg,
                      order
                    )}
                  >
                    {/* Rank Badge Indicator */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      {rank === 1 ? (
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full border", badgeColor)}>
                          <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> #1 Champion
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium tracking-wide px-2.5 py-0.5 rounded-full border", badgeColor)}>
                          <Medal className="h-3.5 w-3.5 text-zinc-400" /> #{rank}
                        </span>
                      )}
                    </div>

                    <div className="relative my-2">
                      <MemberAvatar name={m.name} size={rank === 1 ? 68 : 56} />
                    </div>

                    <Link
                      href={`/members/${m.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 truncate text-sm font-bold text-zinc-900 hover:text-purple-600 dark:text-zinc-100 dark:hover:text-purple-400 transition-colors"
                    >
                      {m.name}
                    </Link>
                    <span className="text-xs text-zinc-800 dark:text-white font-normal mt-0.5">{m.division}</span>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className={cn("font-bold tabular-nums tracking-tight", rank === 1 ? "text-2xl text-zinc-900 dark:text-zinc-50" : "text-xl text-zinc-900 dark:text-zinc-100")}>
                        {m.displayScore}
                      </span>
                      <span className="text-xs text-zinc-400">pts</span>
                    </div>

                    <div className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                      Career: {m.careerScore} pts
                    </div>

                    {m.badge && <TierBadge tier={m.badge} className="mt-2.5" />}
                  </div>
                ))}
              </div>
            )}

            {/* Native Notion Database Table - Completely Unboxed, Borderless, Generous Spacing */}
            <div className="relative overflow-x-auto w-full pt-1">
              {currentRows.length === 0 ? (
                <div className="py-20 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  {isCurrentYear
                    ? "No active members found for this filter."
                    : `No archived records found for academic year ${academicYear}.`}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  {/* Header Row - Subtle, Bold, Clean Notion Style */}
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
                      {/* Column 1: Rank */}
                      <th className="py-3.5 px-5 w-20 font-semibold text-center">
                        <span className="font-semibold"># Rank</span>
                      </th>

                      {/* Column 2: Sticky Member Name */}
                      <th className="sticky left-0 z-20 bg-white dark:bg-[#0B0B0E] py-3.5 px-5 min-w-[240px] font-semibold">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                          <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                          <span className="font-semibold">Member Name</span>
                        </div>
                      </th>

                      {/* Column 3: Division */}
                      <th className="py-3.5 px-5 min-w-[180px] font-semibold">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                          <span className="text-[13px]">🎯</span>
                          <span className="font-semibold">Division</span>
                        </div>
                      </th>

                      {/* Column 4: Cycle Score */}
                      <th className="py-3.5 px-5 min-w-[140px] font-semibold">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                          <span className="text-[13px]">🏆</span>
                          <span className="font-semibold">Cycle Points</span>
                        </div>
                      </th>

                      {/* Column 5: Career Score */}
                      <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                          <span className="text-[13px]">📈</span>
                          <span className="font-semibold">Career Score</span>
                        </div>
                      </th>

                      {/* Column 6: Tier Badge */}
                      <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                          <span className="text-[13px]">🏅</span>
                          <span className="font-semibold">Tier Badge</span>
                        </div>
                      </th>

                      <th className="py-3.5 px-4 w-10"></th>
                    </tr>
                  </thead>

                  {/* Table Body - Generous 52-60px row height, no vertical borders, whisper-thin horizontal separator */}
                  <tbody>
                    {currentRows.map((m) => {
                      const rank = m.rank
                      const isMe = m.id === currentUser.id
                      return (
                        <tr
                          key={m.id}
                          onClick={() => router.push(`/members/${m.id}`)}
                          className={cn(
                            "border-b border-zinc-200/60 dark:border-white/[0.03] transition-colors group cursor-pointer",
                            isMe
                              ? "bg-purple-500/[0.04] dark:bg-purple-500/[0.06] hover:bg-purple-500/[0.08]"
                              : "hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]"
                          )}
                        >
                          {/* Rank Column */}
                          <td className="py-4 px-5 text-center">
                            {rank === 1 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                <Crown className="w-3.5 h-3.5 text-amber-500" /> #1
                              </span>
                            ) : rank === 2 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                                <Medal className="w-3.5 h-3.5 text-zinc-400" /> #2
                              </span>
                            ) : rank === 3 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                                <Medal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-600" /> #3
                              </span>
                            ) : (
                              <span className="font-semibold text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                                #{rank}
                              </span>
                            )}
                          </td>

                          {/* Sticky Member Name */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] group-hover:bg-zinc-50 dark:group-hover:bg-[#101014] py-4 px-5 transition-colors">
                            <div className="flex items-center gap-3">
                              <MemberAvatar name={m.name} size={32} />
                              <div className="truncate max-w-[180px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    href={`/members/${m.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                                  >
                                    {m.name}
                                  </Link>
                                  {isMe && (
                                    <span className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                      You
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Division Name - Plain white text with no body */}
                          <td className="py-4 px-5">
                            <span className="text-xs text-zinc-800 dark:text-white font-normal">
                              {m.division}
                            </span>
                          </td>

                          {/* Cycle Points */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                              <Trophy className="h-3.5 w-3.5 text-zinc-400" />
                              {m.displayScore} pts
                            </div>
                          </td>

                          {/* Career Score */}
                          <td className="py-4 px-5">
                            <span className="text-xs font-normal tabular-nums text-zinc-600 dark:text-zinc-400">
                              {m.careerScore} pts
                            </span>
                          </td>

                          {/* Tier Badge */}
                          <td className="py-4 px-5">
                            {m.badge ? (
                              <TierBadge tier={m.badge} />
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Arrow link */}
                          <td className="py-4 px-4 text-right">
                            <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors inline-block" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
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
        "rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 border",
        active
          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-none"
          : "border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
      )}
    >
      {label}
    </button>
  )
}
