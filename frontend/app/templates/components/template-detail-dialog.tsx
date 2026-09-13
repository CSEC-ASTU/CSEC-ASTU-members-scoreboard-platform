"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CertificateSlidePreview } from "./certificate-slide-preview"
import {
  Download,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import type { CertificateTemplate } from "../types"

interface TemplateDetailDialogProps {
  template: CertificateTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseForIssuance?: (template: CertificateTemplate) => void
}

export function TemplateDetailDialog({
  template,
  open,
  onOpenChange,
  onUseForIssuance,
}: TemplateDetailDialogProps) {
  const [copiedTags, setCopiedTags] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  if (!template) return null

  const handleCopyTags = () => {
    const tags = `{{STUDENT_NAME}}\n{{STUDENT_ID}}\n{{DIVISION_NAME}}\n{{CERT_TITLE}}\n{{DESCRIPTION}}\n{{ISSUE_DATE}}\n{{ACADEMIC_YEAR}}\n{{CERT_CODE}}\n{{QR_CODE}}`
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(tags)
      setCopiedTags(true)
      toast.success("PowerPoint placeholder tags copied to clipboard")
      setTimeout(() => setCopiedTags(false), 2000)
    }
  }

  const handleDownload = () => {
    setIsDownloading(true)
    // Create a mock PPTX downloadable file or trigger download
    try {
      const element = document.createElement("a")
      const fileContent = `CSEC-ASTU PowerPoint Template Package\nTemplate: ${template.title}\nCategory: ${template.category}\nDivision: ${template.division}\nAccent: ${template.accentColor}\nDynamic Tags: {{STUDENT_NAME}}, {{CERT_CODE}}, {{QR_CODE}}`
      const file = new Blob([fileContent], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" })
      element.href = URL.createObjectURL(file)
      element.download = template.fileName
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success(`Downloaded ${template.fileName}`, {
        description: "Open in Microsoft PowerPoint or import directly into Canva.",
      })
    } catch (e: any) {
      toast.error("Download failed: " + e.message)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-xl sm:max-w-2xl max-h-[88vh] bg-white dark:bg-[#0f0f13] border-zinc-200 dark:border-white/10 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
        <DialogTitle className="sr-only">{template.title}</DialogTitle>
        <DialogDescription className="sr-only">{template.description}</DialogDescription>

        {/* ── Large Certificate Preview at the Top (Notion Document Style) ── */}
        <div className="py-3 sm:py-4 px-4 sm:px-6 bg-zinc-100 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
          <div className="w-full max-w-sm sm:max-w-md shadow-sm rounded-md overflow-hidden">
            <CertificateSlidePreview template={template} showPlaceholderTags={true} />
          </div>
        </div>

        {/* ── Document Content & Properties (Scrollable Body) ─────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Header Title & Editorial Description */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {template.title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Notion-Style Properties Table */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02] divide-y divide-zinc-200/60 dark:divide-white/[0.05] text-xs">
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Format</span>
              <span className="col-span-2 text-zinc-800 dark:text-zinc-200 font-medium">PowerPoint Presentation</span>
            </div>
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">File type</span>
              <span className="col-span-2 font-mono text-zinc-800 dark:text-zinc-200">.PPTX (Canva & Keynote Compatible)</span>
            </div>
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Category</span>
              <span className="col-span-2 text-zinc-800 dark:text-zinc-200">{template.category}</span>
            </div>
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Division Scope</span>
              <span className="col-span-2 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: template.accentColor }} />
                {template.division}
              </span>
            </div>
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Editable</span>
              <span className="col-span-2 text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Yes · Fully Customizable in PowerPoint
              </span>
            </div>
            <div className="grid grid-cols-3 py-2 px-3">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Dimensions</span>
              <span className="col-span-2 text-zinc-700 dark:text-zinc-300">16:9 Landscape (1920 × 1080)</span>
            </div>
          </div>

          {/* Dynamic Placeholders Helper */}
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">Canva Dynamic Tags</span>
              <span className="text-[11px] text-zinc-500">
                Contains placeholders: <code className="text-zinc-700 dark:text-zinc-300 font-mono">{"{{STUDENT_NAME}}"}</code>, <code className="text-zinc-700 dark:text-zinc-300 font-mono">{"{{CERT_CODE}}"}</code>, <code className="text-zinc-700 dark:text-zinc-300 font-mono">{"{{QR_CODE}}"}</code>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTags}
              className="h-7 text-xs border-zinc-300 dark:border-zinc-700 gap-1.5 shrink-0"
            >
              {copiedTags ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              <span>{copiedTags ? "Copied" : "Copy Tags"}</span>
            </Button>
          </div>
        </div>

        {/* ── Pinned Bottom Actions Bar ───────────────────────────────────── */}
        <div className="p-3 sm:px-6 py-3 border-t border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f13] flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-8 text-xs border-zinc-300 dark:border-zinc-700 font-medium gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.pptx)</span>
            </Button>

            {onUseForIssuance && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onUseForIssuance(template)
                }}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use Template to Issue</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
