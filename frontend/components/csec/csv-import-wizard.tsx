"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  RefreshCw,
  FileCheck,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminService, type ImportResult, type DivisionOut } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

interface CsvImportWizardProps {
  divisions: DivisionOut[]
  onImportComplete?: () => void
}

interface ParsedRowPreview {
  rowNum: number
  email: string
  fullName: string
  studentId: string
  phoneNumber: string
  division: string
  secondaryDivision?: string
  department: string
  year: string
  telegram: string
  github: string
  selfie: string
  isValid: boolean
  issues: string[]
}

const EXCLUDED_EMAIL_HEADERS = new Set([
  "university student email",
  "university/student email",
  "student email",
  "university email",
  "astu email",
  "astu student email",
])

const HEADER_ALIASES: Record<string, string[]> = {
  email: [
    "personal email (use one you check regularly)",
    "personal email use one you check regularly",
    "personal email",
    "personal_email",
    "email address",
    "email",
    "e-mail",
    "mail",
  ],
  student_id: [
    "student id",
    "student_id",
    "student id number",
    "id number",
    "id",
    "astu id",
    "student identification",
  ],
  phone_number: [
    "phone number (+251)",
    "phone number +251",
    "phone number",
    "phone_number",
    "phone",
    "mobile number",
    "mobile",
    "phone no",
    "tel",
    "telephone",
  ],
  full_name: [
    "full_name",
    "full name",
    "name",
    "student name",
    "fullname",
    "your name",
    "first and last name",
    "member name",
  ],
  department: [
    "department",
    "dept",
    "academic department",
    "field of study",
    "program",
    "stream",
    "major",
  ],
  joining_year: [
    "club joining year",
    "joining_year",
    "joining year",
    "year",
    "batch",
    "entry year",
    "club entry year",
    "batch year",
    "year of entry",
  ],
  division: [
    "club division (primary)",
    "club division primary",
    "primary division",
    "club division",
    "division",
    "track",
    "assigned division",
    "division choice",
    "preferred division",
    "first division",
    "division 1",
  ],
  secondary_division: [
    "club division (secondary, if you have one)",
    "club division secondary if you have one",
    "club division (secondary)",
    "club division secondary",
    "secondary_division",
    "secondary division",
    "second division",
    "secondary track",
    "optional second division",
    "secondary choice",
    "division 2",
    "track 2",
    "minor division",
  ],
  telegram_username: [
    "telegram profile url (https://t.me/username)",
    "telegram profile url",
    "telegram profile",
    "telegram url",
    "telegram",
    "telegram handle",
    "telegram username",
    "telegram_username",
    "@telegram",
  ],
  github_url: [
    "github profile url (https://github.com/username)",
    "github profile url",
    "github profile",
    "github url",
    "github",
    "github_url",
    "github username",
    "github link",
  ],
  profile_image_url: [
    "upload a clear, front-facing selfie",
    "upload a clear front-facing selfie",
    "upload a clear front facing selfie",
    "clear, front-facing selfie",
    "front-facing selfie",
    "selfie",
    "profile_image_url",
    "profile image",
    "profile picture",
    "profile photo",
    "photo",
    "avatar",
    "picture",
    "upload selfie",
  ],
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function cleanHeaderSimple(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[()\/_\-,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTelegramUsername(raw: string): string {
  let cleaned = raw.trim()
  if (!cleaned) return ""
  cleaned = cleaned.replace(/\/+$/, "")
  if (cleaned.toLowerCase().includes("t.me/")) {
    cleaned = cleaned.split(/t\.me\//i).pop() || ""
  } else if (cleaned.toLowerCase().includes("telegram.me/")) {
    cleaned = cleaned.split(/telegram\.me\//i).pop() || ""
  }
  cleaned = cleaned.split("?")[0].replace(/^@+/, "").trim()
  return cleaned
}

function extractGithubUrl(raw: string): string {
  const cleaned = raw.trim()
  if (!cleaned) return ""
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned
  }
  return `https://github.com/${cleaned.replace(/^@+/, "").trim()}`
}

// Simple RFC-compliant CSV line parser
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

const DIVISION_ALIASES: Record<string, string> = {
  // Form export division names mapped to internal canonical names
  "competitive programming division": "competitive programming",
  "competitive programming": "competitive programming",
  "development division": "development",
  "development": "development",
  "cybersecurity division": "cybersecurity",
  "cybersecurity": "cybersecurity",
  "cyber security division": "cybersecurity",
  "cyber security": "cybersecurity",
  "data science division": "data science",
  "data science": "data science",
  "social media division": "social media",
  "social media": "social media",
  "blockchain team": "blockchain team",
  "blockchain division": "blockchain team",
  "blockchain": "blockchain team",
  "capacity building division": "capacity building",
  "capacity building": "capacity building",
  "cbd": "capacity building",
  "cp": "competitive programming",
  "dev": "development",
}

function resolveDivision(rawName: string, divisions: DivisionOut[]): DivisionOut | null {
  if (!rawName) return null
  const cleaned = rawName.trim().toLowerCase().replace(/\s+/g, " ")
  if (!cleaned) return null

  // 1. Exact match
  const exact = divisions.find((d) => d.name.trim().toLowerCase() === cleaned)
  if (exact) return exact

  // 2. Known alias
  const canonical = DIVISION_ALIASES[cleaned]
  if (canonical) {
    const found = divisions.find((d) => d.name.trim().toLowerCase() === canonical)
    if (found) return found
  }

  // 3. Strip trailing suffix
  for (const suffix of [" division", " team", " track"]) {
    if (cleaned.endsWith(suffix)) {
      const candidate = cleaned.slice(0, -suffix.length).trim()
      const found = divisions.find((d) => d.name.trim().toLowerCase() === candidate)
      if (found) return found
      const fromAlias = DIVISION_ALIASES[candidate]
      if (fromAlias) {
        const aliasFound = divisions.find((d) => d.name.trim().toLowerCase() === fromAlias)
        if (aliasFound) return aliasFound
      }
    }
  }

  // 4. Substring containment
  const match = divisions.find((d) => {
    const dLower = d.name.trim().toLowerCase()
    return cleaned.includes(dLower) || dLower.includes(cleaned)
  })
  if (match) return match

  return null
}

export function CsvImportWizard({ divisions, onImportComplete }: CsvImportWizardProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // Pre-flight client validation state
  const [headersDetected, setHeadersDetected] = useState<Record<string, string>>({})
  const [missingRequiredHeaders, setMissingRequiredHeaders] = useState<string[]>([])
  const [rowPreviews, setRowPreviews] = useState<ParsedRowPreview[]>([])
  const [totalRowsDetected, setTotalRowsDetected] = useState(0)

  const divisionNamesSet = useMemo(() => {
    return new Set(divisions.map((d) => d.name.trim().toLowerCase()))
  }, [divisions])

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile)
    setResult(null)
    setRowPreviews([])
    setHeadersDetected({})
    setMissingRequiredHeaders([])
    setTotalRowsDetected(0)

    if (!selectedFile) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        toast.error("CSV file is empty or missing data rows.")
        return
      }

      // Parse Header
      const rawHeaders = parseCsvLine(lines[0])
      const headerMap: Record<string, number> = {} // canonical field -> column index
      const detectedMap: Record<string, string> = {} // canonical field -> raw header

      rawHeaders.forEach((rawH, idx) => {
        const norm = normalizeHeader(rawH)
        const normSimple = cleanHeaderSimple(rawH)
        if (EXCLUDED_EMAIL_HEADERS.has(normSimple) || EXCLUDED_EMAIL_HEADERS.has(norm)) {
          return
        }

        for (const [canonical, synonyms] of Object.entries(HEADER_ALIASES)) {
          if (norm === canonical || synonyms.includes(norm) || synonyms.includes(normSimple)) {
            if (canonical === "email" && "email" in headerMap) {
              if (
                normSimple.includes("personal") &&
                !detectedMap["email"].toLowerCase().includes("personal")
              ) {
                headerMap["email"] = idx
                detectedMap["email"] = rawH
              }
            } else if (!(canonical in headerMap)) {
              headerMap[canonical] = idx
              detectedMap[canonical] = rawH
            }
            break
          }
        }
      })

      setHeadersDetected(detectedMap)

      const missing: string[] = []
      if (headerMap["email"] === undefined) missing.push("Personal Email (use one you check regularly)")
      if (headerMap["full_name"] === undefined) missing.push("Full Name")
      if (headerMap["student_id"] === undefined) missing.push("Student ID")
      if (headerMap["phone_number"] === undefined) missing.push("Phone Number (+251)")
      if (headerMap["division"] === undefined) missing.push("Club Division (Primary)")
      if (headerMap["department"] === undefined) missing.push("Department")
      if (headerMap["joining_year"] === undefined) missing.push("Club Joining Year")
      if (headerMap["telegram_username"] === undefined) missing.push("Telegram Profile URL")
      if (headerMap["github_url"] === undefined) missing.push("Github Profile URL")
      if (headerMap["profile_image_url"] === undefined) missing.push("Upload Selfie")
      setMissingRequiredHeaders(missing)

      // Parse data rows
      const dataLines = lines.slice(1)
      setTotalRowsDetected(dataLines.length)

      const previews: ParsedRowPreview[] = []
      for (let i = 0; i < Math.min(dataLines.length, 10); i++) {
        const rowValues = parseCsvLine(dataLines[i])
        const email = (headerMap["email"] !== undefined ? rowValues[headerMap["email"]] : "") || ""
        const fullName =
          (headerMap["full_name"] !== undefined ? rowValues[headerMap["full_name"]] : "") || ""
        const studentId =
          (headerMap["student_id"] !== undefined ? rowValues[headerMap["student_id"]] : "") || ""
        const phoneNumber =
          (headerMap["phone_number"] !== undefined ? rowValues[headerMap["phone_number"]] : "") || ""
        const division =
          (headerMap["division"] !== undefined ? rowValues[headerMap["division"]] : "") || ""
        const secondaryDivision =
          (headerMap["secondary_division"] !== undefined ? rowValues[headerMap["secondary_division"]] : "") || ""
        const department =
          (headerMap["department"] !== undefined ? rowValues[headerMap["department"]] : "") || ""
        const year =
          (headerMap["joining_year"] !== undefined ? rowValues[headerMap["joining_year"]] : "") || ""
        const rawTelegram =
          (headerMap["telegram_username"] !== undefined
            ? rowValues[headerMap["telegram_username"]]
            : "") || ""
        const telegram = extractTelegramUsername(rawTelegram)
        const rawGithub =
          (headerMap["github_url"] !== undefined ? rowValues[headerMap["github_url"]] : "") || ""
        const github = extractGithubUrl(rawGithub)
        const selfie =
          (headerMap["profile_image_url"] !== undefined
            ? rowValues[headerMap["profile_image_url"]]
            : "") || ""

        const issues: string[] = []
        if (!email) issues.push("Missing personal email")
        else if (!email.includes("@")) issues.push("Invalid email format")

        if (!fullName) issues.push("Missing full name")
        if (!studentId) issues.push("Missing Student ID")
        if (!phoneNumber) issues.push("Missing Phone Number")

        const resolvedDiv = resolveDivision(division, divisions)
        if (!division) {
          issues.push("Missing primary division")
        } else if (!resolvedDiv) {
          issues.push(`Unrecognized division: "${division}"`)
        }

        const resolvedSecDiv = secondaryDivision ? resolveDivision(secondaryDivision, divisions) : null
        if (secondaryDivision) {
          if (!resolvedSecDiv) {
            issues.push(`Unrecognized secondary division: "${secondaryDivision}"`)
          } else if (resolvedDiv && resolvedSecDiv.id === resolvedDiv.id) {
            issues.push("Secondary division cannot match primary")
          }
        }

        if (!department) issues.push("Missing department")
        if (!year) issues.push("Missing joining year")
        else if (isNaN(Number(year))) issues.push(`Invalid year: "${year}"`)

        if (!telegram) issues.push("Missing Telegram handle or URL")
        if (!github) issues.push("Missing Github profile URL")
        if (!selfie) issues.push("Missing front-facing selfie upload URL")

        previews.push({
          rowNum: i + 2,
          email,
          fullName,
          studentId,
          phoneNumber,
          division,
          secondaryDivision,
          department,
          year,
          telegram,
          github,
          selfie,
          isValid: issues.length === 0,
          issues,
        })
      }

      setRowPreviews(previews)
    }

    reader.readAsText(selectedFile)
  }

  async function handleExecuteImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error("Please select a CSV file first.")
      return
    }

    if (missingRequiredHeaders.length > 0) {
      toast.error("CSV is missing mandatory columns. Please review the specification below.")
      return
    }

    setImporting(true)
    try {
      const res = await adminService.importMembersCsv(file, dryRun)
      setResult(res)

      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ["members"] })
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
        onImportComplete?.()
      }

      if (res.errors.length > 0) {
        toast.warning(
          `Processed with ${res.errors.length} errors: ${res.created} created, ${res.updated} updated.`
        )
      } else {
        toast.success(
          dryRun
            ? `Dry Run Validated: ${res.created} new members ready, ${res.updated} will be updated.`
            : `Success! Imported ${res.created} new members, updated ${res.updated}.`
        )
      }
    } catch (err: any) {
      toast.error("CSV Import failed", { description: err.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Google Form Column Specification Reference Card */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-zinc-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Google Form CSV Format Specification (10 Required, 1 Optional)
          </h4>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The importer maps questions directly from the CSEC Google Form export. Personal email is used for user authentication. Required fields must not be empty.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Personal Email
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required (Login)
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Personal Email (use one you check regularly)</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Full Name
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Full Name</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Student ID
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Student ID</code> (e.g. <code>UGR/12345/14</code>)
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Phone Number
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Phone Number (+251)</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Primary Division
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Club Division (Primary)</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Department
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Department</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Club Joining Year
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Club Joining Year</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Telegram Profile URL
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Telegram Profile URL (https://t.me/username)</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                GitHub Profile URL
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Github Profile URL (https://github.com/username)</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Front-Facing Selfie
              </span>
              <Badge variant="outline" className="text-[10px] border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200">
                Required
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Upload a clear, front-facing selfie</code>
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Secondary Division
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Optional
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Google Form: <code>Club Division (Secondary, if you have one)</code>
            </p>
          </div>
        </div>
      </div>

      {/* 2. File Upload Dropzone */}
      <form onSubmit={handleExecuteImport} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Select or Drop Google Form CSV File</Label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-7 h-7 mb-2 text-zinc-400" />
                <p className="mb-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  {file ? file.name : "Click to select CSV export or drag and drop here"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB — ${totalRowsDetected} member rows detected`
                    : "Supports standard CSV downloads from Google Forms and Google Sheets"}
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* Missing Required Columns Alert */}
        {missingRequiredHeaders.length > 0 && (
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/40 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
            <div>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Missing Required Columns:</strong>
              <p className="mt-0.5 text-zinc-500">
                The uploaded file is missing: {missingRequiredHeaders.join(", ")}. Please rename
                the column header in Google Sheets or ensure the column was exported.
              </p>
            </div>
          </div>
        )}

        {/* Live Pre-Flight Preview Table */}
        {rowPreviews.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Pre-Flight Auto-Mapper &amp; Preview
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Showing first {rowPreviews.length} of {totalRowsDetected} rows
                </Badge>
              </div>

              <div className="text-xs text-zinc-500">
                Headers mapped:{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                  {Object.keys(headersDetected).length}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] bg-zinc-50 dark:bg-zinc-800/60">
                    <TableHead className="w-10">Row</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Personal Email</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Primary Div</TableHead>
                    <TableHead>Secondary Div</TableHead>
                    <TableHead>Dept / Year</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>GitHub</TableHead>
                    <TableHead>Selfie</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowPreviews.map((p) => (
                    <TableRow key={p.rowNum} className="text-xs">
                      <TableCell className="font-mono text-zinc-400">{p.rowNum}</TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        {p.fullName || <span className="text-rose-500 italic">Empty</span>}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {p.email || <span className="text-rose-500 italic">Empty</span>}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                        {p.studentId || <span className="text-rose-500 italic">Empty</span>}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                        {p.phoneNumber || <span className="text-rose-500 italic">Empty</span>}
                      </TableCell>
                      <TableCell>
                        {p.division ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              divisionNamesSet.has(p.division.toLowerCase())
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                            }`}
                          >
                            {p.division}
                          </span>
                        ) : (
                          <span className="text-rose-500 italic text-[11px]">Required</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.secondaryDivision ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              divisionNamesSet.has(p.secondaryDivision.toLowerCase())
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                            }`}
                          >
                            {p.secondaryDivision}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-[11px]">
                        {p.department || <span className="text-rose-500 italic">Empty</span>}{" "}
                        {p.year ? `(${p.year})` : <span className="text-rose-500 italic">(Empty)</span>}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-[11px]">
                        {p.telegram ? (
                          <span className="font-mono">@{p.telegram}</span>
                        ) : (
                          <span className="text-rose-500 italic">Empty</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[100px] truncate">
                        {p.github ? (
                          <a
                            href={p.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate block"
                            title={p.github}
                          >
                            GitHub
                          </a>
                        ) : (
                          <span className="text-rose-500 italic">Empty</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[90px] truncate">
                        {p.selfie ? (
                          <a
                            href={p.selfie}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate block"
                            title={p.selfie}
                          >
                            Selfie
                          </a>
                        ) : (
                          <span className="text-rose-500 italic">Empty</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.isValid ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]"
                          >
                            <Check className="h-3 w-3 mr-0.5" /> Ready
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-300 text-[10px]"
                            title={p.issues.join("; ")}
                          >
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> {p.issues[0]}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Dry-Run Toggle & Action Button */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Dry-Run Mode (Validation Only)
            </div>
            <div className="text-[11px] text-zinc-500">
              Validates headers, emails, and division mappings without writing database records.
            </div>
          </div>
          <Switch checked={dryRun} onCheckedChange={setDryRun} />
        </div>

        <Button
          type="submit"
          disabled={!file || missingRequiredHeaders.length > 0 || importing}
          size="sm"
          className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {importing ? (
            <>
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              Processing CSV...
            </>
          ) : dryRun ? (
            "Run Dry-Run Pre-Flight Validation"
          ) : (
            "Execute Live Member Import"
          )}
        </Button>
      </form>

      {/* 3. Helpful Response Summary Display */}
      {result && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Import Execution Results:
            </div>
            {dryRun && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                Dry-Run Simulated
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-zinc-400 text-[10px] uppercase font-semibold">New Members</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {result.created}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-zinc-400 text-[10px] uppercase font-semibold">Updated Existing</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {result.updated}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-zinc-400 text-[10px] uppercase font-semibold">Errors / Skipped</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {result.errors.length}
              </div>
            </div>
          </div>

          {/* Unmatched Divisions Section */}
          {result.unmatched_divisions && result.unmatched_divisions.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Unmatched Division Names ({result.unmatched_divisions.length} rows):
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                The following rows have division names that did not match active club divisions. They were imported without an assigned division:
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                {result.unmatched_divisions.map((u, i) => (
                  <div key={i} className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                    Row {u.row} ({u.email}): &quot;{u.division_name}&quot;
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Detail Section */}
          {result.errors.length > 0 && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5" />
                Error Details ({result.errors.length} rows failed):
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] font-mono">
                {result.errors.map((e, idx) => (
                  <div key={idx} className="text-rose-700 dark:text-rose-400">
                    Row {e.row} {e.email ? `(${e.email})` : ""}: {e.issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
