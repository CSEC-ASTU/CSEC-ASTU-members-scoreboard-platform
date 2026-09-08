"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { Button } from "@/frontend/components/ui/button"
import { Checkbox } from "@/frontend/components/ui/checkbox"
import { Label } from "@/frontend/components/ui/label"
import { Textarea } from "@/frontend/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog"
import { Empty } from "@/frontend/components/ui/empty"
import { MemberAvatar, PointDelta, EventTypePill } from "@/frontend/components/csec/ui-bits"
import { useCurrentUser } from "@/frontend/components/user-context"
import { getApprovableEvents } from "@/lib/permissions"
import { POINT_EVENTS, getMember, TASK_CATEGORY_LABELS, type ClaimStatus } from "@/lib/csec-data"
import { Check, X, Inbox, ShieldCheck } from "lucide-react"

export default function ApprovalsPage() {
  const { currentUser } = useCurrentUser()
  const [resolved, setResolved] = useState<Record<string, ClaimStatus>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const queue = useMemo(
    () => getApprovableEvents(currentUser, POINT_EVENTS).filter((e) => !resolved[e.id]),
    [currentUser, resolved],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === queue.length ? new Set() : new Set(queue.map((e) => e.id))))
  }

  const selectedIds = [...selected].filter((id) => queue.some((e) => e.id === id))

  function approve(ids: string[]) {
    if (ids.length === 0) return
    setResolved((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, "approved" as const])),
    }))
    setSelected(new Set())
    toast.success(`Approved ${ids.length} claim${ids.length > 1 ? "s" : ""}`, {
      description: "Points have been credited to the members' ledger.",
    })
  }

  function confirmReject() {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is mandatory.")
      return
    }
    setResolved((prev) => ({
      ...prev,
      ...Object.fromEntries(selectedIds.map((id) => [id, "rejected" as const])),
    }))
    toast.error(`Rejected ${selectedIds.length} claim${selectedIds.length > 1 ? "s" : ""}`, {
      description: rejectReason.trim(),
    })
    setSelected(new Set())
    setRejectReason("")
    setRejectOpen(false)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Officer Approval Queue"
          description="Pending claims scoped to your division or delegated governance authority. Review and bulk-action items."
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
            {/* Bulk Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={queue.length > 0 && selected.size === queue.length}
                  onCheckedChange={toggleAll}
                />
                {selectedIds.length > 0 ? `${selectedIds.length} of ${queue.length} selected` : "Select all pending"}
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
              {queue.map((e) => {
                const member = getMember(e.memberId)
                const isSelected = selected.has(e.id)
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
                        aria-label={`Select claim from ${member?.name}`}
                      />
                      <MemberAvatar name={member?.name ?? "?"} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {member?.name}
                            </div>
                            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {member?.division} · {TASK_CATEGORY_LABELS[e.category] ?? e.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <EventTypePill type={e.eventType ?? "claim"} />
                            <PointDelta value={e.delta} />
                          </div>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {e.taskTitle}
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
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve (+{e.delta})
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
            <Button variant="destructive" onClick={confirmReject} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
