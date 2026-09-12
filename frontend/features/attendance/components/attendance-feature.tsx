"use client"

import { useMemo, useState, useEffect } from "react"
import { PageHeader } from "@/components/csec/page-header"
import { AttendanceSkeleton } from "@/components/csec/skeletons"
import { useCurrentUser } from "@/components/user-context"
import { useAttendanceMatrix, useDivisions } from "@/hooks/queries"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  CalendarCheck,
  Download,
  Search,
  AlertTriangle,
  Table as TableIcon,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttendanceMatrixRow, AttendanceMatrixOut } from "@/lib/api/types"
import { DEMO_ATTENDANCE_MATRIX } from "@/app/attendance/demo-data"
import type { SelectedCell, PersonalSessionItem, PersonalStats } from "../types"
import { AttendanceKPIs } from "./attendance-kpis"
import { PersonalTimeline } from "./personal-timeline"
import { DivisionComparisonView } from "./division-comparison-view"
import { AttendanceMatrixTable } from "./attendance-matrix-table"
import { SessionDetailDialog } from "./session-detail-dialog"

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

export function AttendanceFeature() {
  const { currentUser, isAuthenticated, isLoading: authLoading } = useCurrentUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

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

    const items: PersonalSessionItem[] = []

    // 1. Club-wide sessions
    if (memberClubMatrix) {
      const myRow = memberClubMatrix.rows.find((r) => r.member_id === currentUser.id)
      for (const col of memberClubMatrix.columns) {
        const s = myRow?.sessions[col.id]
        items.push({
          id: col.id,
          sessionId: col.id,
          date: col.date,
          dateDisplay: col.date_display,
          title: col.task_title,
          scope: "Club-wide",
          isClubWide: true,
          status: s?.status || "absent",
          delayMinutes: s?.delay_minutes ?? null,
          pointsAwarded: s?.points_awarded ?? 0,
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
          sessionId: col.id,
          date: col.date,
          dateDisplay: col.date_display,
          title: col.task_title,
          scope: col.division_name || "Division",
          isClubWide: false,
          status: s?.status || "absent",
          delayMinutes: s?.delay_minutes ?? null,
          pointsAwarded: s?.points_awarded ?? 0,
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
  const personalStats: PersonalStats & { bestStreak: number; late: number } = useMemo(() => {
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
      currentStreak,
      bestStreak,
      turnoutRate,
      onTimeRate,
      totalPoints,
      attended,
      total,
      onTime,
      late,
    }
  }, [filteredPersonalTimeline])

  const handleExportCsv = () => {
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

  if (!mounted || authLoading) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
        <AttendanceSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      {/* 1. REGULAR MEMBER VIEW: Personal Attendance Timeline & Streak Hub */}
      {isRegularMember ? (
        <>
          <PageHeader
            title="My Attendance & Punctuality"
            description="Your verified session ledger, attendance streak, and personal punctuality standing."
          />
          <PersonalTimeline
            personalStats={personalStats}
            personalFilter={personalFilter}
            setPersonalFilter={setPersonalFilter}
            userDivisionName={userDivisionName}
            hasDivision={Boolean(currentUser.divisionId)}
            days={days}
            setDays={setDays}
            personalTimelineItems={personalTimelineItems}
            filteredPersonalTimeline={filteredPersonalTimeline}
            isLoading={isLoadingMemberClub || isLoadingMemberDiv}
          />
        </>
      ) : (
        /* 2. OFFICER & EXECUTIVE VIEW: Full Admin Matrix Table & Division Comparison */
        <>
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

          <AttendanceKPIs kpi={kpi} selectedDivision={selectedDivision} />

          {/* Notion Database Section */}
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
                    className="h-8 pl-8 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200 rounded-md focus-visible:ring-1 focus-visible:ring-purple-500/40"
                  />
                </div>

                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="h-8 text-xs w-[175px] bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={filteredRows.length === 0}
                  className="h-8 px-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.04] rounded-md flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>

            {/* View 2A: Executive Division Comparison Table */}
            {executiveViewMode === "comparison" && isExecutive ? (
              <DivisionComparisonView
                divisions={divisions}
                onSelectDivision={(divId) => {
                  setSelectedDivision(divId)
                  setExecutiveViewMode("matrix")
                }}
              />
            ) : (
              /* View 2B: Native Notion Admin Matrix Table */
              <AttendanceMatrixTable
                columns={columns}
                filteredRows={filteredRows}
                isLoading={isLoading}
                onSelectCell={setSelectedCell}
              />
            )}
          </div>
        </>
      )}

      {/* Selected Cell Modal */}
      <SessionDetailDialog
        selectedCell={selectedCell}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  )
}
