"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { useBatchOfficerEventsMutation } from "@/lib/hooks/use-queries"
import type { MemberOut, DivisionOut, EventType } from "@/lib/api"

interface BatchAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: MemberOut[]
  divisions: DivisionOut[]
  onSuccess?: () => void
}

export function BatchAdjustmentDialog({
  open,
  onOpenChange,
  members,
  divisions,
  onSuccess,
}: BatchAdjustmentDialogProps) {
  const [search, setSearch] = useState("")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [eventType, setEventType] = useState<EventType>("manual_adjustment")
  const [pointsDelta, setPointsDelta] = useState<number>(15)
  const [reason, setReason] = useState("")

  const batchMutation = useBatchOfficerEventsMutation()

  const divMap = useMemo(() => new Map(divisions.map((d) => [d.id, d.name])), [divisions])

  // Filter members by search and division
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(search.toLowerCase()))

      const matchesDivision =
        selectedDivision === "all" ||
        m.division_id === selectedDivision ||
        m.secondary_division_id === selectedDivision

      return matchesSearch && matchesDivision
    })
  }, [members, search, selectedDivision])

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedMemberIds.has(m.id))

  function toggleSelectAllFiltered() {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        // Deselect all currently filtered
        for (const m of filteredMembers) {
          next.delete(m.id)
        }
      } else {
        // Select all currently filtered
        for (const m of filteredMembers) {
          next.add(m.id)
        }
      }
      return next
    })
  }

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleConfirm() {
    if (selectedMemberIds.size === 0) {
      toast.error("Please select at least one member.")
      return
    }

    if (!reason.trim()) {
      toast.error("Reason is mandatory for batch officer actions.")
      return
    }

    let delta = pointsDelta
    if (eventType === "normal_warning") {
      delta = -15
    } else if (eventType === "yellow_warning") {
      delta = -25
    } else if (eventType === "red_warning") {
      delta = -50
    }

    try {
      const res = await batchMutation.mutateAsync({
        member_ids: Array.from(selectedMemberIds),
        event_type: eventType,
        points_delta: delta,
        reason: reason.trim(),
      })

      if (res.failed && res.failed.length > 0) {
        toast.warning(
          `Batch completed: ${res.succeeded.length} succeeded, ${res.failed.length} failed.`,
          {
            description: `First error: ${res.failed[0]?.detail || "Unknown issue"}`,
          }
        )
      } else {
        toast.success(
          `Successfully applied batch action to ${res.succeeded.length} members!`
        )
      }

      // Reset and close
      setSelectedMemberIds(new Set())
      setReason("")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error("Failed to execute batch officer operation", {
        description: err.message,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-indigo-500" />
              Batch Award & Penalty Triage
            </DialogTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {selectedMemberIds.size} selected
            </Badge>
          </div>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Apply uniform points bonus, event awards, or disciplinary warning penalties to
            multiple members in a single step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Member Selection Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Filter members by name, email, or dept..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Showing {filteredMembers.length} of {members.length} members
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAllFiltered}
                className="h-7 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                {allFilteredSelected ? (
                  <>
                    <Square className="h-3.5 w-3.5 mr-1 text-zinc-400" /> Deselect Filtered
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Select All Filtered ({filteredMembers.length})
                  </>
                )}
              </Button>
            </div>

            {/* Scrollable Members List */}
            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/50">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No members match the search and division filter.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMemberIds.has(member.id)
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/30 font-medium"
                          : "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(member.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <div className="truncate">
                          <span className="text-zinc-900 dark:text-zinc-100">
                            {member.full_name}
                          </span>
                          <span className="text-zinc-400 text-[11px] ml-2">
                            ({member.email})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(member.division_name || (member.division_id ? divMap.get(member.division_id) : null)) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {member.division_name || (member.division_id ? divMap.get(member.division_id) : null)}
                          </span>
                        )}
                        <span className="font-mono text-zinc-500 text-[11px]">
                          {member.cycle_score ?? 0} pts
                        </span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Action Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Action Type</Label>
              <Select
                value={eventType}
                onValueChange={(val) => setEventType(val as EventType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                      Point Award / Custom Adjustment
                    </span>
                  </SelectItem>
                  <SelectItem value="normal_warning">
                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Normal Warning (-15 pts)
                    </span>
                  </SelectItem>
                  <SelectItem value="yellow_warning">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Yellow Warning (-25 pts)
                    </span>
                  </SelectItem>
                  <SelectItem value="red_warning">
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Red Warning (-50 pts)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Points Delta (per member)</Label>
              {eventType === "manual_adjustment" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                    placeholder="e.g. 15 or -10"
                  />
                  <span
                    className={`text-xs font-bold font-mono ${
                      pointsDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} pts
                  </span>
                </div>
              ) : (
                <div className="h-9 flex items-center px-3 border rounded-md text-xs font-mono font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-rose-600">
                  {eventType === "normal_warning"
                    ? "-15 pts"
                    : eventType === "yellow_warning"
                      ? "-25 pts"
                      : "-50 pts"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Reason / Justification <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="e.g., Active participation in Saturday Lab Hackathon or Absent from Division Workshop"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-zinc-500">
            {selectedMemberIds.size > 0 ? (
              <span>
                Applying to{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {selectedMemberIds.size}
                </strong>{" "}
                member{selectedMemberIds.size > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-amber-500">Select at least one member</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={batchMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={
                selectedMemberIds.size === 0 ||
                !reason.trim() ||
                batchMutation.isPending
              }
              className={
                eventType === "red_warning"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : eventType === "yellow_warning"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }
            >
              {batchMutation.isPending ? "Applying..." : "Execute Batch Action"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
