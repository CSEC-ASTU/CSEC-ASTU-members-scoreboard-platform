"use client"

import { useState, useMemo } from "react"
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  TrendingDown,
  Filter,
  Search,
  UserCheck,
  Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MemberOut, DivisionOut } from "@/lib/api"

interface InactivityRadarProps {
  members: MemberOut[]
  divisions: DivisionOut[]
  onActionClick?: (member: MemberOut, actionType: "warning" | "bonus") => void
}

export function InactivityRadar({
  members,
  divisions,
  onActionClick,
}: InactivityRadarProps) {
  const [filterTier, setFilterTier] = useState<"all" | "critical" | "warning" | "low_points">("all")
  const [search, setSearch] = useState("")
  const [selectedDiv, setSelectedDiv] = useState<string>("all")

  const divMap = useMemo(() => new Map(divisions.map((d) => [d.id, d.name])), [divisions])

  // Classify members into tiers
  const categorized = useMemo(() => {
    const critical: MemberOut[] = []
    const warning: MemberOut[] = []
    const healthy: MemberOut[] = []

    for (const m of members) {
      const score = m.cycle_score ?? 0
      if (score <= 0) {
        critical.push(m)
      } else if (score <= 25) {
        warning.push(m)
      } else {
        healthy.push(m)
      }
    }

    return { critical, warning, healthy }
  }, [members])

  // Filter list
  const filteredList = useMemo(() => {
    let pool: MemberOut[] = []
    if (filterTier === "critical") {
      pool = categorized.critical
    } else if (filterTier === "warning") {
      pool = categorized.warning
    } else if (filterTier === "low_points") {
      pool = [...categorized.critical, ...categorized.warning]
    } else {
      pool = [...categorized.critical, ...categorized.warning, ...categorized.healthy]
    }

    return pool.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(search.toLowerCase()))

      const matchesDiv =
        selectedDiv === "all" ||
        m.division_id === selectedDiv ||
        m.secondary_division_id === selectedDiv

      return matchesSearch && matchesDiv
    })
  }, [filterTier, categorized, search, selectedDiv])

  return (
    <div className="space-y-6">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => setFilterTier("critical")}
          className={`cursor-pointer transition-all border ${
            filterTier === "critical"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-sm bg-zinc-50/80 dark:bg-white/[0.04] border-zinc-900 dark:border-zinc-100"
              : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Critical
              </span>
              <ShieldAlert className="h-4 w-4 text-zinc-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {categorized.critical.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-zinc-500">
            &le; 0 points — dismissal risk
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterTier("warning")}
          className={`cursor-pointer transition-all border ${
            filterTier === "warning"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-sm bg-zinc-50/80 dark:bg-white/[0.04] border-zinc-900 dark:border-zinc-100"
              : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Warning
              </span>
              <AlertTriangle className="h-4 w-4 text-zinc-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {categorized.warning.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-zinc-500">
            1 - 25 points — probationary
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterTier("all")}
          className={`cursor-pointer transition-all border ${
            filterTier === "all"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-sm bg-zinc-50/80 dark:bg-white/[0.04] border-zinc-900 dark:border-zinc-100"
              : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                In Good Standing
              </span>
              <CheckCircle2 className="h-4 w-4 text-zinc-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {categorized.healthy.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-zinc-500">
            &gt; 25 points — active &amp; compliant
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Compliance Rate
              </span>
              <UserCheck className="h-4 w-4 text-zinc-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {members.length > 0
                ? `${Math.round((categorized.healthy.length / members.length) * 100)}%`
                : "0%"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-zinc-500">
            {categorized.healthy.length} of {members.length} total members
          </CardContent>
        </Card>
      </div>

      {/* Radar Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search member name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={selectedDiv} onValueChange={setSelectedDiv}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-zinc-400" />
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((div) => (
                <SelectItem key={div.id} value={div.id}>
                  {div.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={filterTier === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTier("all")}
            className="h-8 text-xs px-2.5"
          >
            All Members ({members.length})
          </Button>
          <Button
            variant={filterTier === "critical" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTier("critical")}
            className="h-8 text-xs px-2.5"
          >
            Critical ({categorized.critical.length})
          </Button>
          <Button
            variant={filterTier === "warning" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTier("warning")}
            className="h-8 text-xs px-2.5"
          >
            Warning ({categorized.warning.length})
          </Button>
        </div>
      </div>

      {/* Triage Member Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full p-12 text-center border rounded-xl border-dashed border-zinc-200 dark:border-zinc-800">
            <CheckCircle2 className="h-8 w-8 mx-auto text-zinc-400 mb-2 opacity-80" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No members found in this status filter
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              All members match the compliance criteria or search query.
            </p>
          </div>
        ) : (
          filteredList.map((m) => {
            const score = m.cycle_score ?? 0
            const isCritical = score <= 0
            const isWarning = score > 0 && score <= 25
            const divName = m.division_name || (m.division_id ? divMap.get(m.division_id) : null)

            return (
              <Card
                key={m.id}
                className="relative overflow-hidden transition-all border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-white/20"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {m.full_name}
                      </h4>
                      <p className="text-xs text-zinc-500 truncate">{m.email}</p>
                    </div>
                    <Badge
                      className="text-[10px] font-mono shrink-0 bg-zinc-100 text-zinc-900 dark:bg-white/[0.06] dark:text-zinc-100 border border-zinc-200 dark:border-white/10"
                    >
                      {score} pts
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {divName ? (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
                        {divName}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">No division</span>
                    )}
                    {m.department && (
                      <span className="truncate text-zinc-400 text-[11px]">
                        • {m.department}
                      </span>
                    )}
                  </div>

                  {/* Status Banner */}
                  <div
                    className="text-[11px] p-2 rounded-md flex items-center gap-1.5 border border-zinc-200/60 dark:border-white/5 bg-zinc-50/80 dark:bg-white/[0.02] text-zinc-600 dark:text-zinc-400"
                  >
                    {isCritical ? (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>Action needed: Red warning or layoff evaluation</span>
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>At risk: 1 missing task will trigger warning status</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>Member active in club sessions</span>
                      </>
                    )}
                  </div>

                  {/* Officer Action Buttons */}
                  {onActionClick && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick(m, "warning")}
                        className="flex-1 h-7 text-xs border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1 text-zinc-400" />
                        Issue Warning
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick(m, "bonus")}
                        className="flex-1 h-7 text-xs border-zinc-200/80 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        <Award className="h-3 w-3 mr-1 text-zinc-400" />
                        Award Points
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
