"use client"

import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/csec/page-header"
import { MembersSkeleton } from "@/components/csec/skeletons"
import { DIVISIONS, ROLE_LABELS, type Role } from "@/lib/csec-data"
import { Users, Download, SlidersHorizontal, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type MemberOut, type DivisionOut } from "@/lib/api"
import { useDivisions, useMembers } from "@/hooks/queries"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { BatchAdjustmentDialog } from "@/components/csec/batch-adjustment-dialog"
import { InactivityRadar } from "@/components/csec/inactivity-radar"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer } from "@/lib/permissions"
import type { MemberRowItem } from "../types"
import { MembersFilters } from "./members-filters"
import { MembersTable } from "./members-table"

export function MembersFeature() {
  const { currentUser } = useCurrentUser()
  const officer = currentUser.role !== "member" && isOfficer(currentUser)
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [division, setDivision] = useState("all")
  const [department, setDepartment] = useState("all")
  const [year, setYear] = useState("all")
  const [role, setRole] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"directory" | "radar">("directory")
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)

  // Debounce search typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q)
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const divisions: DivisionOut[] = divisionsData || []

  const {
    data: membersData,
    isLoading: membersLoading,
    isFetching: membersFetching,
  } = useMembers({
    division_id: division !== "all" ? division : undefined,
    role: role !== "all" ? (role as Role) : undefined,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    search: debouncedQ.trim() || undefined,
  })

  const members: MemberOut[] = membersData?.items || []
  const isInitialLoading = divisionsLoading || (membersLoading && !membersData)

  const divisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) {
      map[d.id] = d.name
    }
    return map
  }, [divisions])

  const departments = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean) as string[])].sort(),
    [members],
  )
  const years = useMemo(
    () => [...new Set(members.map((m) => m.joining_year).filter(Boolean) as number[])].sort((a, b) => b - a),
    [members],
  )

  const rows: MemberRowItem[] = useMemo(() => {
    let list = members
    if (department !== "all") {
      list = list.filter((m) => m.department === department)
    }
    if (year !== "all") {
      list = list.filter((m) => String(m.joining_year) === year)
    }
    return list.map((m) => {
      const primary = (m.division_id ? divisionMap[m.division_id] : null) || "General"
      const secondary = m.secondary_division_id ? divisionMap[m.secondary_division_id] : null
      return {
        id: m.id,
        name: m.full_name,
        email: m.email,
        avatar: m.profile_image_url,
        division: primary,
        secondaryDivision: secondary,
        divisionsText: secondary ? `${primary} + ${secondary}` : primary,
        department: m.department,
        joiningYear: m.joining_year,
        role: m.role,
        isActive: m.is_active,
        cycleScore: m.cycle_score ?? 0,
        displayScore: m.display_score ?? 0,
        careerScore: m.career_score ?? 0,
        badge: m.badge,
        phoneNumber: m.phone_number,
        githubUrl: m.github_url,
        telegramUsername: m.telegram_username,
        studentId: m.student_id,
      }
    })
  }, [members, divisionMap, department, year])

  function handleExportCsv() {
    if (!officer) return
    const columns: CsvColumn<MemberOut>[] = [
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Personal Email" },
      { key: (m) => m.student_id || "N/A", label: "Student ID" },
      { key: (m) => m.phone_number || "N/A", label: "Phone Number" },
      { key: (m) => ROLE_LABELS[m.role as Role] || m.role, label: "Role" },
      { key: (m) => (m.division_id ? divisionMap[m.division_id] : "None"), label: "Primary Division" },
      { key: (m) => (m.secondary_division_id ? divisionMap[m.secondary_division_id] : "None"), label: "Secondary Division" },
      { key: (m) => m.department || "N/A", label: "Department" },
      { key: (m) => m.joining_year || "N/A", label: "Joining Year" },
      { key: (m) => (m.telegram_username ? `@${m.telegram_username.replace(/^@+/, '')}` : "N/A"), label: "Telegram Handle" },
      { key: (m) => m.github_url || "N/A", label: "GitHub Profile" },
      { key: (m) => m.cycle_score ?? 0, label: "Total Points" },
      { key: (m) => (m.is_active ? "Active" : "Laid Off / Inactive"), label: "Status" },
    ]
    exportToCsv("csec_astu_members_roster", columns, members)
  }

  if (isInitialLoading) {
    return <MembersSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members Directory"
        description={`${members.length} members registered across ${DIVISIONS.length} divisions.`}
        action={
          officer ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 gap-1.5 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                Export Roster (CSV)
              </Button>
              <Button
                size="sm"
                onClick={() => setBatchDialogOpen(true)}
                className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium shadow-none"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Batch Adjust Points
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* View Mode Tabs — Inactivity Radar is officer-only */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/[0.08] pb-2">
        <Button
          variant={viewMode === "directory" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("directory")}
          className="h-8 text-xs gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Directory List ({rows.length})
        </Button>
        {officer && (
          <Button
            variant={viewMode === "radar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("radar")}
            className="h-8 text-xs gap-1.5 text-amber-600 dark:text-amber-400"
          >
            <Radar className="h-3.5 w-3.5" />
            Inactivity & Warning Radar
          </Button>
        )}
      </div>

      {viewMode === "radar" && officer ? (
        <InactivityRadar
          members={members}
          divisions={divisions}
          onActionClick={() => setBatchDialogOpen(true)}
        />
      ) : (
        <>
          {/* Filters - Clean Notion Table Controls */}
          <MembersFilters
            q={q}
            setQ={setQ}
            debouncedQ={debouncedQ}
            membersFetching={membersFetching}
            division={division}
            setDivision={setDivision}
            divisions={divisions}
            divisionMap={divisionMap}
            department={department}
            setDepartment={setDepartment}
            departments={departments}
            year={year}
            setYear={setYear}
            years={years}
            role={role}
            setRole={setRole}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          {/* Native Notion Database Table */}
          <MembersTable
            rows={rows}
            officer={officer}
            membersFetching={membersFetching}
          />
        </>
      )}

      {/* Batch Adjust Modal */}
      {officer && (
        <BatchAdjustmentDialog
          open={batchDialogOpen}
          onOpenChange={setBatchDialogOpen}
          members={members}
          divisions={divisions}
        />
      )}
    </div>
  )
}
