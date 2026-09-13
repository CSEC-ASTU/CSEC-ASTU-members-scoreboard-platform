"use client"

import React, { useState, useMemo, useEffect } from "react"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  UploadCloud,
  SlidersHorizontal,
  ArrowUpDown,
  FileCode,
  Sparkles,
  Award,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TemplateCard } from "./components/template-card"
import { TemplateDetailDialog } from "./components/template-detail-dialog"
import { ImportTemplateDialog } from "./components/import-template-dialog"
import { IssueCertificatesDialog } from "./components/issue-certificates-dialog"
import { DEFAULT_CERTIFICATE_TEMPLATES } from "./default-templates"
import type { CertificateTemplate, TemplateCategory, SortOption } from "./types"
import { cn } from "@/lib/utils"

const CATEGORIES: TemplateCategory[] = [
  "All",
  "Academic",
  "Competition",
  "Workshop",
  "Training",
  "Achievement",
  "Participation",
  "Leadership",
]

const STORAGE_KEY = "csec_custom_certificate_templates_v1"

export default function CertificateTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All")
  const [sortOption, setSortOption] = useState<SortOption>("popular")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")

  // State for all templates (built-in + imported)
  const [customTemplates, setCustomTemplates] = useState<CertificateTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issuingTemplate, setIssuingTemplate] = useState<CertificateTemplate | null>(null)

  // Load custom imported templates from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setCustomTemplates(parsed)
          }
        }
      } catch (e) {
        console.error("Failed to load saved templates", e)
      }
    }
  }, [])

  // Save new imported template to library
  const handleTemplateImported = (newTemplate: CertificateTemplate) => {
    setCustomTemplates((prev) => {
      const next = [newTemplate, ...prev]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.error("Failed to save template to localStorage", e)
      }
      return next
    })
  }

  // Combined templates pool
  const allTemplates = useMemo(() => {
    return [...customTemplates, ...DEFAULT_CERTIFICATE_TEMPLATES]
  }, [customTemplates])

  // Filtered & Sorted list
  const filteredTemplates = useMemo(() => {
    return allTemplates
      .filter((tmpl) => {
        const matchesCategory =
          selectedCategory === "All" || tmpl.category === selectedCategory

        const matchesDivision =
          selectedDivision === "all" ||
          tmpl.division.toLowerCase().includes(selectedDivision.toLowerCase())

        const query = searchQuery.trim().toLowerCase()
        const matchesSearch =
          !query ||
          tmpl.title.toLowerCase().includes(query) ||
          tmpl.description.toLowerCase().includes(query) ||
          tmpl.division.toLowerCase().includes(query) ||
          tmpl.category.toLowerCase().includes(query)

        return matchesCategory && matchesDivision && matchesSearch
      })
      .sort((a, b) => {
        if (sortOption === "popular") {
          return b.downloadsCount - a.downloadsCount
        }
        if (sortOption === "a-z") {
          return a.title.localeCompare(b.title)
        }
        if (sortOption === "latest") {
          if (a.isCustomImported && !b.isCustomImported) return -1
          if (!a.isCustomImported && b.isCustomImported) return 1
          return b.downloadsCount - a.downloadsCount
        }
        return 0
      })
  }, [allTemplates, selectedCategory, selectedDivision, searchQuery, sortOption])

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* ── 1. Editorial Header (Notion Inspired) ───────────────────────── */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Certificate Templates
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl font-normal">
                Professional certificate templates, ready to customize in PowerPoint.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setIssuingTemplate(selectedTemplate || allTemplates[0] || null)
                  setIssueOpen(true)
                }}
                size="sm"
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Issue Certificates</span>
              </Button>

              <Button
                onClick={() => setImportOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.05] font-medium gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import Canva (.pptx)</span>
              </Button>
            </div>
          </div>

          {/* Notion Database Search Input */}
          <div className="relative max-w-sm pt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="h-8 pl-8 text-xs bg-zinc-50/80 dark:bg-white/[0.03] border-zinc-200 dark:border-white/[0.08] focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 placeholder:text-zinc-400 rounded-lg"
            />
          </div>
        </div>

        {/* ── 2. Subtle Filter & Category Row (Minimalist & Understated) ─── */}
        <div className="border-y border-zinc-200/80 dark:border-white/[0.06] py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                    active
                      ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Sort & Division Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={sortOption}
              onValueChange={(v) => setSortOption(v as SortOption)}
            >
              <SelectTrigger className="h-7 text-xs bg-transparent border-zinc-200/80 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 gap-1.5 focus:ring-0">
                <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end" className="text-xs">
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="a-z">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── 3. Template Gallery: Spacious Responsive Grid ──────────────── */}
        {filteredTemplates.length === 0 ? (
          <div className="py-20 text-center space-y-2 max-w-sm mx-auto">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No templates found
            </p>
            <p className="text-xs text-zinc-500">
              No certificates match &ldquo;{searchQuery}&rdquo; in {selectedCategory}. Try resetting filters or import your own template.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("All")
                }}
                className="h-7 text-xs border-zinc-200 dark:border-white/10"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={(tmpl) => {
                  setSelectedTemplate(tmpl)
                  setDetailOpen(true)
                }}
              />
            ))}
          </div>
        )}

        {/* ── 4. Notion-Style Template Detail Modal ──────────────────────── */}
        <TemplateDetailDialog
          template={selectedTemplate}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUseForIssuance={(tmpl) => {
            setIssuingTemplate(tmpl)
            setIssueOpen(true)
          }}
        />

        {/* ── 5. Import PowerPoint Template Modal ────────────────────────── */}
        <ImportTemplateDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onTemplateImported={handleTemplateImported}
        />

        {/* ── 6. Certificate Issuance Modal (Members + Outsiders) ────────── */}
        <IssueCertificatesDialog
          template={issuingTemplate || selectedTemplate || allTemplates[0] || null}
          open={issueOpen}
          onOpenChange={setIssueOpen}
        />
      </div>
    </Layout>
  )
}
