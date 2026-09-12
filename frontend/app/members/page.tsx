"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { MembersSkeleton } from "@/components/csec/skeletons"
import { DIVISIONS, ROLE_LABELS, type Role } from "@/lib/csec-data"
import { Search, ChevronRight, Users, ShieldAlert, Download, SlidersHorizontal, Radar, Loader2, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type MemberOut, type DivisionOut } from "@/lib/api"
import { useDivisions, useMembers } from "@/lib/hooks/use-queries"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { BatchAdjustmentDialog } from "@/components/csec/batch-adjustment-dialog"
import { InactivityRadar } from "@/components/csec/inactivity-radar"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer } from "@/lib/permissions"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

export default function MembersPage() {
  const router = useRouter()
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

  // Debounce search typing to avoid rapid queries and focus disruptions
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
  // Only show full skeleton on initial page load when no data exists yet
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
    () => [...new Set(members.map((m) => m.joining_year).filter(Boolean))].sort((a, b) => (b as number) - (a as number)),
    [members],
  )

  const rows = useMemo(() => {
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
        department: m.department || "Engineering",
        joiningYear: m.joining_year || 2026,
        role: m.role,
        isActive: m.is_active,
        cycleScore: m.cycle_score ?? 50,
        careerScore: m.career_score ?? 50,
        badge: m.badge ?? null,
        githubUrl: m.github_url,
        phone: m.phone_number,
        telegram: m.telegram_username,
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
      {isInitialLoading ? (
        <MembersSkeleton />
      ) : (
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
              className="h-7.5 text-xs gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Directory List ({rows.length})
            </Button>
            {officer && (
              <Button
                variant={viewMode === "radar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("radar")}
                className="h-7.5 text-xs gap-1.5 text-amber-600 dark:text-amber-400"
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
          ) : viewMode === "radar" ? (
            null
          ) : (
            <>
              {/* Filters - Clean Notion Table Controls */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative flex-1 sm:min-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Search by name, email or student ID..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-8 pl-8 pr-8 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200 rounded-md focus-visible:ring-1 focus-visible:ring-purple-500/40"
                  />
                  {(membersFetching || q !== debouncedQ) && (
                    <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-purple-500" />
                  )}
                </div>
                <FilterSelect
                  value={division}
                  onChange={setDivision}
                  placeholder="All Divisions"
                  options={divisions.map((d) => d.id)}
                  labels={divisionMap}
                />
                <FilterSelect value={department} onChange={setDepartment} placeholder="All Departments" options={departments} />
                <FilterSelect
                  value={year}
                  onChange={setYear}
                  placeholder="All Years"
                  options={years.map(String)}
                />
                <FilterSelect
                  value={role}
                  onChange={setRole}
                  placeholder="All Roles"
                  options={ROLES}
                  labels={ROLE_LABELS}
                />
                <FilterSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="All Statuses"
                  options={["active", "inactive"]}
                  labels={{ active: "Active", inactive: "Inactive / Laid Off" }}
                />
              </div>

              {/* Native Notion Database Table - Completely Unboxed, Borderless, Generous Spacing */}
              <div className={`relative overflow-x-auto w-full pt-1 transition-opacity duration-150 ${membersFetching ? "opacity-60" : "opacity-100"}`}>
                {rows.length === 0 ? (
                  <div className="py-20 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No members match your selected filters.
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
                        <th className="py-3.5 px-5 min-w-[180px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">🎯</span>
                            <span className="font-semibold">Division</span>
                          </div>
                        </th>

                        {/* Column 3: Department & Year */}
                        <th className="py-3.5 px-5 min-w-[170px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">🏛️</span>
                            <span className="font-semibold">Department</span>
                          </div>
                        </th>

                        {/* Column 4: Cycle Score */}
                        <th className="py-3.5 px-5 min-w-[140px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">📊</span>
                            <span className="font-semibold">Cycle Score</span>
                          </div>
                        </th>

                        {/* Column 5: Role & Status */}
                        <th className="py-3.5 px-5 min-w-[150px] font-semibold">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <span className="text-[13px]">🏷️</span>
                            <span className="font-semibold">Role & Status</span>
                          </div>
                        </th>

                        {/* Column 6: Contact (Officer only) */}
                        {officer && (
                          <th className="py-3.5 px-5 min-w-[160px] font-semibold">
                            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                              <span className="text-[13px]">📱</span>
                              <span className="font-semibold">Contact</span>
                            </div>
                          </th>
                        )}

                        <th className="py-3.5 px-4 w-10"></th>
                      </tr>
                    </thead>

                    {/* Table Body - Generous 52-60px row height, no vertical borders, whisper-thin horizontal separator */}
                    <tbody>
                      {rows.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => router.push(`/members/${m.id}`)}
                          className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        >
                          {/* Sticky Member Name */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] group-hover:bg-zinc-50 dark:group-hover:bg-[#101014] py-4 px-5 transition-colors">
                            <div className="flex items-center gap-3">
                              <MemberAvatar name={m.name} imageUrl={m.avatar} size={32} />
                              <div className="truncate max-w-[180px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    href={`/members/${m.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                                  >
                                    {m.name}
                                  </Link>
                                  {m.badge && <TierBadge tier={m.badge} />}
                                  {m.githubUrl && (
                                    <a
                                      href={m.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`GitHub: ${m.githubUrl}`}
                                      className="inline-flex items-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    >
                                      <Github className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                  {m.studentId ? `${m.studentId} · ` : ""}{m.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Division Name - Plain white text with no body */}
                          <td className="py-4 px-5">
                            <span className="text-xs text-zinc-800 dark:text-white font-normal">
                              {m.divisionsText}
                            </span>
                          </td>

                          {/* Department & Joining Year */}
                          <td className="py-4 px-5">
                            <div className="text-xs text-zinc-700 dark:text-zinc-300 font-normal">
                              {m.department}
                            </div>
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              Class of {m.joiningYear}
                            </div>
                          </td>

                          {/* Cycle & Career Score */}
                          <td className="py-4 px-5">
                            <div className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {m.cycleScore} pts
                            </div>
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              Career: {m.careerScore} pts
                            </div>
                          </td>

                          {/* Role & Status */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10">
                                {ROLE_LABELS[m.role]}
                              </span>
                              {!m.isActive && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                  <ShieldAlert className="h-3 w-3" /> Laid Off
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Contact (Officer only) */}
                          {officer && (
                            <td className="py-4 px-5">
                              <div className="text-xs text-zinc-700 dark:text-zinc-300 font-normal truncate max-w-[150px]">
                                {m.telegram ? (
                                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                                    @{m.telegram.replace(/^@+/, "")}
                                  </span>
                                ) : m.phone ? (
                                  <span>{m.phone}</span>
                                ) : (
                                  <span className="text-zinc-400 dark:text-zinc-600">—</span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Arrow link */}
                          <td className="py-4 px-4 text-right">
                            <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors inline-block" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {officer && (
            <BatchAdjustmentDialog
              open={batchDialogOpen}
              onOpenChange={setBatchDialogOpen}
              members={members}
              divisions={divisions}
            />
          )}
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
      <SelectTrigger className="h-8 w-full sm:w-[155px] text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 rounded-md">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
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
