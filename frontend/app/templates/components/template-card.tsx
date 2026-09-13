"use client"

import React from "react"
import { CertificateSlidePreview } from "./certificate-slide-preview"
import { Badge } from "@/components/ui/badge"
import { Eye, FileCode, Sparkles } from "lucide-react"
import type { CertificateTemplate } from "../types"
import { cn } from "@/lib/utils"

interface TemplateCardProps {
  template: CertificateTemplate
  onSelect: (template: CertificateTemplate) => void
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <div
      onClick={() => onSelect(template)}
      className="group cursor-pointer rounded-xl border border-zinc-200/80 dark:border-white/[0.07] bg-white dark:bg-[#111115] p-2.5 sm:p-3 transition-all duration-200 hover:border-zinc-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-black/40 flex flex-col justify-between"
    >
      {/* ── Realistic Certificate Slide Preview Container ────────────────── */}
      <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900/60 p-2 sm:p-2.5 transition-colors group-hover:bg-zinc-200/50 dark:group-hover:bg-zinc-800/40">
        <CertificateSlidePreview template={template} />

        {/* Hover Action Pill: Quiet, Minimalist */}
        <div className="absolute inset-0 bg-black/15 dark:bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-900/90 dark:bg-white text-white dark:text-zinc-900 shadow-sm transform translate-y-1 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>View template</span>
          </span>
        </div>
      </div>

      {/* ── Metadata Information: Content-First & Understated ────────────── */}
      <div className="pt-3 px-1 pb-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {template.title}
          </h4>
          {template.isCustomImported && (
            <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shrink-0">
              Custom PPTX
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: template.accentColor }}
            />
            {template.category}
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">
            PowerPoint · Editable
          </span>
        </div>
      </div>
    </div>
  )
}
