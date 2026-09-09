"use client"

import { useState, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TASK_CATEGORY_LABELS, type TaskDef } from "@/lib/csec-data"

export function ClaimDialog({
  task,
  taskDivisionName,
  memberDivisions = [],
  trigger,
  onSubmit,
}: {
  task: TaskDef & { division_id?: string | null }
  taskDivisionName?: string | null
  memberDivisions?: { id: string; name: string }[]
  trigger: ReactNode
  onSubmit: (payload: { reason: string; division_id?: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    task.division_id || memberDivisions[0]?.id || ""
  )

  function handleSubmit() {
    onSubmit({
      reason: reason.trim(),
      division_id: task.division_id || selectedDivisionId || null,
    })
    setReason("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Submit a task claim</DialogTitle>
            {taskDivisionName ? (
              <Badge variant="outline" className="text-xs">
                {taskDivisionName}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Club-Wide
              </Badge>
            )}
          </div>
          <DialogDescription>
            {task.title} · {TASK_CATEGORY_LABELS[task.category]} · +{task.points} pts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* If club-wide task and member belongs to 2 divisions, let them pick attribution */}
          {!task.division_id && memberDivisions.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="attribution-division" className="text-xs">
                Credit Claim to Division
              </Label>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                <SelectTrigger id="attribution-division">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {memberDivisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                You are enrolled in multiple divisions. Choose which division activity record to attribute this to.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason / Session Notes <span className="text-xs text-zinc-400 font-normal">(required)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g. Completed week 5 sprint delivery or attended workshop."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Officers verify claims against division session and duty logs before approving.
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

