"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { MembersSkeleton } from "@/components/csec/skeletons"
import { Badge } from "@/components/ui/badge"
import { DIVISIONS, ROLE_LABELS, type Role } from "@/lib/csec-data"
import { Search, ChevronRight, Users, ShieldAlert, Download, SlidersHorizontal, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type MemberOut, type DivisionOut } from "@/lib/api"
import { useDivisions, useMembers } from "@/lib/hooks/use-queries"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { BatchAdjustmentDialog } from "@/components/csec/batch-adjustment-dialog"
import { InactivityRadar } from "@/components/csec/inactivity-radar"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

export default function MembersPage() {
  const [q, setQ] = useState("")
  const [division, setDivision] = useState("all")
  const [department, setDepartment] = useState("all")
  const [year, setYear] = useState("all")
  const [role, setRole] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"directory" | "radar">("directory")
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)

  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const divisions: DivisionOut[] = divisionsData || []

  const { data: membersData, isLoading: membersLoading } = useMembers({
    division_id: division !== "all" ? division : undefined,
    role: role !== "all" ? (role as Role) : undefined,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    search: q.trim() || undefined,
  })

  const members: MemberOut[] = membersData?.items || []
  const isLoading = membersLoading || divisionsLoading

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
    () => [...new Set(members.map((m) => m.joining_year).filter(Boolean))].sort((a, b) => (b as number) - (a as number)),
    [members],
  )

  const rows = useMemo(() => {
    return members.map((m) => {
      const primary = (m.division_id ? divisionMap[m.division_id] : null) || "General"
      const secondary = m.secondary_division_id ? divisionMap[m.secondary_division_id] : null
      return {
        id: m.id,
        name: m.full_name,
        email: m.email,
        division: primary,
        secondaryDivision: secondary,
        divisionsText: secondary ? `${primary} + ${secondary}` : primary,
        department: m.department || "Engineering",
        joiningYear: m.joining_year || 2026,
        role: m.role,
        isActive: m.is_active,
        cycleScore: m.cycle_score ?? 50,
        careerScore: m.career_score ?? 50,
        badge: m.badge ?? null,
      }
    })
  }, [members, divisionMap])

  function handleExportCsv() {
    const columns: CsvColumn<MemberOut>[] = [
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Personal Email" },
      { key: (m) => m.student_id || "N/A", label: "Student ID" },
      { key: (m) => m.phone_number || "N/A", label: "Phone Number" },
      { key: (m) => ROLE_LABELS[m.role] || m.role, label: "Role" },
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

  return (
    <Layout>
      {isLoading && members.length === 0 ? (
        <MembersSkeleton />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Members Directory"
            description={`${members.length} members registered across ${DIVISIONS.length} divisions.`}
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-9 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  Export Roster (CSV)
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBatchDialogOpen(true)}
                  className="h-9 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Batch Award / Penalize
                </Button>
              </div>
            }
          />

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Button
              variant={viewMode === "directory" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("directory")}
              className="h-8 text-xs gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Directory List ({rows.length})
            </Button>
            <Button
              variant={viewMode === "radar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("radar")}
              className="h-8 text-xs gap-1.5 text-amber-600 dark:text-amber-400"
            >
              <Radar className="h-3.5 w-3.5" />
              Inactivity & Warning Radar
            </Button>
          </div>

          {viewMode === "radar" ? (
            <InactivityRadar
              members={members}
              divisions={divisions}
              onActionClick={() => setBatchDialogOpen(true)}
            />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative flex-1 sm:min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Search by name or email"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <FilterSelect
                  value={division}
                  onChange={setDivision}
                  placeholder="All divisions"
                  options={divisions.map((d) => d.id)}
                  labels={divisionMap}
                />
                <FilterSelect value={department} onChange={setDepartment} placeholder="All departments" options={departments} />
                <FilterSelect
                  value={year}
                  onChange={setYear}
                  placeholder="All years"
                  options={years.map(String)}
                />
                <FilterSelect
                  value={role}
                  onChange={setRole}
                  placeholder="All roles"
                  options={ROLES}
                  labels={ROLE_LABELS}
                />
                <FilterSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="All statuses"
                  options={["active", "inactive"]}
                  labels={{ active: "Active", inactive: "Inactive / Laid off" }}
                />
              </div>

              {/* Member list */}
              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                {rows.length === 0 && (
                  <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No members match your selected filters.
                  </div>
                )}
                {rows.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/members/${m.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                      i !== 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                    }`}
                  >
                    <MemberAvatar name={m.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</span>
                        {m.badge && <TierBadge tier={m.badge} />}
                        {!m.isActive && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                            <ShieldAlert className="h-3 w-3" /> Laid Off
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {m.divisionsText} · {m.department} · Joined {m.joiningYear}
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <div className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {m.cycleScore} pts
                      </div>
                      <div className="text-[11px] text-zinc-400">Career: {m.careerScore} pts</div>
                    </div>

                    <Badge variant={m.role === "member" ? "secondary" : "default"} className="hidden shrink-0 sm:inline-flex text-xs">
                      {ROLE_LABELS[m.role]}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </>
          )}

          <BatchAdjustmentDialog
            open={batchDialogOpen}
            onOpenChange={setBatchDialogOpen}
            members={members}
            divisions={divisions}
          />
        </div>
      )}
    </Layout>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  labels,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: string[]
  labels?: Record<string, string>
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[170px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
