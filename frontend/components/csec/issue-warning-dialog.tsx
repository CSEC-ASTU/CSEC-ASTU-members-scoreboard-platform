"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, ShieldAlert, Sliders, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { pointEventsService } from "@/lib/api"
import { type Member, type PointEvent, type Warning, type EventType } from "@/lib/csec-data"

interface IssueWarningDialogProps {
  member: Member
  officer: Member
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newEvent: PointEvent, newWarning?: Warning) => void
}

export function IssueWarningDialog({
  member,
  officer,
  open,
  onOpenChange,
  onSuccess,
}: IssueWarningDialogProps) {
  const [eventType, setEventType] = useState<EventType>("yellow_warning")
  const [reason, setReason] = useState("")
  const [customDelta, setCustomDelta] = useState<number>(-10)
  const [submitting, setSubmitting] = useState(false)

  const defaultDeltas: Record<EventType, number> = {
    normal_warning: -15,
    yellow_warning: -25,
    red_warning: -50,
    manual_adjustment: customDelta,
    claim: 10,
    layoff: -100,
  }

  async function handleConfirm() {
    if (!reason.trim()) {
      toast.error("A reason is mandatory for logging an officer adjustment or warning.")
      return
    }

    const delta =
      eventType === "manual_adjustment" ? Number(customDelta) : defaultDeltas[eventType]

    setSubmitting(true)
    try {
      await pointEventsService.submitOfficerAdjustment({
        member_id: member.id,
        event_type: eventType,
        points_delta: delta,
        reason: reason.trim(),
      })

      const newEvent: PointEvent = {
        id: `adj-${Date.now()}`,
        memberId: member.id,
        taskTitle:
          eventType === "normal_warning"
            ? "Normal Warning"
            : eventType === "yellow_warning"
              ? "Yellow Warning"
              : eventType === "red_warning"
                ? "Red Warning"
                : "Officer Manual Adjustment",
        category: "division_session",
        eventType,
        delta,
        status: "approved",
        reason: reason.trim(),
        approverId: officer.id,
        academicYear: 2026,
        createdAt: new Date().toISOString(),
      }

      let newWarning: Warning | undefined = undefined
      if (eventType === "normal_warning" || eventType === "yellow_warning" || eventType === "red_warning") {
        newWarning = {
          id: `w-${Date.now()}`,
          memberId: member.id,
          level: eventType === "normal_warning" ? "normal" : eventType === "yellow_warning" ? "yellow" : "red",
          reason: reason.trim(),
          issuedBy: officer.id,
          academicYear: 2026,
          createdAt: new Date().toISOString(),
        }
      }

      onSuccess(newEvent, newWarning)
      toast.success(
        eventType === "normal_warning"
          ? `Normal Warning (-15 pts) issued to ${member.name}`
          : eventType === "yellow_warning"
            ? `Yellow Warning (-25 pts) issued to ${member.name}`
            : eventType === "red_warning"
              ? `Red Warning (-50 pts) issued to ${member.name}`
              : `Manual point adjustment (${delta >= 0 ? "+" : ""}${delta} pts) applied to ${member.name}`,
      )

      setReason("")
      setCustomDelta(-10)
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Failed to submit officer adjustment", { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Issue Warning or Point Adjustment
          </DialogTitle>
          <DialogDescription>
            Record an accountable ledger entry for <span className="font-semibold text-zinc-900 dark:text-zinc-100">{member.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select
              value={eventType}
              onValueChange={(val) => setEventType(val as EventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal_warning">
                  ⚠️ Normal Warning (-15 pts) · Standard penalty log
                </SelectItem>
                <SelectItem value="yellow_warning">
                  🟡 Yellow Warning (-25 pts) · 1st pattern alert
                </SelectItem>
                <SelectItem value="red_warning">
                  🔴 Red Warning (-50 pts) · Last chance before layoff
                </SelectItem>
                <SelectItem value="manual_adjustment">
                  ⚙️ Manual Adjustment · Custom reward/penalty
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {eventType === "manual_adjustment" && (
            <div className="space-y-2">
              <Label htmlFor="custom-delta">Points Delta (Positive or Negative)</Label>
              <Input
                id="custom-delta"
                type="number"
                value={customDelta}
                onChange={(e) => setCustomDelta(Number(e.target.value))}
                placeholder="-15"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Officer discretion: set custom point addition or deduction.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="warning-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="warning-reason"
              rows={3}
              placeholder="e.g. Missed two consecutive mandatory division sessions without advance notice."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The reason is appended to the ledger and visible in the member&apos;s history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={eventType === "manual_adjustment" ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Confirm & Log Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
