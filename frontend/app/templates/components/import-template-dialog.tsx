"use client"

import React, { useState, useRef } from "react"
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
import { UploadCloud, FileCode, CheckCircle2, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [category, setCategory] = useState<Exclude<TemplateCategory, "All">>("Training")
  const [division, setDivision] = useState("Development Division")
  const [description, setDescription] = useState("")
  const [accentColor, setAccentColor] = useState("#0284c7")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".pptx") && !file.name.toLowerCase().endsWith(".ppt")) {
      toast.error("Invalid file format", {
        description: "Please select a Microsoft PowerPoint (.pptx) file exported from Canva.",
      })
      return
    }

    setSelectedFile(file)
    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      setTitle(cleanName)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error("Please upload a .pptx template file.")
      return
    }

    if (!title.trim()) {
      toast.error("Template title is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const newTemplate: CertificateTemplate = {
        id: `custom-${Date.now()}`,
        title: title.trim(),
        subtitle: subtitle.trim() || `${division} Certificate`,
        category,
        division,
        divisionSlug: division.toLowerCase().replace(/\s+/g, "-"),
        accentColor,
        secondaryColor: accentColor,
        description: description.trim() || `Custom PowerPoint template imported from Canva for ${division}.`,
        downloadsCount: 1,
        isCustomImported: true,
        fileName: selectedFile.name,
        importedAt: new Date().toISOString(),
        signatoryLeftTitle: "President, CSEC-ASTU",
        signatoryLeftName: "Executive President",
        signatoryRightTitle: `${division} Lead`,
        signatoryRightName: "Division Head",
        paperStyle: "cyber-neon",
      }

      onTemplateImported(newTemplate)
      toast.success("Template imported successfully!", {
        description: `"${newTemplate.title}" is now saved to your library for future certificate issuances.`,
      })

      // Reset and close
      setSelectedFile(null)
      setTitle("")
      setSubtitle("")
      setDescription("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Failed to import template: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#0f0f13] border-zinc-200 dark:border-white/10 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-zinc-100 dark:border-white/[0.06]">
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Import Canva PowerPoint Template
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Upload a <span className="font-mono text-zinc-700 dark:text-zinc-300">.pptx</span> certificate file exported from Canva. It will be archived in your library for dynamic issuance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* File Dropzone */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1.5 block">
              PowerPoint Template File (.pptx)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,.ppt"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate text-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready for import
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-violet-500/50 dark:hover:border-violet-500/50 bg-zinc-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 flex items-center justify-center mb-2">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">
                  Click to select Canva .pptx file
                </span>
                <span className="text-[11px] text-zinc-400 mt-0.5">
                  Must contain placeholder tags like {"{{STUDENT_NAME}}"}
                </span>
              </div>
            )}
          </div>

          {/* Template Title */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block">
              Template Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cybersecurity CTF Distinction Award"
              className="h-8 text-xs bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10"
              required
            />
          </div>

          {/* Category & Division Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block">
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
              <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block">
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
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1 block">
              Description / Citation Summary (Optional)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of syllabus or achievement recognized by this certificate..."
              className="text-xs min-h-[60px] bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10"
            />
          </div>

          {/* Accent Color Selection */}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 text-xs mb-1.5 block">
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
              disabled={isSubmitting || !selectedFile}
              className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium"
            >
              Save Template to Library
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
