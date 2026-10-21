"use client"

import React, { useState, useRef, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Presentation,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Sparkles,
  Link2,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import { certificatesService } from "@/lib/api/services/certificates"
import type { CertificateTemplate, TemplateCategory } from "../types"

interface ImportTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateImported: (template: CertificateTemplate) => void
}

const COLOR_PRESETS = [
  { name: "Cyan / Dev", color: "#0284c7" },
  { name: "Emerald / CP", color: "#059669" },
  { name: "Crimson / Cyber", color: "#dc2626" },
  { name: "Purple / AI", color: "#7c3aed" },
  { name: "Gold / Leadership", color: "#d97706" },
  { name: "Solana / Web3", color: "#9333ea" },
  { name: "Rose / Media", color: "#e11d48" },
  { name: "Slate / Classic", color: "#475569" },
]

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onTemplateImported,
}: ImportTemplateDialogProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [googleSlideInput, setGoogleSlideInput] = useState("")
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null)
  const [previewImageDataUrl, setPreviewImageDataUrl] = useState<string>("")
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [category, setCategory] = useState<Exclude<TemplateCategory, "All">>("Training")
  const [division, setDivision] = useState("Development Division")
  const [description, setDescription] = useState("")
  const [accentColor, setAccentColor] = useState("#0284c7")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Automatically extract the clean Google Slide ID from link or raw ID
  const cleanSlideId = useMemo(() => {
    const raw = googleSlideInput.trim()
    if (!raw) return ""
    const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (match) return match[1]
    if (/^[a-zA-Z0-9-_]{20,}$/.test(raw)) return raw
    return raw
  }, [googleSlideInput])

  const isValidSlideId = cleanSlideId.length >= 20 && !cleanSlideId.includes("/")
  const slideEditUrl = isValidSlideId ? `https://docs.google.com/presentation/d/${cleanSlideId}/edit` : ""
  const slideExportPng = isValidSlideId ? `https://docs.google.com/presentation/d/${cleanSlideId}/export/png` : ""

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid image format", {
        description: "Please select a PNG, JPG, or WebP slide screenshot exported from Canva.",
      })
      return
    }

    setPreviewImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewImageDataUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidSlideId) {
      toast.error("Valid Google Slides link or ID required", {
        description: "Please paste a Google Slides link (e.g. https://docs.google.com/presentation/d/1.../edit).",
      })
      return
    }

    if (!title.trim()) {
      toast.error("Template title is required.")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Saving template to library...")
    try {
      // 1. Upload custom preview screenshot to Drive if attached
      let finalPreviewUrl = previewImageDataUrl || slideExportPng
      if (previewImageFile) {
        try {
          const imgUpload = await certificatesService.uploadTemplateFile(previewImageFile)
          if (imgUpload.url) {
            finalPreviewUrl = imgUpload.url
          }
        } catch (imgErr) {
          console.warn("Could not upload preview image to Drive, using fallback thumbnail", imgErr)
        }
      }

      const newTemplate: CertificateTemplate = {
        id: cleanSlideId,
        title: title.trim(),
        subtitle: subtitle.trim() || `${division} Certificate`,
        category,
        division,
        divisionSlug: division.toLowerCase().replace(/\s+/g, "-"),
        accentColor,
        secondaryColor: accentColor,
        description: description.trim() || `Google Slides certificate template for ${division}.`,
        downloadsCount: 1,
        isCustomImported: true,
        fileName: `${title.trim().replace(/\s+/g, "_")}.pptx`,
        previewImageUrl: finalPreviewUrl,
        googleSlideId: cleanSlideId,
        driveFileUrl: slideEditUrl,
        importedAt: new Date().toISOString(),
        signatoryLeftTitle: "President, CSEC-ASTU",
        signatoryLeftName: "Executive President",
        signatoryRightTitle: `${division} Lead`,
        signatoryRightName: "Division Head",
        paperStyle: "cyber-neon",
      }

      onTemplateImported(newTemplate)
      toast.success("Template saved!", {
        id: toastId,
        description: `"${newTemplate.title}" is ready for issuing official certificates.`,
      })

      // Reset and close
      setGoogleSlideInput("")
      setPreviewImageFile(null)
      setPreviewImageDataUrl("")
      setTitle("")
      setSubtitle("")
      setDescription("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Failed to save template: " + (err?.detail || err?.message || "Unknown error"), {
        id: toastId,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#0f0f13] border-zinc-200 dark:border-white/10 p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2 border-b border-zinc-100 dark:border-white/[0.06]">
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Presentation className="w-5 h-5 text-violet-500" />
            <span>Import Google Slides Template</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Paste your Google Slides link from Canva or Google Drive to populate certificates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Primary Input: Google Slides Link or ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-violet-500" />
                <span>Google Slides Link or ID</span>
                <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{showGuide ? "Hide Guide" : "How to get link from Canva?"}</span>
              </button>
            </div>

            <Input
              value={googleSlideInput}
              onChange={(e) => {
                setGoogleSlideInput(e.target.value)
                if (!title.trim()) {
                  // Infer a default title
                  setTitle("CSEC Certificate Template")
                }
              }}
              placeholder="https://docs.google.com/presentation/d/1wzFz4e5X.../edit"
              className="h-9 text-xs bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 font-mono"
              required
            />

            {/* Quick Canva / Drive Guide Collapsible */}
            {showGuide && (
              <div className="mt-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-zinc-700 dark:text-zinc-300 space-y-1.5 text-[11px] leading-relaxed">
                <p className="font-semibold text-violet-600 dark:text-violet-400">
                  Easy steps from Canva to Google Slides:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li>In Canva, design your certificate with placeholders like <code className="text-violet-500 font-mono">{"{{STUDENT_NAME}}"}</code>.</li>
                  <li>Click <strong>Share &gt; More &gt; Google Slides</strong> (or download as PPTX and in Google Drive choose <strong>Open with Google Slides</strong>).</li>
                  <li>Click <strong>Share</strong> in Google Slides and set to <strong>"Anyone with the link can view"</strong>.</li>
                  <li>Copy the browser link and paste it in the box above!</li>
                </ol>
              </div>
            )}

            {/* Valid Link Feedback Box */}
            {isValidSlideId ? (
              <div className="mt-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-xs truncate">
                      Valid Google Slides Presentation
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate">
                      ID: {cleanSlideId}
                    </span>
                  </div>
                </div>
                <a
                  href={slideEditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline shrink-0 px-2 py-1 rounded bg-violet-500/10"
                >
                  <span>Open Slide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : googleSlideInput.trim() ? (
              <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Please enter a complete Google Slides presentation URL or alphanumeric ID.
              </p>
            ) : null}
          </div>

          {/* Template Title */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block font-medium">
              Template Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Bootcamp 2026 Certificate"
              className="h-8 text-xs bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10"
              required
            />
          </div>

          {/* Category & Division Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block font-medium">
                Category
              </Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as any)}
              >
                <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Competition">Competition</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Achievement">Achievement</SelectItem>
                  <SelectItem value="Participation">Participation</SelectItem>
                  <SelectItem value="Leadership">Leadership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block font-medium">
                Division
              </Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10">
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Development Division">Development</SelectItem>
                  <SelectItem value="Competitive Programming">Competitive Programming</SelectItem>
                  <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                  <SelectItem value="Data Science">Data Science</SelectItem>
                  <SelectItem value="Capacity Building">Capacity Building</SelectItem>
                  <SelectItem value="Blockchain team">Blockchain</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Club-Wide">Club-Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block font-medium">
              Description / Citation Summary (Optional)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of syllabus or achievement recognized by this certificate..."
              className="text-xs min-h-[55px] bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10"
            />
          </div>

          {/* Slide Design Preview Image (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs block font-medium">
                Custom Preview Thumbnail (Optional)
              </Label>
              <span className="text-[10px] text-zinc-400">
                Auto-generated from Google Slides if left blank
              </span>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />

            {previewImageDataUrl ? (
              <div className="p-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-14 h-9 rounded-md overflow-hidden bg-black shrink-0 border border-white/10 shadow-xs">
                    <img
                      src={previewImageDataUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate text-xs">
                      {previewImageFile?.name || "Slide Preview Image"}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Custom thumbnail attached
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreviewImageFile(null)
                    setPreviewImageDataUrl("")
                  }}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="p-3 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 hover:border-violet-500/50 bg-zinc-50/50 dark:bg-white/[0.01] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Click to upload slide screenshot (PNG / JPG)
                </span>
              </div>
            )}
          </div>

          {/* Accent Color Selection */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1.5 block font-medium">
              Division Accent Color
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.color}
                  onClick={() => setAccentColor(p.color)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    accentColor === p.color ? "scale-110 border-white shadow-xs" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isValidSlideId}
              className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? "Saving Template..." : "Save Template"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
