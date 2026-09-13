"use client"

import { useState } from "react"
import type { SelectedCell } from "../types"
import { useCurrentUser } from "@/components/user-context"
import { useBatchOfficerEventsMutation } from "@/hooks/queries"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

interface SessionDetailDialogProps {
  selectedCell: SelectedCell | null
  onClose: () => void
}

export function SessionDetailDialog({ selectedCell, onClose }: SessionDetailDialogProps) {
  const { currentUser } = useCurrentUser()
  const batchMutation = useBatchOfficerEventsMutation()
  const [isPenalizing, setIsPenalizing] = useState(false)
  const [penaltyIssued, setPenaltyIssued] = useState(false)
  const [isExcused, setIsExcused] = useState(false)

  if (!selectedCell) return null

  const isOfficer =
    currentUser.role === "president" ||
    currentUser.role === "vice_president" ||
    currentUser.role === "division_head"

  const handleIssuePenalty = async () => {
    if (!selectedCell.memberId) {
      toast.error("Member ID is missing for this record.")
      return
    }

    setIsPenalizing(true)
    try {
      const res = await batchMutation.mutateAsync({
        member_ids: [selectedCell.memberId],
        event_type: "yellow_warning",
        points_delta: -25,
        reason: `Unexcused absence: ${selectedCell.taskTitle} (${selectedCell.dateDisplay})`,
      })

      if (res.failed && res.failed.length > 0) {
        toast.error(`Penalty failed: ${res.failed[0]?.detail || "Unknown error"}`)
      } else {
        toast.warning(`Issued 25-pt absence warning to ${selectedCell.memberName}`)
        setPenaltyIssued(true)
      }
    } catch (err: any) {
      toast.error("Failed to issue absence penalty", {
        description: err.message,
      })
    } finally {
      setIsPenalizing(false)
    }
  }

  const handleMarkExcused = () => {
    setIsExcused(true)
    toast.success(`Absence marked as officially excused for ${selectedCell.memberName}. No penalty applied.`)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 p-5 shadow-2xl space-y-4"
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

        {/* Officer No-Show Resolution Section */}
        {selectedCell.status === "absent" && isOfficer && (
          <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] space-y-2">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Officer Resolution
            </span>

            {penaltyIssued ? (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Absence warning (-25 pts) logged to member ledger.</span>
              </div>
            ) : isExcused ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Absence marked as officially excused.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleIssuePenalty}
                  disabled={isPenalizing}
                  className="w-full text-xs h-8 bg-red-600/90 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-1.5"
                >
                  {isPenalizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>Issue Absence Penalty (-25 pts)</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkExcused}
                  className="w-full text-xs h-8 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Mark Officially Excused
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
