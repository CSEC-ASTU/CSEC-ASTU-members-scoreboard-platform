"use client"

import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_LABELS, type Role } from "@/lib/csec-data"
import type { DivisionOut } from "@/lib/api"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

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
      <SelectTrigger className="h-8 text-xs bg-white dark:bg-transparent border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 w-auto min-w-[130px] rounded-md">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[#121216] border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-200">
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labels ? labels[opt] || opt : opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface MembersFiltersProps {
  q: string
  setQ: (v: string) => void
  debouncedQ: string
  membersFetching: boolean
  division: string
  setDivision: (v: string) => void
  divisions: DivisionOut[]
  divisionMap: Record<string, string>
  department: string
  setDepartment: (v: string) => void
  departments: string[]
  year: string
  setYear: (v: string) => void
  years: (string | number)[]
  role: string
  setRole: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
}

export function MembersFilters({
  q,
  setQ,
  debouncedQ,
  membersFetching,
  division,
  setDivision,
  divisions,
  divisionMap,
  department,
  setDepartment,
  departments,
  year,
  setYear,
  years,
  role,
  setRole,
  statusFilter,
  setStatusFilter,
}: MembersFiltersProps) {
  return (
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
      <FilterSelect
        value={department}
        onChange={setDepartment}
        placeholder="All Departments"
        options={departments}
      />
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
  )
}
