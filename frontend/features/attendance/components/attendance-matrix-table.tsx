"use client"

import type { AttendanceMatrixRow, AttendanceMatrixColumn } from "@/lib/api/types"
import type { SelectedCell } from "../types"

interface AttendanceMatrixTableProps {
  columns: AttendanceMatrixColumn[]
  filteredRows: AttendanceMatrixRow[]
  isLoading: boolean
  onSelectCell: (cell: SelectedCell) => void
}

export function AttendanceMatrixTable({
  columns,
  filteredRows,
  isLoading,
  onSelectCell,
}: AttendanceMatrixTableProps) {
  return (
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
                        onSelectCell({
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
  )
}
