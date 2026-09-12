"use client"

import { useMemo, useState, useEffect } from "react"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { useCurrentUser } from "@/components/user-context"
import { useAttendanceMatrix, useDivisions } from "@/lib/hooks/use-queries"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  CalendarCheck,
  Download,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  CalendarDays,
  Table as TableIcon,
  Flame,
  Award,
  Globe,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttendanceMatrixRow, AttendanceMatrixOut } from "@/lib/api/types"
import { DEMO_ATTENDANCE_MATRIX } from "./demo-data"

const EMPTY_MATRIX: AttendanceMatrixOut = {
  division_id: null,
  days: 30,
  start_date: "",
  end_date: "",
  columns: [],
  rows: [],
  kpi: {
    total_sessions: 0,
    total_members: 0,
    average_turnout_rate: 0,
    on_time_rate: 0,
    total_checkins: 0,
    total_late_checkins: 0,
  },
}

export default function AttendancePage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const { data: divisionsData } = useDivisions()

  const isExecutive = currentUser.role === "president" || currentUser.role === "vice_president"
  const isDivisionHead = currentUser.role === "division_head"
  const isOfficer = isExecutive || isDivisionHead
  const isRegularMember = isAuthenticated && !isOfficer

  // Division Heads default directly to their own division's matrix
  const [selectedDivision, setSelectedDivision] = useState<string>(() => {
    if (currentUser.role === "division_head" && currentUser.divisionId) {
      return currentUser.divisionId
    }
    return "all"
  })

  // Synchronize division if user context resolves asynchronously
  useEffect(() => {
    if (currentUser.role === "division_head" && currentUser.divisionId && selectedDivision === "all") {
      setSelectedDivision(currentUser.divisionId)
    }
  }, [currentUser.role, currentUser.divisionId])

  const [days, setDays] = useState<number>(30)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"all" | "by_division" | "punctuality">("all")
  const [executiveViewMode, setExecutiveViewMode] = useState<"matrix" | "comparison">("matrix")
  const [personalFilter, setPersonalFilter] = useState<"all" | "club_wide" | "division">("all")

  const [selectedCell, setSelectedCell] = useState<{
    memberName: string
    dateDisplay: string
    taskTitle: string
    status: "present" | "late" | "absent"
    delayMinutes: number | null
    claimedAt: string | null
    points: number
  } | null>(null)

  const divisions = divisionsData || []
  const userDivisionName =
    divisions.find((d) => d.id === currentUser.divisionId)?.name || currentUser.division || "Division"

  // Queries for officer admin matrix
  const { data: matrixData, isLoading } = useAttendanceMatrix(
    selectedDivision === "all" ? undefined : selectedDivision,
    days
  )

  // Queries for regular member personal attendance timeline (both club-wide + division)
  const { data: memberClubMatrix, isLoading: isLoadingMemberClub } = useAttendanceMatrix(
    undefined,
    days
  )
  const { data: memberDivMatrix, isLoading: isLoadingMemberDiv } = useAttendanceMatrix(
    currentUser.divisionId || undefined,
    days
  )

  // Strictly use live API data when authenticated
  const activeData: AttendanceMatrixOut = useMemo(() => {
    if (isAuthenticated) {
      return matrixData || EMPTY_MATRIX
    }

    // Guest / preview fallback
    if (matrixData && matrixData.rows && matrixData.rows.length > 0) {
      return matrixData
    }
    return DEMO_ATTENDANCE_MATRIX
  }, [isAuthenticated, matrixData])

  const columns = activeData.columns || []
  const allRows = activeData.rows || []
  const kpi = activeData.kpi

  // Filter rows based on search and active tab
  const filteredRows = useMemo(() => {
    let rows = allRows
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.division_name.toLowerCase().includes(q)
      )
    }

    if (activeTab === "punctuality") {
      rows = [...rows].sort((a, b) => b.stats.late_count - a.stats.late_count)
    }

    return rows
  }, [allRows, searchQuery, activeTab])

  // Regular Member Personal Timeline Items (Aggregated across Club-wide and their Division)
  const personalTimelineItems = useMemo(() => {
    if (!isRegularMember || !currentUser?.id) return []

    const items: Array<{
      id: string
      date: string
      dateDisplay: string
      title: string
      scope: string
      isClubWide: boolean
      status: "present" | "late" | "absent"
      delayMinutes: number | null
      pointsAwarded: number
      claimedAt: string | null
    }> = []

    // 1. Club-wide sessions
    if (memberClubMatrix) {
      const myRow = memberClubMatrix.rows.find((r) => r.member_id === currentUser.id)
      for (const col of memberClubMatrix.columns) {
        const s = myRow?.sessions[col.id]
        items.push({
          id: col.id,
          date: col.date,
          dateDisplay: col.date_display,
          title: col.task_title,
          scope: "Club-wide",
          isClubWide: true,
          status: s?.status || "absent",
          delayMinutes: s?.delay_minutes ?? null,
          pointsAwarded: s?.points_awarded ?? 0,
          claimedAt: s?.claimed_at ?? null,
        })
      }
    }

    // 2. Division sessions (if assigned to a division)
    if (memberDivMatrix && currentUser.divisionId) {
      const myRow = memberDivMatrix.rows.find((r) => r.member_id === currentUser.id)
      for (const col of memberDivMatrix.columns) {
        if (items.some((i) => i.id === col.id)) continue

        const s = myRow?.sessions[col.id]
        items.push({
          id: col.id,
          date: col.date,
          dateDisplay: col.date_display,
          title: col.task_title,
          scope: col.division_name || "Division",
          isClubWide: false,
          status: s?.status || "absent",
          delayMinutes: s?.delay_minutes ?? null,
          pointsAwarded: s?.points_awarded ?? 0,
          claimedAt: s?.claimed_at ?? null,
        })
      }
    }

    // Sort descending by date (newest first)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [isRegularMember, currentUser, memberClubMatrix, memberDivMatrix])

  // Filtered Personal Timeline
  const filteredPersonalTimeline = useMemo(() => {
    if (personalFilter === "club_wide") {
      return personalTimelineItems.filter((i) => i.isClubWide)
    }
    if (personalFilter === "division") {
      return personalTimelineItems.filter((i) => !i.isClubWide)
    }
    return personalTimelineItems
  }, [personalTimelineItems, personalFilter])

  // Personal Stats & Streak Computation
  const personalStats = useMemo(() => {
    const total = filteredPersonalTimeline.length
    const attended = filteredPersonalTimeline.filter((i) => i.status !== "absent").length
    const late = filteredPersonalTimeline.filter((i) => i.status === "late").length
    const onTime = attended - late
    const totalPoints = filteredPersonalTimeline.reduce((acc, i) => acc + i.pointsAwarded, 0)
    const turnoutRate = total > 0 ? Math.round((attended / total) * 100) : 0
    const onTimeRate = attended > 0 ? Math.round((onTime / attended) * 100) : 0

    // Streak calculation (chronological ascending: oldest to newest)
    const ascending = [...filteredPersonalTimeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    let currentStreak = 0
    for (let i = ascending.length - 1; i >= 0; i--) {
      if (ascending[i].status === "present" || ascending[i].status === "late") {
        currentStreak++
      } else {
        break
      }
    }

    let bestStreak = 0
    let tempStreak = 0
    for (const item of ascending) {
      if (item.status === "present" || item.status === "late") {
        tempStreak++
        if (tempStreak > bestStreak) bestStreak = tempStreak
      } else {
        tempStreak = 0
      }
    }

    return {
      total,
      attended,
      late,
      onTime,
      totalPoints,
      turnoutRate,
      onTimeRate,
      currentStreak,
      bestStreak,
    }
  }, [filteredPersonalTimeline])

  // CSV Export handler
  function handleExportCsv() {
    if (!matrixData && !activeData) return

    const exportCols: CsvColumn<AttendanceMatrixRow>[] = [
      { key: "full_name", label: "Member Name" },
      { key: "email", label: "Email" },
      { key: "division_name", label: "Division" },
      { key: (r) => `${r.stats.attendance_rate}%`, label: "Attendance Rate" },
      { key: (r) => r.stats.attended_count, label: "Sessions Attended" },
      { key: (r) => r.stats.late_count, label: "Late Count (>15m)" },
      ...columns.map((c) => ({
        key: (r: AttendanceMatrixRow) => {
          const s = r.sessions[c.id]
          if (!s) return "Absent"
          if (s.status === "late") return `Late (+${s.delay_minutes}m)`
          if (s.status === "present") return "Present"
          return "Absent"
        },
        label: `${c.date_display} (${c.task_title})`,
      })),
    ]

    exportToCsv("csec_attendance_matrix", exportCols, filteredRows)
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
        {/* =========================================================================
         * 1. REGULAR MEMBER VIEW: Personal Attendance Timeline & Streak Hub
         * ========================================================================= */}
        {isRegularMember ? (
          <>
            {/* Member Page Header */}
            <PageHeader
              title="My Attendance & Punctuality"
              description="Your verified session ledger, attendance streak, and personal punctuality standing."
            />

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
                    <span>Club-wide</span>
                  </button>

                  {currentUser.divisionId && (
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
                    <SelectTrigger className="h-7.5 text-xs w-[120px] bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
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
                {isLoadingMemberClub || isLoadingMemberDiv ? (
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

                          {/* Column 2: Scope (Plain Text without pill body) */}
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
        ) : (
          /* =========================================================================
           * 2. OFFICER & EXECUTIVE VIEW: Full Admin Matrix Table & Division Comparison
           * ========================================================================= */
          <>
            {/* Page Header */}
            <PageHeader
              title={
                isDivisionHead
                  ? `${userDivisionName} Attendance Matrix`
                  : "Attendance & Punctuality Matrix"
              }
              description={
                isDivisionHead
                  ? `Direct tracking matrix for ${userDivisionName} trainees and members.`
                  : "Centralized session ledger with automated 15-minute late check-in detection."
              }
            />

            {/* Top KPI Cards - Minimal, Calm & Adaptive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[11px] font-medium tracking-wide uppercase">Turnout Rate</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400/80" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {kpi ? `${kpi.average_turnout_rate}%` : "--"}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">Average attendance</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[11px] font-medium tracking-wide uppercase">Sessions Held</span>
                  <CalendarDays className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {kpi ? kpi.total_sessions : "--"}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {selectedDivision === "all" ? "Club-wide" : "Selected division"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[11px] font-medium tracking-wide uppercase">On-Time Rate</span>
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400/80" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {kpi ? `${kpi.on_time_rate}%` : "--"}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {kpi?.total_late_checkins ?? 0} late arrivals (&gt;15m)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.04] shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[11px] font-medium tracking-wide uppercase">Total Check-Ins</span>
                  <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {kpi ? kpi.total_checkins : "--"}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {kpi ? kpi.total_members : 0} members tracked
                  </span>
                </div>
              </div>
            </div>

            {/* Notion Database Section - Flat, Spacious & Borderless */}
            <div className="space-y-3">
              {/* Notion Views Toolbar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2">
                {/* View Tabs */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setExecutiveViewMode("matrix")
                      setActiveTab("all")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                      executiveViewMode === "matrix" && activeTab === "all"
                        ? "bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 font-medium"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                    )}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>{isDivisionHead ? "Division Members" : "All Members"}</span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-0.5">{filteredRows.length}</span>
                  </button>

                  <button
                    onClick={() => {
                      setExecutiveViewMode("matrix")
                      setActiveTab("by_division")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                      executiveViewMode === "matrix" && activeTab === "by_division"
                        ? "bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 font-medium"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                    )}
                  >
                    <span>By Division</span>
                  </button>

                  <button
                    onClick={() => {
                      setExecutiveViewMode("matrix")
                      setActiveTab("punctuality")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors",
                      executiveViewMode === "matrix" && activeTab === "punctuality"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300 font-medium"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400/80" />
                    <span>Punctuality Risk</span>
                  </button>

                  {/* Executive Side-by-Side Division Comparison Tab */}
                  {isExecutive && (
                    <button
                      onClick={() => setExecutiveViewMode("comparison")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal transition-colors ml-1",
                        executiveViewMode === "comparison"
                          ? "bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300 font-medium"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                      )}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Compare Divisions</span>
                    </button>
                  )}
                </div>

                {/* Filter Tools */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[180px]">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="Filter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7.5 pl-8 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200 rounded-md focus-visible:ring-1 focus-visible:ring-purple-500/40"
                    />
                  </div>

                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger className="h-7.5 text-xs w-[175px] bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
                      <SelectValue placeholder="All Divisions (Club-wide)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
                      <SelectItem value="all">All Divisions (Club-wide)</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                    <SelectTrigger className="h-7.5 text-xs w-[120px] bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
                      <SelectValue placeholder="Last 30 Days" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
                      <SelectItem value="14">Last 14 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="60">Last 60 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={filteredRows.length === 0}
                    className="h-7.5 px-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.04] rounded-md flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>

              {/* View 2A: Executive Division Comparison Table */}
              {executiveViewMode === "comparison" && isExecutive ? (
                <div className="relative overflow-x-auto w-full pt-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
                        <th className="py-3.5 px-5 min-w-[240px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                            <span className="font-semibold">Division</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-5 min-w-[180px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">🎯</span>
                            <span className="font-semibold">Scope</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-5 min-w-[140px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">⚡</span>
                            <span className="font-semibold">Quick Action</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Club-Wide Entry */}
                      <tr className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-5">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-purple-500" />
                            <span>Club-Wide All-Hands</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-xs text-zinc-800 dark:text-white font-normal">
                          General Club Membership
                        </td>
                        <td className="py-4 px-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDivision("all")
                              setExecutiveViewMode("matrix")
                            }}
                            className="h-7 text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700"
                          >
                            <span>Inspect Matrix</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>

                      {/* Division Entries */}
                      {divisions.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-5">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {d.name}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-xs text-zinc-800 dark:text-white font-normal">
                            Technical Track
                          </td>
                          <td className="py-4 px-5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDivision(d.id)
                                setExecutiveViewMode("matrix")
                              }}
                              className="h-7 text-xs flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                            >
                              <span>Inspect Matrix</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* View 2B: Native Notion Admin Matrix Table */
                <div className="relative overflow-x-auto w-full pt-1">
                  {isLoading ? (
                    <div className="py-20 text-center text-xs text-zinc-500">
                      Loading database records...
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <div className="py-20 text-center text-xs text-zinc-500">
                      No records found matching this filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      {/* Header Row - Subtle, Bold, Clean Notion Style */}
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
                          {/* Sticky Column 1: Member Name */}
                          <th className="sticky left-0 z-20 bg-white dark:bg-[#0B0B0E] py-3.5 px-5 min-w-[240px] font-semibold">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                              <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                              <span className="font-semibold">Member Name</span>
                            </div>
                          </th>

                          {/* Column 2: Division */}
                          <th className="py-3.5 px-5 min-w-[170px] font-semibold">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                              <span className="text-[13px]">🎯</span>
                              <span className="font-semibold">Division</span>
                            </div>
                          </th>

                          {/* Column 3: Attendance Rate */}
                          <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                              <span className="text-[13px]">📊</span>
                              <span className="font-semibold">Rate</span>
                            </div>
                          </th>

                          {/* Column 4: Late Count */}
                          <th className="py-3.5 px-5 min-w-[110px] font-semibold">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                              <span className="text-[13px]">⏰</span>
                              <span className="font-semibold">Late</span>
                            </div>
                          </th>

                          {/* Dynamic Date Columns */}
                          {columns.map((col) => (
                            <th
                              key={col.id}
                              className="py-3.5 px-5 min-w-[140px] font-semibold text-center"
                              title={`${col.task_title} (${col.division_name})`}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-zinc-900 dark:text-white font-bold">{col.date_display}</span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px] font-normal">
                                  {col.task_title}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      {/* Table Body - Generous 52-60px row height, no vertical borders, whisper-thin horizontal separator */}
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr
                            key={row.member_id}
                            className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors group"
                          >
                            {/* Sticky Member Name */}
                            <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] group-hover:bg-zinc-50 dark:group-hover:bg-[#101014] py-4 px-5 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-medium text-[11px] flex-shrink-0">
                                  {row.full_name.charAt(0)}
                                </div>
                                <div className="truncate max-w-[170px]">
                                  <span className="block text-sm text-zinc-900 dark:text-zinc-200 font-normal truncate">
                                    {row.full_name}
                                  </span>
                                  <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                    {row.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Division Name - Plain white text without body */}
                            <td className="py-4 px-5">
                              <span className="text-xs text-zinc-800 dark:text-white font-normal">
                                {row.division_name || "General"}
                              </span>
                            </td>

                            {/* Attendance Rate */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-zinc-100 dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-purple-600 dark:bg-purple-400 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, row.stats.attendance_rate)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-200">
                                  {row.stats.attendance_rate}%
                                </span>
                              </div>
                            </td>

                            {/* Late Count */}
                            <td className="py-4 px-5">
                              {row.stats.late_count > 0 ? (
                                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                  {row.stats.late_count}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">0</span>
                              )}
                            </td>

                            {/* Session Status Cells */}
                            {columns.map((col) => {
                              const cell = row.sessions[col.id]
                              const isPresent = cell && cell.status === "present"
                              const isLate = cell && cell.status === "late"

                              return (
                                <td
                                  key={col.id}
                                  className="py-4 px-5 text-center cursor-pointer transition-colors"
                                  onClick={() =>
                                    setSelectedCell({
                                      memberName: row.full_name,
                                      dateDisplay: col.date_display,
                                      taskTitle: col.task_title,
                                      status: cell ? cell.status : "absent",
                                      delayMinutes: cell ? cell.delay_minutes : null,
                                      claimedAt: cell ? cell.claimed_at : null,
                                      points: cell ? cell.points_awarded : 0,
                                    })
                                  }
                                >
                                  {/* Present: White body with black text in dark mode */}
                                  {isPresent && (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm hover:opacity-90 transition-opacity"
                                      title="Present & On-Time"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                                      <span>Present</span>
                                    </span>
                                  )}

                                  {/* Late: Laidback yellow body */}
                                  {isLate && (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-950 border border-amber-300/80 dark:bg-amber-300 dark:text-amber-950 dark:border-amber-400/40 shadow-sm hover:opacity-90 transition-opacity"
                                      title={`Checked in ${cell.delay_minutes}m after start (full points awarded)`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-950/80" />
                                      <span>Late (+{cell.delay_minutes}m)</span>
                                    </span>
                                  )}

                                  {/* Absent: Muted purple body with dark/soft purple text */}
                                  {(!cell || cell.status === "absent") && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-normal bg-purple-100 text-purple-900 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/30 hover:opacity-90 transition-opacity">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600/70 dark:bg-purple-400/80" />
                                      <span>Absent</span>
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Selected Cell Modal */}
        {selectedCell && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedCell(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.06] pb-2.5">
                <h3 className="font-normal text-zinc-800 dark:text-zinc-200 text-xs tracking-wide uppercase">
                  Session Check-In Details
                </h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500 block text-[11px]">Member</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium text-sm">{selectedCell.memberName}</span>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500 block text-[11px]">Session Date & Topic</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {selectedCell.dateDisplay} — {selectedCell.taskTitle}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-zinc-400 dark:text-zinc-500 block text-[11px] mb-1">Status</span>
                  {selectedCell.status === "present" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                      <span>Present (On Time)</span>
                    </span>
                  )}
                  {selectedCell.status === "late" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-950 border border-amber-300 dark:bg-amber-300 dark:text-amber-950 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-950/80" />
                      <span>Late Check-In (+{selectedCell.delayMinutes} mins)</span>
                    </span>
                  )}
                  {selectedCell.status === "absent" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-normal bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                      <span>Absent</span>
                    </span>
                  )}
                </div>
                {selectedCell.claimedAt && (
                  <div className="pt-1 text-[11px] text-zinc-500">
                    Timestamp: {new Date(selectedCell.claimedAt).toLocaleTimeString()}
                  </div>
                )}
                <div className="text-[11px] text-purple-600 dark:text-purple-300 font-medium">
                  Points Credited: +{selectedCell.points} pts
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
