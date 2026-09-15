"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Award,
  Users,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { CertificateTemplate } from "../types"

interface LumaIngestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: CertificateTemplate[]
  onSuccess?: () => void
}

interface AttendeePreview {
  row_index: number
  name: string
  email: string | null
  is_member: boolean
  member_id: string | null
  member_student_id: string | null
  member_division_name: string | null
  checked_in: boolean
  custom_attributes: Record<string, any>
}

interface PreviewData {
  total_rows: number
  checked_in_rows: number
  detected_members: number
  detected_externals: number
  detected_columns: string[]
  mapped_columns: Record<string, string>
  attendees: AttendeePreview[]
}

export function LumaIngestDialog({
  open,
  onOpenChange,
  templates,
  onSuccess,
}: LumaIngestDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>("")
  const [isParsing, setIsParsing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // Form selections
  const [events, setEvents] = useState<Array<{ id: string; title: string; points_reward: number; division_id: string | null }>>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "")
  const [certificateTitle, setCertificateTitle] = useState<string>("")
  const [pointsReward, setPointsReward] = useState<number>(20)
  const [awardPoints, setAwardPoints] = useState<boolean>(true)
  const [mintCertificates, setMintCertificates] = useState<boolean>(true)

  // Preview data
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [resultData, setResultData] = useState<{
    points_awarded_count: number
    certificates_minted_count: number
    members_awarded: string[]
    certificate_codes: string[]
  } | null>(null)

  // Fetch events list
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/v1/events?filter=all&page_size=50")
        if (res.ok) {
          const data = await res.json()
          setEvents(data.items || [])
          if (data.items?.length > 0 && !selectedEventId) {
            setSelectedEventId(data.items[0].id)
            setCertificateTitle(data.items[0].title)
            setPointsReward(data.items[0].points_reward || 20)
          }
        }
      } catch {
        // ignore
      }
    }
    if (open) {
      loadEvents()
    }
  }, [open])

  // Handle Event selection change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId)
    const ev = events.find((e) => e.id === eventId)
    if (ev) {
      setCertificateTitle(ev.title)
      setPointsReward(ev.points_reward || 20)
    }
  }

  // Handle CSV file drop or select
  const handleFileChange = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a valid .csv file exported from Luma")
      return
    }
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvContent(text)
    }
    reader.readAsText(file)
  }

  // Run preview parsing
  const handleParsePreview = async () => {
    if (!csvContent.trim()) {
      toast.error("Please drop or select a Luma CSV file first.")
      return
    }

    try {
      setIsParsing(true)
      const res = await fetch("/api/v1/events/preview-luma-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_text: csvContent,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to analyze CSV")
      }

      const data: PreviewData = await res.json()
      setPreviewData(data)
      setStep("preview")
      toast.success(`Detected ${data.total_rows} attendees (${data.detected_members} club members)!`)
    } catch (err: any) {
      toast.error(err.message || "Failed to parse CSV")
    } finally {
      setIsParsing(false)
    }
  }

  // Execute ingestion
  const handleExecute = async () => {
    if (!selectedEventId) {
      toast.error("Please select an event to link this attendance to.")
      return
    }
    if (!previewData || previewData.attendees.length === 0) {
      toast.error("No attendees found to ingest.")
      return
    }

    try {
      setIsExecuting(true)
      // Filter to checked-in attendees
      const validAttendees = previewData.attendees
        .filter((a) => a.checked_in)
        .map((a) => ({
          name: a.name,
          email: a.email,
          is_member: a.is_member,
          member_id: a.member_id,
          custom_attributes: a.custom_attributes,
        }))

      const payload = {
        certificate_title: certificateTitle.trim() || "CSEC-ASTU Event Attendance",
        certificate_template_id: selectedTemplateId || null,
        certificate_type: "workshop",
        award_points: awardPoints,
        points_reward: pointsReward,
        mint_certificates: mintCertificates,
        attendees: validAttendees,
      }

      const res = await fetch(`/api/v1/events/${selectedEventId}/ingest-luma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to execute ingestion")
      }

      const result = await res.json()
      setResultData(result)
      setStep("done")
      toast.success("Attendance successfully ingested and processed!")
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || "An error occurred during ingestion")
    } finally {
      setIsExecuting(false)
    }
  }

  const handleReset = () => {
    setStep("upload")
    setCsvFile(null)
    setCsvContent("")
    setPreviewData(null)
    setResultData(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-800 text-neutral-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Smart Luma Attendance Ingestion & Certificate Minting
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs">
            Export guest list from Luma Organizer, auto-match CSEC club members, deposit leaderboard points, and mint verified digital certificates.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 pt-2">
            {/* Event selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-300 font-semibold">Target Event *</Label>
                {events.length > 0 ? (
                  <select
                    value={selectedEventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-primary focus:outline-none"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} (+{ev.points_reward} pts)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-xs text-amber-400">
                    No events found. Please create an event on /events first.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs text-neutral-300 font-semibold">Certificate Template</Label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-primary focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files?.[0]) {
                  handleFileChange(e.dataTransfer.files[0])
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
                csvFile
                  ? "border-primary/50 bg-primary/5"
                  : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700"
              )}
              onClick={() => document.getElementById("luma-csv-input")?.click()}
            >
              <input
                id="luma-csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0])
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800/80 mb-3 text-primary">
                <UploadCloud className="w-6 h-6" />
              </div>
              {csvFile ? (
                <div>
                  <p className="text-sm font-semibold text-neutral-200">{csvFile.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {(csvFile.size / 1024).toFixed(1)} KB — Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-neutral-300">
                    Drop your Luma exported CSV file here
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Supports Luma Guests export (auto-detects Name, Email, University, Track, Check-In)
                  </p>
                </div>
              )}
            </div>

            {/* Parse button */}
            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-neutral-800 text-neutral-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!csvFile || isParsing || !selectedEventId}
                onClick={handleParsePreview}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                {isParsing && <Loader2 className="w-4 h-4 animate-spin" />}
                Analyze CSV & Preview Mapping
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4 pt-1">
            {/* Identity Resolution Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  Total Attendees
                </div>
                <div className="text-xl font-extrabold text-white">
                  {previewData.checked_in_rows}
                  <span className="text-[10px] text-neutral-500 font-normal ml-1">
                    / {previewData.total_rows} rows
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Active Members
                </div>
                <div className="text-xl font-extrabold text-emerald-300">
                  {previewData.detected_members}
                  <span className="text-[10px] text-emerald-500 font-normal ml-1">matched</span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Award className="w-3.5 h-3.5 text-neutral-400" />
                  External Guests
                </div>
                <div className="text-xl font-extrabold text-neutral-300">
                  {previewData.detected_externals}
                  <span className="text-[10px] text-neutral-500 font-normal ml-1">outsiders</span>
                </div>
              </div>
            </div>

            {/* Column mapping chips */}
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-3 text-xs space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Auto-Detected Column Mapping
              </p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-neutral-300">
                  Name: <strong className="text-white">{previewData.mapped_columns.name}</strong>
                </span>
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-neutral-300">
                  Email: <strong className="text-white">{previewData.mapped_columns.email}</strong>
                </span>
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-neutral-300">
                  Check-in: <strong className="text-white">{previewData.mapped_columns.checkin_status}</strong>
                </span>
              </div>
            </div>

            {/* Roster Preview Table */}
            <div className="rounded-xl border border-neutral-800 overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/40">
                    {previewData.attendees.slice(0, 15).map((att, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/40">
                        <td className="py-2 px-3 font-medium text-neutral-200">{att.name}</td>
                        <td className="py-2 px-3 text-neutral-400">{att.email || "—"}</td>
                        <td className="py-2 px-3">
                          {att.is_member ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                              Club Member ({att.member_student_id || "Active"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                              External Guest
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {att.checked_in ? (
                            <span className="text-[10px] font-semibold text-emerald-400">Checked In</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-rose-400">No-show</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.attendees.length > 15 && (
                <div className="bg-neutral-950/80 px-3 py-1.5 text-center text-[11px] text-neutral-500 border-t border-neutral-800">
                  + {previewData.attendees.length - 15} more attendees in queue
                </div>
              )}
            </div>

            {/* Action Confirmation Checkboxes */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 space-y-2 text-xs">
              <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-primary focus:ring-0"
                />
                <span>
                  Deposit <strong>+{pointsReward} Leaderboard Points</strong> to all {previewData.detected_members} verified CSEC members
                </span>
              </label>

              <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mintCertificates}
                  onChange={(e) => setMintCertificates(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-primary focus:ring-0"
                />
                <span>
                  Mint official digital certificates for all {previewData.checked_in_rows} verified attendees
                </span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex justify-between gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="border-neutral-800 text-neutral-400 hover:text-white text-xs"
              >
                Back to Upload
              </Button>
              <Button
                type="button"
                disabled={isExecuting || (!awardPoints && !mintCertificates)}
                onClick={handleExecute}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                {isExecuting && <Loader2 className="w-4 h-4 animate-spin" />}
                Mint & Award Points ({previewData.checked_in_rows})
              </Button>
            </div>
          </div>
        )}

        {step === "done" && resultData && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Batch Processing Completed!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Successfully processed Luma roster and linked credentials.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="text-xs text-neutral-400">Members Awarded</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  +{resultData.points_awarded_count}
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="text-xs text-neutral-400">Certificates Minted</div>
                <div className="text-xl font-bold text-primary mt-1">
                  {resultData.certificates_minted_count}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  handleReset()
                  onOpenChange(false)
                }}
                className="bg-primary text-primary-foreground text-xs font-semibold px-6"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
