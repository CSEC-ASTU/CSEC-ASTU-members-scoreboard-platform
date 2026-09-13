"use client"

import React, { useState, useEffect, useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CertificateSlidePreview } from "./certificate-slide-preview"
import { membersService } from "@/lib/api/services/members"
import { divisionsService } from "@/lib/api/services/divisions"
import { certificatesService } from "@/lib/api/services/certificates"
import type { CertificateTemplate } from "../types"
import type {
  MemberOut,
  DivisionOut,
  CertificateOut,
  ExternalRecipientIn,
} from "@/lib/api/types"
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  Copy,
  Sparkles,
  Award,
  Send,
  Loader2,
  Check,
  Building2,
  Mail,
  Sliders,
} from "lucide-react"
import { toast } from "sonner"

interface IssueCertificatesDialogProps {
  template: CertificateTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function IssueCertificatesDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: IssueCertificatesDialogProps) {
  const [activeTab, setActiveTab] = useState<"details" | "recipients" | "results">("details")
  const [recipientSubTab, setRecipientSubTab] = useState<"members" | "outsiders" | "summary">("members")

  // Form Details
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [certificateType, setCertificateType] = useState("completion")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("")
  const [divisions, setDivisions] = useState<DivisionOut[]>([])

  // Dynamic Event-Wide Variables (e.g. {{EVENT_DATE}}, {{TRACK}}, {{HOST_UNIVERSITY}})
  const [eventVariables, setEventVariables] = useState<Array<{ key: string; value: string }>>([
    { key: "EVENT_NAME", value: "" },
    { key: "ISSUE_DATE", value: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
  ])

  // Club Members
  const [members, setMembers] = useState<MemberOut[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")
  const [memberDivisionFilter, setMemberDivisionFilter] = useState("all")
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  // External Outsiders
  const [externalRecipients, setExternalRecipients] = useState<ExternalRecipientIn[]>([])
  const [newExtName, setNewExtName] = useState("")
  const [newExtEmail, setNewExtEmail] = useState("")
  const [newExtOrg, setNewExtOrg] = useState("")
  const [newExtCustomField, setNewExtCustomField] = useState("")
  const [newExtCustomValue, setNewExtCustomValue] = useState("")

  // Quick CSV / Raw Paste for Outsiders
  const [csvPasteMode, setCsvPasteMode] = useState(false)
  const [rawCsvText, setRawCsvText] = useState("")

  // Generation State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issuedCertificates, setIssuedCertificates] = useState<CertificateOut[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setTitle(template.title)
      setDescription(template.description)
      setCertificateType(template.category.toLowerCase())
    }
  }, [template])

  // Load divisions and members on open
  useEffect(() => {
    if (!open) {
      setActiveTab("details")
      setIssuedCertificates([])
      return
    }

    const loadData = async () => {
      try {
        const divRes = await divisionsService.getDivisions()
        setDivisions(divRes)
      } catch {
        // Fallback divisions
      }

      try {
        setLoadingMembers(true)
        const memRes = await membersService.getMembers({ page: 1, page_size: 150, is_active: true })
        setMembers(memRes.items)
      } catch (err) {
        console.error("Failed to load members:", err)
      } finally {
        setLoadingMembers(false)
      }
    }

    loadData()
  }, [open])

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !memberSearch.trim() ||
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.student_id && m.student_id.toLowerCase().includes(memberSearch.toLowerCase()))

      const matchDiv =
        memberDivisionFilter === "all" ||
        m.division_id === memberDivisionFilter ||
        m.secondary_division_id === memberDivisionFilter

      return matchSearch && matchDiv
    })
  }, [members, memberSearch, memberDivisionFilter])

  // Member selection helpers
  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFilteredMembers = () => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      filteredMembers.forEach((m) => next.add(m.id))
      return next
    })
  }

  const clearMemberSelection = () => {
    setSelectedMemberIds(new Set())
  }

  // Outsider addition
  const handleAddExternalRecipient = () => {
    if (!newExtName.trim()) {
      toast.error("Participant full name is required")
      return
    }

    const customAttrs: Record<string, any> = {}
    if (newExtCustomField.trim() && newExtCustomValue.trim()) {
      customAttrs[newExtCustomField.trim()] = newExtCustomValue.trim()
    }

    const newExt: ExternalRecipientIn = {
      name: newExtName.trim(),
      email: newExtEmail.trim() || null,
      organization: newExtOrg.trim() || "External Participant",
      custom_attributes: customAttrs,
    }

    setExternalRecipients((prev) => [...prev, newExt])
    setNewExtName("")
    setNewExtEmail("")
    setNewExtOrg("")
    setNewExtCustomField("")
    setNewExtCustomValue("")
    toast.success(`Added ${newExt.name}`)
  }

  const handleRemoveExternalRecipient = (index: number) => {
    setExternalRecipients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleParseCsv = () => {
    if (!rawCsvText.trim()) return

    const lines = rawCsvText.split("\n")
    const parsed: ExternalRecipientIn[] = []

    for (const line of lines) {
      const clean = line.trim()
      if (!clean) continue
      // Allow comma or tab separated
      const parts = clean.includes("\t") ? clean.split("\t") : clean.split(",")
      if (parts.length >= 1) {
        const name = parts[0]?.trim()
        if (name && name.toLowerCase() !== "name" && name.toLowerCase() !== "full name") {
          const email = parts[1]?.trim() || null
          const org = parts[2]?.trim() || "External Participant"
          const extraRank = parts[3]?.trim()
          parsed.push({
            name,
            email,
            organization: org,
            custom_attributes: extraRank ? { rank: extraRank } : {},
          })
        }
      }
    }

    if (parsed.length > 0) {
      setExternalRecipients((prev) => [...prev, ...parsed])
      setRawCsvText("")
      setCsvPasteMode(false)
      toast.success(`Imported ${parsed.length} external participants from CSV/text`)
    } else {
      toast.error("No valid participants found. Use: Full Name, Email, Organization")
    }
  }

  // Dynamic variable helpers
  const handleAddEventVariable = () => {
    setEventVariables((prev) => [...prev, { key: "", value: "" }])
  }

  const handleUpdateEventVariable = (index: number, key: string, value: string) => {
    setEventVariables((prev) => {
      const next = [...prev]
      next[index] = { key, value }
      return next
    })
  }

  const handleRemoveEventVariable = (index: number) => {
    setEventVariables((prev) => prev.filter((_, i) => i !== index))
  }

  // Total counts
  const totalCount = selectedMemberIds.size + externalRecipients.length

  // Execution: Batch issue
  const handleIssueCertificates = async () => {
    if (!title.trim()) {
      toast.error("Certificate title is required")
      setActiveTab("details")
      return
    }

    if (totalCount === 0) {
      toast.error("Please select at least one club member or add an external participant")
      setActiveTab("recipients")
      return
    }

    setIsSubmitting(true)
    try {
      // Build event variables dict
      const eventVarDict: Record<string, any> = {}
      eventVariables.forEach((v) => {
        if (v.key.trim()) {
          eventVarDict[v.key.trim()] = v.value
        }
      })

      const payload = {
        template_id: template?.id,
        title: title.trim(),
        description: description.trim() || null,
        certificate_type: certificateType,
        division_id: selectedDivisionId || null,
        member_ids: Array.from(selectedMemberIds),
        external_recipients: externalRecipients,
        event_variables: eventVarDict,
        send_email_notifications: false,
      }

      const res = await certificatesService.createCertificates(payload)
      setIssuedCertificates(res)
      setActiveTab("results")
      toast.success(`Successfully issued ${res.length} official certificates!`)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error("Failed to issue certificates: " + (err?.detail || err?.message || "Unknown error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Download issued CSV roster
  const handleDownloadRoster = () => {
    if (issuedCertificates.length === 0) return

    const rows = [
      ["Recipient Name", "Type", "Identity / Organization", "Email", "Certificate Code", "Verification URL"],
    ]

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://csec.astu.edu.et"

    issuedCertificates.forEach((c) => {
      rows.push([
        c.recipient_name,
        c.is_external ? "External Participant" : "Club Member",
        c.recipient_identity || "",
        c.recipient_email || "",
        c.cert_code,
        `${baseUrl}/verify/certificate/${c.cert_code}`,
      ])
    })

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `issued_certificates_${title.replace(/\s+/g, "_").toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Downloaded certificate verification roster")
  }

  const handleCopyCode = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success(`Copied ${code}`)
      setTimeout(() => setCopiedCode(null), 1500)
    }
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] bg-white dark:bg-[#0f0f13] border-zinc-200 dark:border-white/10 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
        <DialogTitle className="sr-only">Issue Official Certificates</DialogTitle>
        <DialogDescription className="sr-only">Batch generate cryptographically verified credentials</DialogDescription>

        {/* ── Dialog Header (Notion Editorial Style) ──────────────────────── */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: template.accentColor }}
            >
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Issue Official Certificates
                </h3>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${template.accentColor}15`,
                    color: template.accentColor,
                  }}
                >
                  {template.title}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Generate cryptographically signed credentials for club members and external participants.
              </p>
            </div>
          </div>

          {/* Stepper / Tab Pills */}
          {activeTab !== "results" && (
            <div className="flex items-center p-0.5 bg-zinc-200/60 dark:bg-white/[0.06] rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === "details"
                    ? "bg-white dark:bg-[#18181d] text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                1. Certificate Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recipients")}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "recipients"
                    ? "bg-white dark:bg-[#18181d] text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <span>2. Recipients</span>
                {totalCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {totalCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Dialog Body (Scrollable) ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Certificate Particulars & Dynamic Variables */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Certificate Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2026 ASTU CTF Championship or Web Track Mastery"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-zinc-500">The primary headline printed on the certificate.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Host Division Scope
                  </Label>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    className="w-full h-9 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#18181d] text-xs px-3 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Club-Wide / CSEC ASTU (Default)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} Division
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500">Division granting the recognition.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description / Citation
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Awarded for demonstrating outstanding leadership, technical mastery, and contributions during the 2025/2026 academic term."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Dynamic Variables Key-Value Section */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-violet-500" />
                      Dynamic Template Variables
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      These variables automatically populate corresponding placeholders (e.g. {"{{EVENT_NAME}}"}) in the Canva template.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEventVariable}
                    className="h-7 text-xs gap-1 border-dashed"
                  >
                    <Plus className="w-3 h-3" />
                    Add Variable
                  </Button>
                </div>

                <div className="space-y-2 pt-1">
                  {eventVariables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={v.key}
                        onChange={(e) => handleUpdateEventVariable(i, e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""), v.value)}
                        placeholder="VARIABLE_NAME (e.g. TRACK)"
                        className="h-7 text-xs font-mono w-1/3 bg-white dark:bg-[#131317]"
                      />
                      <Input
                        value={v.value}
                        onChange={(e) => handleUpdateEventVariable(i, v.key, e.target.value)}
                        placeholder="Value (e.g. Web3 & Cyber Security)"
                        className="h-7 text-xs flex-1 bg-white dark:bg-[#131317]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEventVariable(i)}
                        className="h-7 w-7 text-zinc-400 hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Dual Recipient Selection (Club Members + Outsiders) */}
          {activeTab === "recipients" && (
            <div className="space-y-4">
              {/* Recipient Mode Sub-Tabs */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientSubTab("members")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recipientSubTab === "members"
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold border border-violet-500/20"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>CSEC Club Members</span>
                    {selectedMemberIds.size > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                        {selectedMemberIds.size}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientSubTab("outsiders")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recipientSubTab === "outsiders"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>External Participants / Outsiders</span>
                    {externalRecipients.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        {externalRecipients.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientSubTab("summary")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recipientSubTab === "summary"
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>Summary ({totalCount})</span>
                  </button>
                </div>

                <span className="text-xs text-zinc-500 font-medium">
                  Total Queued: <strong className="text-zinc-900 dark:text-zinc-100">{totalCount}</strong>
                </span>
              </div>

              {/* SubTab A: Club Members Table with Search & Checkboxes */}
              {recipientSubTab === "members" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                        <Input
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search members by name, ID, email..."
                          className="h-8 pl-8 text-xs bg-white dark:bg-[#131317]"
                        />
                      </div>
                      <select
                        value={memberDivisionFilter}
                        onChange={(e) => setMemberDivisionFilter(e.target.value)}
                        className="h-8 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#131317] text-xs px-2 text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="all">All Divisions</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllFilteredMembers}
                        className="h-8 text-xs"
                      >
                        Select All Filtered ({filteredMembers.length})
                      </Button>
                      {selectedMemberIds.size > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearMemberSelection}
                          className="h-8 text-xs text-zinc-500"
                        >
                          Clear ({selectedMemberIds.size})
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Members Roster Table */}
                  <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden max-h-72 overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-8 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading club members directory...
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-8 text-center text-zinc-400 text-xs">
                        No club members found matching your search.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.04] text-xs">
                        {filteredMembers.map((m) => {
                          const isSelected = selectedMemberIds.has(m.id)
                          return (
                            <div
                              key={m.id}
                              onClick={() => toggleMember(m.id)}
                              className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-violet-500/10 dark:bg-violet-500/15"
                                  : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by container
                                  className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 pointer-events-none"
                                />
                                <div>
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <span>{m.full_name}</span>
                                    {m.student_id && (
                                      <span className="font-mono text-[10px] text-zinc-400">
                                        {m.student_id}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-zinc-500">{m.email}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                                  {m.department || "ASTU"}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SubTab B: External Participants (Hackathons, Workshops, Guests) */}
              {recipientSubTab === "outsiders" && (
                <div className="space-y-4">
                  {/* Toggle between Single Add and CSV / Batch Paste */}
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.08]">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      Add students from other universities, competition guests, or workshop attendees:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvPasteMode(!csvPasteMode)}
                      className="h-7 text-xs gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{csvPasteMode ? "Single Entry Form" : "Paste CSV / Excel Rows"}</span>
                    </Button>
                  </div>

                  {csvPasteMode ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Paste Recipient Rows (Comma or Tab separated)
                      </Label>
                      <Textarea
                        value={rawCsvText}
                        onChange={(e) => setRawCsvText(e.target.value)}
                        placeholder={`Format: Full Name, Email (optional), Organization / University, Custom Rank (optional)\nExample:\nDawit Alemu, dawit@aau.edu.et, Addis Ababa University, 1st Place\nSara Tadesse, sara@wolkite.edu.et, Wolkite University, 2nd Place\nKirubel Mekonnen, kirubel@gmail.com, Independent Developer, Honorable Mention`}
                        rows={5}
                        className="text-xs font-mono resize-none"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleParseCsv}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Parse & Add to Queue
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={newExtName}
                          onChange={(e) => setNewExtName(e.target.value)}
                          placeholder="Full Name (Required) *"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={newExtEmail}
                          onChange={(e) => setNewExtEmail(e.target.value)}
                          placeholder="Email Address (Optional)"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={newExtOrg}
                          onChange={(e) => setNewExtOrg(e.target.value)}
                          placeholder="University / Organization"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newExtCustomField}
                          onChange={(e) => setNewExtCustomField(e.target.value)}
                          placeholder="Custom attribute name (e.g. rank, team_name)"
                          className="h-8 text-xs font-mono w-1/3"
                        />
                        <Input
                          value={newExtCustomValue}
                          onChange={(e) => setNewExtCustomValue(e.target.value)}
                          placeholder="Attribute value (e.g. 1st Place, DeFi Sentinel)"
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddExternalRecipient}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Participant
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* External Participants Table */}
                  <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden max-h-60 overflow-y-auto">
                    {externalRecipients.length === 0 ? (
                      <div className="p-6 text-center text-zinc-400 text-xs">
                        No external participants added yet. Use the form above or paste from Excel/CSV.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.04] text-xs">
                        {externalRecipients.map((ext, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                          >
                            <div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span>{ext.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {ext.organization || "External"}
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500">
                                {ext.email || "No email"} {ext.custom_attributes && Object.keys(ext.custom_attributes).length > 0 && `· ${JSON.stringify(ext.custom_attributes)}`}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExternalRecipient(idx)}
                              className="h-7 w-7 text-zinc-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SubTab C: Unified Summary & Breakdown */}
              {recipientSubTab === "summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
                      <span className="text-xl font-bold text-violet-600 dark:text-violet-400">
                        {selectedMemberIds.size}
                      </span>
                      <span className="block text-xs text-zinc-500 font-medium">Club Members</span>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {externalRecipients.length}
                      </span>
                      <span className="block text-xs text-zinc-500 font-medium">External Participants</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 text-center">
                    All <strong className="text-zinc-900 dark:text-zinc-100">{totalCount}</strong> recipients will receive a uniquely signed HMAC credential with a public QR code verification page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Issuance Success State with Codes & Roster */}
          {activeTab === "results" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Successfully Minted {issuedCertificates.length} Official Certificates!
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto pt-1">
                  Each certificate has been cryptographically signed and recorded into the CSEC-ASTU credential registry.
                </p>
              </div>

              {/* Results Roster Table */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] text-left max-h-64 overflow-y-auto">
                <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.04] text-xs">
                  {issuedCertificates.map((cert) => (
                    <div key={cert.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span>{cert.recipient_name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              cert.is_external
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            }`}
                          >
                            {cert.is_external ? "External" : "Member"}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-zinc-400">{cert.cert_code}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(cert.cert_code)}
                          className="h-7 text-xs gap-1 text-zinc-500"
                        >
                          {copiedCode === cert.cert_code ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedCode === cert.cert_code ? "Copied" : "Copy"}</span>
                        </Button>

                        <a
                          href={`/verify/certificate/${cert.cert_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Verify</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRoster}
                  className="h-9 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Download Issuance CSV Roster</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Dialog Footer (Pinned Actions) ──────────────────────────────── */}
        {activeTab !== "results" && (
          <div className="px-6 py-3 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs border-zinc-300 dark:border-zinc-700"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {activeTab === "details" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab("recipients")}
                  className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium"
                >
                  Next: Choose Recipients ({totalCount})
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("details")}
                    className="h-8 text-xs"
                  >
                    Back to Details
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting || totalCount === 0}
                    onClick={handleIssueCertificates}
                    className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium gap-1.5 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Signing & Issuing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Issue {totalCount} Certificates</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
