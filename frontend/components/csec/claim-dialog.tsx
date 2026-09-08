"use client"

import { useState, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog"
import { Button } from "@/frontend/components/ui/button"
import { Label } from "@/frontend/components/ui/label"
import { Textarea } from "@/frontend/components/ui/textarea"
import { TASK_CATEGORY_LABELS, type TaskDef } from "@/lib/csec-data"

export function ClaimDialog({
  task,
  trigger,
  onSubmit,
}: {
  task: TaskDef
  trigger: ReactNode
  onSubmit: (payload: { reason: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function handleSubmit() {
    onSubmit({ reason: reason.trim() })
    setReason("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a task claim</DialogTitle>
          <DialogDescription>
            {task.title} · {TASK_CATEGORY_LABELS[task.category]} · +{task.points} pts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Session Notes <span className="text-xs text-zinc-400 font-normal">(required)</span></Label>
            <Textarea
              id="reason"
              placeholder="e.g. Attended Week 5 session on dynamic programming with CP division."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Officers verify claims in person against session and duty records before approving.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reason.trim()}>
            Submit claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
