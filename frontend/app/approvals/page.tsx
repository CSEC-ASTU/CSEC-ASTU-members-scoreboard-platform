"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty } from "@/components/ui/empty"
import { MemberAvatar, PointDelta, EventTypePill } from "@/components/csec/ui-bits"
import { useCurrentUser } from "@/components/user-context"
import { TASK_CATEGORY_LABELS } from "@/lib/csec-data"
import { Check, X, Inbox, ShieldCheck, Download, Filter } from "lucide-react"
import { pointEventsService, membersService, tasksService, divisionsService, type PointEventOut, type MemberOut, type TaskOut, type DivisionOut } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ApprovalsSkeleton } from "@/components/csec/skeletons"
import { useApprovals, useMembers, useTasks, useDivisions, useApproveClaimsMutation } from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"

export default function ApprovalsPage() {
  const { isAuthenticated } = useCurrentUser()
  const queryClient = useQueryClient()
  const { data: approvalsData, isLoading: approvalsLoading } = useApprovals(isAuthenticated)
  const { data: membersData, isLoading: membersLoading } = useMembers({ page_size: 100 })
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ page_size: 100 })
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const approveMutation = useApproveClaimsMutation()

  const queue = useMemo(() => approvalsData?.items || [], [approvalsData])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)

  const isLoading = approvalsLoading || membersLoading || tasksLoading || divisionsLoading

  const memberMap = useMemo(() => {
    const mObj: Record<string, MemberOut> = {}
    for (const m of membersData?.items || []) {
      mObj[m.id] = m
    }
    return mObj
  }, [membersData])

  const taskMap = useMemo(() => {
    const tObj: Record<string, TaskOut> = {}
    for (const t of tasksData?.items || []) {
      tObj[t.id] = t
    }
    return tObj
  }, [tasksData])

  const divisionsMap = useMemo(() => {
    const dObj: Record<string, string> = {}
    for (const d of divisionsData || []) {
      dObj[d.id] = d.name
    }
    return dObj
  }, [divisionsData])

  const [selectedDiv, setSelectedDiv] = useState<string>("all")

  const filteredQueue = useMemo(() => {
    if (selectedDiv === "all") return queue
    return queue.filter((e) => {
      const task = e.task_id ? taskMap[e.task_id] : null
      const divId = e.division_id || task?.division_id
      return divId === selectedDiv
    })
  }, [queue, selectedDiv, taskMap])

  const selectedIds = useMemo(() => Array.from(selected), [selected])
  const allFilteredSelected =
    filteredQueue.length > 0 && filteredQueue.every((e) => selected.has(e.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const e of filteredQueue) {
          next.delete(e.id)
        }
      } else {
        for (const e of filteredQueue) {
          next.add(e.id)
        }
      }
      return next
    })
  }

  function handleExportCsv() {
    const columns: CsvColumn<PointEventOut>[] = [
      { key: "id", label: "Event ID" },
      {
        key: (e) =>
          memberMap[e.member_id]?.full_name || e.member_name || "Unknown",
        label: "Submitter Name",
      },
      {
        key: (e) => memberMap[e.member_id]?.email || "N/A",
        label: "Submitter Email",
      },
      {
        key: (e) =>
          (e.task_id ? taskMap[e.task_id]?.title : null) ||
          e.task_title ||
          "Claim Duty",
        label: "Task Title",
      },
      {
        key: (e) => {
          const task = e.task_id ? taskMap[e.task_id] : null
          const divId = e.division_id || task?.division_id
          return (divId && divisionsMap[divId]) || "Club-Wide"
        },
        label: "Division",
      },
      { key: "points_delta", label: "Points" },
      { key: "event_type", label: "Event Type" },
      { key: "status", label: "Status" },
      { key: "reason", label: "Claim Reason" },
      { key: "created_at", label: "Submitted At" },
    ]
    exportToCsv("csec_pending_approvals_audit", columns, queue)
  }

  async function approve(ids: string[]) {
    if (ids.length === 0) return
    try {
      const res = await approveMutation.mutateAsync(ids)
      setSelected(new Set())
      if (res.failed && res.failed.length > 0) {
        toast.warning(`Approved with issues`, {
          description: `${res.succeeded.length} succeeded, ${res.failed.length} failed: ${res.failed.map((f) => f.detail).join("; ")}`,
        })
      } else {
        toast.success(`Approved ${ids.length} claim${ids.length > 1 ? "s" : ""}`, {
          description: "Points have been credited to the members' ledger.",
        })
      }
    } catch (err: any) {
      toast.error("Approval failed", { description: err.message })
    }
  }

  async function rejectSelected() {
    const idsToReject = rejectTargetId ? [rejectTargetId] : selectedIds
    if (idsToReject.length === 0 || !rejectReason.trim()) return
    try {
      const res = await pointEventsService.bulkReject(idsToReject, rejectReason.trim())
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      setRejectOpen(false)
      setRejectReason("")
      setRejectTargetId(null)
      setSelected(new Set())
      if (res.failed && res.failed.length > 0) {
        toast.warning(`Rejections processed with issues`, {
          description: `${res.succeeded.length} succeeded, ${res.failed.length} failed.`,
        })
      } else {
        toast.error(`Rejected ${idsToReject.length} claim${idsToReject.length > 1 ? "s" : ""}`, {
          description: "Rejection reason recorded to audit log.",
        })
      }
    } catch (err: any) {
      toast.error("Rejection failed", { description: err.message })
    }
  }

  return (
    <Layout>
      {isLoading && queue.length === 0 ? (
        <ApprovalsSkeleton />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Officer Approval Queue"
            description="Pending claims scoped to your division or delegated governance authority. Review and bulk-action items."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={queue.length === 0}
                className="h-9 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                Export Queue (CSV)
              </Button>
            }
          />

        {queue.length === 0 ? (
          <Empty className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                <Inbox className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Queue is Clear</p>
              <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                There are no pending claims requiring your review within your approval scope right now.
              </p>
            </div>
          </Empty>
        ) : (
          <div className="space-y-3">
            {/* Division Filter Chips */}
            {divisionsData && divisionsData.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <Button
                  variant={selectedDiv === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDiv("all")}
                  className="h-7 text-xs px-2.5"
                >
                  All Divisions ({queue.length})
                </Button>
                {divisionsData.map((div) => {
                  const count = queue.filter((e) => {
                    const task = e.task_id ? taskMap[e.task_id] : null
                    return (e.division_id || task?.division_id) === div.id
                  }).length
                  if (count === 0) return null
                  return (
                    <Button
                      key={div.id}
                      variant={selectedDiv === div.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedDiv(div.id)}
                      className="h-7 text-xs px-2.5"
                    >
                      {div.name} ({count})
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Bulk Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAllFiltered}
                />
                {selectedIds.length > 0
                  ? `${selectedIds.length} of ${filteredQueue.length} selected`
                  : `Select all filtered (${filteredQueue.length})`}
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.length === 0}
                  onClick={() => setRejectOpen(true)}
                >
                  <X className="mr-1 h-3.5 w-3.5 text-rose-500" /> Reject Selected
                </Button>
                <Button size="sm" disabled={selectedIds.length === 0} onClick={() => approve(selectedIds)}>
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Bulk Approve ({selectedIds.length})
                </Button>
              </div>
            </div>

            {/* Claim list cards */}
            <div className="space-y-2">
              {filteredQueue.map((e) => {
                const isSelected = selected.has(e.id)
                const submitter = memberMap[e.member_id]
                const submitterName = submitter?.full_name || e.member_name || "Club Member"
                const task = e.task_id ? taskMap[e.task_id] : null
                const taskTitle = task?.title || e.task_title || "Claim Duty"

                const eventDivisionName = (e.division_id && divisionsMap[e.division_id]) || (task?.division_id && divisionsMap[task.division_id]) || null

                return (
                  <div
                    key={e.id}
                    className={`rounded-xl border bg-white p-4 transition-colors dark:bg-zinc-900/40 ${
                      isSelected
                        ? "border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={isSelected}
                        onCheckedChange={() => toggle(e.id)}
                        aria-label={`Select claim from ${submitterName}`}
                      />
                      <MemberAvatar name={submitterName} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {submitterName}
                            </div>
                            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {submitter?.department ? `${submitter.department} · ` : ""}Claim
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {eventDivisionName ? (
                              <Badge variant="outline" className="text-[10px]">
                                {eventDivisionName}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-zinc-500">
                                Club-Wide
                              </Badge>
                            )}
                            <EventTypePill type={(e.event_type as any) ?? "claim"} />
                            <PointDelta value={e.points_delta} />
                          </div>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {taskTitle}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
                          &ldquo;{e.reason}&rdquo;
                        </p>

                        <div className="mt-3 flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(new Set([e.id]))
                              setRejectOpen(true)
                            }}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button size="sm" onClick={() => approve([e.id])}>
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve (+{e.points_delta})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Rejection Reason Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {selectedIds.length > 1 ? `${selectedIds.length} claims` : "claim"}</DialogTitle>
            <DialogDescription>
              Provide an accountable reason for the member. This will be stored in the ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Attendance not confirmed in division meeting log."
              value={rejectReason}
              onChange={(ev) => setRejectReason(ev.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectSelected} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
