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
import { Search, ChevronRight, Users, ShieldAlert } from "lucide-react"
import { type MemberOut, type DivisionOut } from "@/lib/api"
import { useDivisions, useMembers } from "@/lib/hooks/use-queries"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

export default function MembersPage() {
  const [q, setQ] = useState("")
  const [division, setDivision] = useState("all")
  const [department, setDepartment] = useState("all")
  const [year, setYear] = useState("all")
  const [role, setRole] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

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

  return (
    <Layout>
      {isLoading && members.length === 0 ? (
        <MembersSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="Members Directory"
          description={`${members.length} members registered across ${DIVISIONS.length} divisions.`}
        />

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
