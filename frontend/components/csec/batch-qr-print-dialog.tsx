"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Printer, QrCode, Search, X } from "lucide-react"
import type { DivisionOut, MemberOut } from "@/lib/api"
import { ROLE_LABELS, type Role } from "@/lib/csec-data"
import { useMembers } from "@/hooks/queries"
import {
  memberVerificationUrl,
  qrServerUrl,
  stickerIdFor,
  truncateStickerName,
} from "@/lib/qr-sticker"

/** Stickers per printed A4 page (3 columns × 3 rows). */
const STICKERS_PER_PAGE = 9

interface BatchQrPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fallback roster while the full fetch loads */
  members: MemberOut[]
  divisions: DivisionOut[]
}

export function BatchQrPrintDialog({
  open,
  onOpenChange,
  members: fallbackMembers,
  divisions,
}: BatchQrPrintDialogProps) {
  const [q, setQ] = useState("")
  const [division, setDivision] = useState("all")
  const [role, setRole] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [year, setYear] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: rosterData, isLoading: rosterLoading } = useMembers({
    page: 1,
    page_size: 500,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  })

  const members = rosterData?.items?.length ? rosterData.items : fallbackMembers

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      setQ("")
      setDivision("all")
      setRole("all")
      setStatusFilter("active")
      setYear("all")
    }
  }, [open])

  const divisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) map[d.id] = d.name
    return map
  }, [divisions])

  const years = useMemo(
    () =>
      [...new Set(members.map((m) => m.joining_year).filter(Boolean) as number[])].sort(
        (a, b) => b - a,
      ),
    [members],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return members.filter((m) => {
      if (statusFilter === "active" && !m.is_active) return false
      if (statusFilter === "inactive" && m.is_active) return false
      if (division !== "all" && m.division_id !== division) return false
      if (role !== "all" && m.role !== role) return false
      if (year !== "all" && String(m.joining_year) !== year) return false
      if (!needle) return true
      const hay = `${m.full_name} ${m.email} ${m.student_id || ""}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [members, q, division, role, statusFilter, year])

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id))

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const m of filtered) next.delete(m.id)
      } else {
        for (const m of filtered) next.add(m.id)
      }
      return next
    })
  }

  const selectedMembers = useMemo(
    () =>
      members
        .filter((m) => selectedIds.has(m.id))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [members, selectedIds],
  )

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function handlePrint() {
    if (selectedMembers.length === 0) {
      toast.error("Select at least one member to print")
      return
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700")
    if (!printWindow) {
      toast.error("Allow pop-ups to print QR stickers")
      return
    }

    const origin = window.location.origin
    const stickersHtml = selectedMembers
      .map((m) => {
        const url = memberVerificationUrl(m.id)
        const qr = qrServerUrl(url, 280)
        const sid = stickerIdFor(m.id, m.joining_year)
        const divisionName =
          (m.division_id && divisionMap[m.division_id]) || m.division_name || "General"
        const centerName = truncateStickerName(m.full_name, 16)
        return `
        <article class="sticker">
          <div class="meta"><span>ASTU CSEC LAB</span><span>${escapeHtml(sid)}</span></div>
          <div class="title">Physical Security Clearance</div>
          <div class="qr-wrap">
            <img class="qr" src="${qr}" alt="QR" />
            <div class="center-badge">
              <div>
                <img src="${origin}/csec_astu.svg" alt="CSEC ASTU" />
                <span>${escapeHtml(centerName)}</span>
              </div>
            </div>
          </div>
          <div class="name">${escapeHtml(m.full_name)}</div>
          <div class="division">${escapeHtml(divisionName)}</div>
        </article>`
      })
      .join("\n")

    const pageCount = Math.ceil(selectedMembers.length / STICKERS_PER_PAGE)

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>CSEC QR Stickers — ${selectedMembers.length} members</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      color: #09090b;
      background: #fff;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm 5mm;
      align-content: start;
    }
    .sticker {
      border: 1.25px dashed #a1a1aa;
      border-radius: 8px;
      padding: 5px 6px 8px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      min-height: 78mm;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .meta {
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-size: 6.5px;
      font-family: ui-monospace, monospace;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 3px;
    }
    .title {
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .qr-wrap {
      position: relative;
      display: inline-flex;
      background: #fff;
      padding: 3px;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
    }
    .qr-wrap img.qr { width: 42mm; height: 42mm; display: block; }
    .center-badge {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .center-badge > div {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 5px;
      padding: 3px 4px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      max-width: 40%;
    }
    .center-badge img { width: 12mm; height: auto; display: block; }
    .center-badge span {
      font-size: 5.5px;
      font-weight: 700;
      line-height: 1.1;
      text-align: center;
      word-break: break-word;
    }
    .name {
      margin-top: 5px;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      max-width: 100%;
      padding: 0 2px;
    }
    .division {
      margin-top: 2px;
      font-size: 8px;
      color: #3f3f46;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <p class="no-print" style="padding:12px;font-size:13px;color:#52525b;">
    Printing ${selectedMembers.length} stickers across ~${pageCount} page(s) (${STICKERS_PER_PAGE} per page). Close this tab when done.
  </p>
  <div class="sheet">
    ${stickersHtml}
  </div>
  <script>
    window.onload = function () {
      var imgs = Array.prototype.slice.call(document.images);
      var pending = imgs.length;
      function maybePrint() {
        if (pending <= 0) setTimeout(function () { window.print(); }, 200);
      }
      if (!pending) { maybePrint(); return; }
      imgs.forEach(function (img) {
        if (img.complete) { pending--; maybePrint(); }
        else {
          img.onload = img.onerror = function () { pending--; maybePrint(); };
        }
      });
      setTimeout(function () { window.print(); }, 4000);
    };
  </script>
</body>
</html>`)
    printWindow.document.close()
    toast.success(`Prepared ${selectedMembers.length} QR stickers for printing`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5" />
            Batch Print Laptop QR Stickers
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select members, then print stickers in batches — {STICKERS_PER_PAGE} per A4 page
            (3×3 grid). President &amp; Vice President only.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or student ID…"
              className="h-8 pl-8 text-xs"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All divisions
                </SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All roles
                </SelectItem>
                {(["member", "division_head", "vice_president", "president"] as Role[]).map(
                  (r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All years
                </SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All status
                </SelectItem>
                <SelectItem value="active" className="text-xs">
                  Active
                </SelectItem>
                <SelectItem value="inactive" className="text-xs">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={() => toggleAllFiltered()}
              />
              Select all filtered ({filtered.length})
              {rosterLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
            </label>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {selectedIds.size} selected · ~
              {Math.max(1, Math.ceil(Math.max(selectedIds.size, 1) / STICKERS_PER_PAGE))} page
              {selectedIds.size > STICKERS_PER_PAGE ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 min-h-[240px] max-h-[42vh]">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-xs text-zinc-500">No members match these filters.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filtered.map((m) => {
                const checked = selectedIds.has(m.id)
                const divisionName =
                  (m.division_id && divisionMap[m.division_id]) || m.division_name || "General"
                return (
                  <li key={m.id}>
                    <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <Checkbox checked={checked} onCheckedChange={() => toggleOne(m.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {m.full_name}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {divisionName} · {ROLE_LABELS[m.role as Role] || m.role}
                          {m.joining_year ? ` · ${m.joining_year}` : ""}
                        </p>
                      </div>
                      {!m.is_active && (
                        <Badge variant="outline" className="text-[9px] text-rose-500 border-rose-500/30">
                          Inactive
                        </Badge>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print {selectedIds.size || ""} Sticker{selectedIds.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
