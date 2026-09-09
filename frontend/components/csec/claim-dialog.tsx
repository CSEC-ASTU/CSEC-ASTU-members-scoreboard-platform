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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TASK_CATEGORY_LABELS, type TaskDef } from "@/lib/csec-data"
import { ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react"

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
  onSubmit: (payload: { reason: string; division_id?: string | null; verification_code?: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    task.division_id || memberDivisions[0]?.id || ""
  )

  const isSessionTask = task.category === "division_session"

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Only accept digits up to 6 characters
    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
    setVerificationCode(val)
  }

  function handleSubmit() {
    const finalReason = reason.trim() || (isSessionTask ? `Attended ${task.title}` : "")
    onSubmit({
      reason: finalReason,
      division_id: task.division_id || selectedDivisionId || null,
      verification_code: isSessionTask ? verificationCode.trim() : undefined,
    })
    setReason("")
    setVerificationCode("")
    setOpen(false)
  }

  const isSubmitDisabled = isSessionTask
    ? verificationCode.trim().length !== 6
    : !reason.trim()

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
            {isSessionTask && (
              <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5">
                Whiteboard Code Required
              </Badge>
            )}
          </div>
          <DialogDescription>
            {task.title} · {TASK_CATEGORY_LABELS[task.category]} · +{task.points} pts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 6-Digit Whiteboard Verification Code Entry for Session Attendance */}
          {isSessionTask && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-indigo-50/20 p-4 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-indigo-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="verification-code" className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Whiteboard Session Code
                </Label>
                {verificationCode.length === 6 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 6 digits entered
                  </span>
                )}
              </div>

              <div className="relative">
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="• • •   • • •"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  className="text-center font-mono text-2xl tracking-[0.5em] font-bold h-12 bg-white dark:bg-zinc-900 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                Enter the active 6-digit code written on the whiteboard during today&apos;s session. Each member can only claim this session code once.
              </p>
            </div>
          )}

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

          {/* Integrity & Physical Presence Warning */}
          <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Honor Code &amp; Presence Notice
              </span>
              <span>
                If you are not actually present in this session or did not complete this task, please do not submit this claim. Submitting false claims will result in negative point deductions, official warnings, or club dismissal.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason / Session Notes{" "}
              {isSessionTask ? (
                <span className="text-xs text-zinc-400 font-normal">(optional for verified attendance)</span>
              ) : (
                <span className="text-xs text-zinc-400 font-normal">(required)</span>
              )}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                isSessionTask
                  ? "e.g. Attended weekly sprint, worked on authentication module."
                  : "e.g. Completed week 5 sprint delivery or attended workshop."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={isSessionTask ? 2 : 3}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isSessionTask
                ? "Valid whiteboard codes auto-approve +10 pts instantly."
                : "Officers verify claims against division session and duty logs before approving."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isSessionTask ? "Verify Code & Claim (+10 pts)" : "Submit claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
