"use client"

import { CheckCircle2, CalendarDays, Clock, Users } from "lucide-react"
import type { AttendanceMatrixKPI } from "@/lib/api/types"

interface AttendanceKPIsProps {
  kpi: AttendanceMatrixKPI | null | undefined
  selectedDivision: string
}

export function AttendanceKPIs({ kpi, selectedDivision }: AttendanceKPIsProps) {
  return (
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
  )
}
