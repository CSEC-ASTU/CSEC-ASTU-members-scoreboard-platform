"use client"

import type { SelectedCell } from "../types"

interface SessionDetailDialogProps {
  selectedCell: SelectedCell | null
  onClose: () => void
}

export function SessionDetailDialog({ selectedCell, onClose }: SessionDetailDialogProps) {
  if (!selectedCell) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
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
            onClick={onClose}
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
  )
}
