"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrentUser } from "@/components/user-context"
import { canAccessAdmin, canManagePermissions, canManageSettings, canExecuteAnnualReset } from "@/lib/permissions"
import {
  TASK_CATEGORY_LABELS,
  PLATFORM_SETTINGS,
  POINT_EVENTS,
  type TaskDef,
  type TaskCategory,
  type PlatformSettings,
  type PointEvent,
  type LoginAttemptFailure,
} from "@/lib/csec-data"
import { StatusPill, PointDelta, MemberAvatar, EventTypePill } from "@/components/csec/ui-bits"
import {
  Lock,
  Plus,
  Pencil,
  Sliders,
  History,
  RotateCcw,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Upload,
  UserX,
  KeyRound,
  CheckCircle2,
  Download,
  Loader2,
  Search,
  X,
  Mail,
  Send,
  Eye,
} from "lucide-react"
import {
  adminService,
  tasksService,
  settingsService,
  divisionsService,
  type TaskOut,
  type LoginFailureOut,
  type PointEventOut,
  type DivisionOut,
} from "@/lib/api"
import { AdminSkeleton } from "@/components/csec/skeletons"
import {
  useTasks,
  useDivisions,
  useMembers,
  usePlatformSettings,
  useAuditLog,
  useLoginFailures,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"
import { CsvImportWizard } from "@/components/csec/csv-import-wizard"
import { exportToCsv, type CsvColumn } from "@/lib/csv-export"
import { AlumniAdminTab } from "./components/alumni-admin-tab"

const CATEGORIES = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]

type Draft = Omit<TaskDef, "id"> & { id?: string; division_id?: string | null }

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  points: 10,
  category: "division_session",
  active: true,
  division_id: null,
}

export default function AdminPage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: tasksData, isLoading: tasksLoading } = useTasks({ page_size: 100 })
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const { data: fetchedSettings, isLoading: settingsLoading } = usePlatformSettings()
  // Audit log and login failures are President/VP-only on the API; don't request them otherwise.
  const canSeeSecurityLogs = canAccessAdmin(currentUser)
  const { data: fetchedFailures, isLoading: failuresLoading } = useLoginFailures(undefined, canSeeSecurityLogs)
  const { data: fetchedAudit, isLoading: auditLoading } = useAuditLog({ page_size: 100 }, canSeeSecurityLogs)
  const { data: membersData } = useMembers({ page_size: 100 })

  const createTaskMutation = useCreateTaskMutation()
  const updateTaskMutation = useUpdateTaskMutation()

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [open, setOpen] = useState(false)
  const [resetCompleted, setResetCompleted] = useState(false)
  const [taskErrorBanner, setTaskErrorBanner] = useState<{ message: string; taskId?: string } | null>(null)
  const [taskSearchQuery, setTaskSearchQuery] = useState("")
  const [debouncedTaskSearch, setDebouncedTaskSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTaskSearch(taskSearchQuery.trim().toLowerCase())
    }, 200)
    return () => clearTimeout(timer)
  }, [taskSearchQuery])

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings>(PLATFORM_SETTINGS)

  // Sync settings when loaded
  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        scoreCap: fetchedSettings.score_cap,
        initialBuffer: fetchedSettings.initial_buffer,
        currentAcademicYear: fetchedSettings.current_academic_year,
        badgeTierMultipliers: fetchedSettings.badge_tier_multipliers,
      })
    }
  }, [fetchedSettings])

  // CSV Import State (§13)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    skipped: number
    errors: string[]
  } | null>(null)

  // Presidential Communications State (§GAS Executive Dispatch)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailTitle, setEmailTitle] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailAudience, setEmailAudience] = useState<"all" | "active_only" | "officers_only" | "division">("active_only")
  const [emailDivisionId, setEmailDivisionId] = useState<string>("")
  const [emailBadge, setEmailBadge] = useState("OFFICIAL NOTICE")
  const [emailCtaText, setEmailCtaText] = useState("")
  const [emailCtaUrl, setEmailCtaUrl] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)

  async function handleSendPresidentialEmail() {
    if (!emailSubject.trim() || !emailTitle.trim() || !emailBody.trim()) {
      toast.error("Please fill in Subject, Headline Title, and Message Body.")
      return
    }
    if (emailAudience === "division" && !emailDivisionId) {
      toast.error("Please select a target division.")
      return
    }
    setSendingEmail(true)
    try {
      const res = await adminService.sendPresidentialEmail({
        subject: emailSubject.trim(),
        title: emailTitle.trim(),
        message_body: emailBody.trim(),
        target_audience: emailAudience,
        division_id: emailAudience === "division" ? emailDivisionId : undefined,
        badge: emailBadge.trim() || "OFFICIAL NOTICE",
        cta_text: emailCtaText.trim() || undefined,
        cta_url: emailCtaUrl.trim() || undefined,
        sender_title: "Office of the President",
      })
      if (res.status === "skipped") {
        toast.warning(res.detail?.reason || "Skipped: check Apps Script webhook configuration.")
      } else {
        toast.success(`Executive broadcast dispatched to ${res.recipients_count} recipient(s)!`)
        setEmailSubject("")
        setEmailTitle("")
        setEmailBody("")
        setEmailCtaText("")
        setEmailCtaUrl("")
        setEmailConfirmOpen(false)
      }
    } catch (err: any) {
      toast.error("Failed to send broadcast", { description: err.message })
    } finally {
      setSendingEmail(false)
    }
  }

  const divisions: DivisionOut[] = divisionsData || []

  const memberMap = useMemo(
    () => new Map((membersData?.items || []).map((m) => [m.id, m.full_name])),
    [membersData]
  )

  const tasks: TaskDef[] = useMemo(() => {
    const taskList = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.items ?? []
    return taskList.map((t: any) => ({
      id: t.id,
      title: t.title,
      category: t.category as any,
      points: t.base_points,
      description: t.description || "",
      active: t.active,
      isPenalty: t.is_penalty,
      division_id: t.division_id ?? null,
    }))
  }, [tasksData])

  const auditEvents: PointEvent[] = useMemo(() => {
    if (fetchedAudit?.items && fetchedAudit.items.length > 0) {
      return fetchedAudit.items.map((e: PointEventOut) => {
        const memberName = e.member_name || memberMap.get(e.member_id) || "Club Member"

        let approverName = e.approver_name
        if (!approverName) {
          if (e.approved_by) {
            if (e.approved_by === e.member_id) {
              approverName = "Auto-Approved (System)"
            } else {
              approverName = memberMap.get(e.approved_by) || "Officer"
            }
          } else if (e.status === "pending") {
            approverName = "Pending Review"
          } else if (e.status === "approved") {
            approverName = "Auto-Approved"
          } else {
            approverName = "—"
          }
        }

        return {
          id: e.id,
          memberId: e.member_id,
          memberName,
          taskTitle: e.task_title || e.reason,
          category: "division_session" as any,
          eventType: e.event_type as any,
          delta: e.points_delta,
          status: e.status as any,
          reason: e.reason,
          decisionReason: e.decision_reason,
          approverId: e.approved_by,
          approverName,
          academicYear: e.academic_year,
          createdAt: e.created_at,
        }
      })
    }
    return POINT_EVENTS
  }, [fetchedAudit, memberMap])

  const loginFailures: LoginAttemptFailure[] = useMemo(() => {
    return (fetchedFailures?.items || []).map((f: any) => ({
      id: f.id,
      email: f.email,
      googleId: f.google_id,
      reason: f.reason,
      createdAt: f.created_at,
    }))
  }, [fetchedFailures])

  const isLoading = tasksLoading || divisionsLoading || settingsLoading || failuresLoading || auditLoading

  const allowed = canManagePermissions(currentUser)
  const isPresident = canManageSettings(currentUser)

  const divisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) {
      map[d.id] = d.name
    }
    return map
  }, [divisions])

  const filteredTasks = useMemo(() => {
    if (!debouncedTaskSearch) return tasks
    return tasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(debouncedTaskSearch)
      const descMatch = t.description?.toLowerCase().includes(debouncedTaskSearch)
      const catMatch =
        TASK_CATEGORY_LABELS[t.category]?.toLowerCase().includes(debouncedTaskSearch) ||
        t.category.toLowerCase().includes(debouncedTaskSearch)
      const divName = t.division_id ? divisionMap[t.division_id]?.toLowerCase() : "club-wide"
      const divMatch = divName?.includes(debouncedTaskSearch)
      return titleMatch || descMatch || catMatch || divMatch
    })
  }, [tasks, debouncedTaskSearch, divisionMap])

  const groupedTasks = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        category: c,
        items: filteredTasks.filter((t) => t.category === c),
      })).filter((g) => g.items.length > 0),
    [filteredTasks],
  )

  const resetPreview = useMemo(() => {
    // Preview uses the live audit events to estimate final scores
    const memberMap = new Map<string, { name: string; division: string; score: number }>()
    for (const e of auditEvents) {
      if (e.status === "approved") {
        const existing = memberMap.get(e.memberId)
        if (existing) {
          existing.score += e.delta
        } else {
          memberMap.set(e.memberId, {
            name: (e as any).member_name ?? e.memberId,
            division: "—",
            score: settings.initialBuffer + e.delta,
          })
        }
      }
    }
    return Array.from(memberMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score)
  }, [auditEvents, settings.initialBuffer])

  if (!allowed) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <Lock className="h-8 w-8 text-zinc-400" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Officers Only</h1>
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Access to the administration portal is restricted to club officers and the president.
          </p>
        </div>
      </Layout>
    )
  }

  function startCreate() {
    setDraft(EMPTY_DRAFT)
    setOpen(true)
  }

  function startEdit(t: TaskDef) {
    setDraft({
      ...t,
      division_id: t.division_id ?? null,
    })
    setOpen(true)
  }

  async function saveTask() {
    if (!draft.title.trim()) {
      toast.error("Task title is required.")
      return
    }
    const taskPayload = {
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      base_points: draft.points,
      category: draft.category,
      active: draft.active,
      division_id: draft.division_id || null,
    }
    try {
      if (draft.id && !draft.id.startsWith("local-")) {
        await updateTaskMutation.mutateAsync({ id: draft.id, data: taskPayload })
        toast.success("Task definition updated")
      } else {
        await createTaskMutation.mutateAsync(taskPayload)
        toast.success("New task created")
      }
      setOpen(false)
      setDraft(EMPTY_DRAFT)
    } catch (err: any) {
      setTaskErrorBanner({
        message: `Failed to save task "${draft.title}": ${err.message || "Server error"}`,
        taskId: draft.id,
      })
      toast.error("Failed to save task", { description: err.message })
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setTaskErrorBanner(null)
    try {
      if (!id.startsWith("local-")) {
        await updateTaskMutation.mutateAsync({ id, data: { active } })
      }
      toast.success(`Task ${active ? "activated" : "deactivated"}`)
    } catch (err: any) {
      setTaskErrorBanner({
        message: `Failed to ${active ? "activate" : "deactivate"} task: ${err.message || "Server error"}`,
        taskId: id,
      })
      toast.error("Failed to update task status", { description: err.message })
    }
  }

  async function savePlatformSettings(e: React.FormEvent) {
    e.preventDefault()
    try {
      await settingsService.updateSettings({
        score_cap: settings.scoreCap,
        initial_buffer: settings.initialBuffer,
        current_academic_year: settings.currentAcademicYear,
        badge_tier_multipliers: settings.badgeTierMultipliers,
      })
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] })
      toast.success("Platform settings updated successfully")
    } catch (err: any) {
      toast.error("Failed to save settings", { description: err.message })
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!importFile) {
      toast.error("Please select a CSV file to import.")
      return
    }

    setImporting(true)
    try {
      const res = await adminService.importMembersCsv(importFile, dryRun)
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ["members"] })
      }
      setImportResult({
        created: res.created,
        updated: res.updated,
        skipped: res.errors.length,
        errors: res.errors.map((e) => `Row ${e.row} (${e.email}): ${e.issue}`),
      })
      if (dryRun) {
        toast.success(`Dry run complete: ${res.created} new, ${res.updated} updates.`)
      } else {
        toast.success(`Import complete: ${res.created} members created, ${res.updated} updated!`)
      }
    } catch (err: any) {
      toast.error("CSV Import failed", { description: err.message })
    } finally {
      setImporting(false)
    }
  }

  async function executeAnnualReset() {
    try {
      const res = await adminService.executeAnnualReset()
      setResetCompleted(true)
      setSettings((prev) => ({
        ...prev,
        currentAcademicYear: res.new_academic_year,
      }))
      queryClient.invalidateQueries()
      toast.success(`Annual reset executed successfully!`, {
        description: `Academic year advanced to ${res.new_academic_year}. All member scores archived.`,
      })
    } catch (err: any) {
      toast.error("Annual reset failed", { description: err.message })
    }
  }

  return (
    <Layout>
      {isLoading && tasks.length === 0 ? (
        <AdminSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="Club Administration &amp; Governance"
          description="Manage global tasks, tune platform scoring parameters, bulk-import member CSVs, audit the ledger, and inspect login failures."
        />

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="flex flex-wrap items-center gap-1 w-full bg-zinc-100/80 dark:bg-zinc-900/80 p-1 rounded-xl">
            <TabsTrigger value="catalog">Task Catalog</TabsTrigger>
            <TabsTrigger value="import">CSV Import</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="failures">Login Failures</TabsTrigger>
            <TabsTrigger value="reset">Annual Reset</TabsTrigger>
            <TabsTrigger value="alumni">Alumni</TabsTrigger>
            {currentUser?.role === "president" && (
              <TabsTrigger value="communications" className="text-violet-600 dark:text-violet-400 font-medium">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Executive Broadcast
              </TabsTrigger>
            )}
          </TabsList>

          {/* 1. Task Catalog Tab */}
          <TabsContent value="catalog" className="mt-4 space-y-6">
            {taskErrorBanner && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span className="font-semibold">Action failed: </span>
                    <span>{taskErrorBanner.message}</span>
                    <span className="ml-1 opacity-80">(State has been reverted)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskErrorBanner(null)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Global Task Definitions
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tasks members can claim for verified points.
                </p>
              </div>
              <Button size="sm" onClick={startCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Task
              </Button>
            </div>

            {/* Debounced Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search tasks by title, category, division..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {debouncedTaskSearch && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    Showing <strong>{filteredTasks.length}</strong> of {tasks.length} tasks
                  </span>
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery("")}
                    className="text-violet-600 hover:underline dark:text-violet-400 text-xs font-medium cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

            {groupedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Search className="h-8 w-8 text-zinc-400 opacity-60" />
                  <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">
                    No matching tasks found
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    No task titles, categories, or divisions matched &ldquo;{debouncedTaskSearch}&rdquo;.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTaskSearchQuery("")}
                    className="mt-2 text-xs"
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
              {groupedTasks.map((group) => (
                <div
                  key={group.category}
                  className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      {TASK_CATEGORY_LABELS[group.category]}
                    </h2>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {group.items.length} tasks
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent text-xs">
                        <TableHead>Task Title &amp; Description</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-16 text-right">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {t.title}
                              </span>
                              {t.division_id && divisionMap[t.division_id] ? (
                                <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary">
                                  {divisionMap[t.division_id]}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] font-normal text-zinc-500">
                                  Club-Wide
                                </Badge>
                              )}
                            </div>
                            <div className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {t.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +{t.points}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={t.active}
                                onCheckedChange={(v) => toggleActive(t.id, v)}
                                aria-label={`Toggle ${t.title}`}
                              />
                              <Badge
                                variant={t.active ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {t.active ? "Active" : "Off"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit {t.title}</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
            )}
          </TabsContent>

          {/* 2. CSV Member Import Tab (§13) */}
          <TabsContent value="import" className="mt-4">
            <div className="max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    Google Form CSV Member Import &amp; Auto-Mapper
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Pre-flight validate, auto-map headers, and upsert verified club members directly from Google Form CSV spreadsheets.
                  </p>
                </div>
              </div>

              <CsvImportWizard divisions={divisions} />
            </div>
          </TabsContent>

          {/* 3. Platform Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    Platform &amp; Scoring Parameters
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tunable platform settings as specified in PRD §4a &amp; API Contract §10.
                  </p>
                </div>
                {!isPresident && (
                  <Badge variant="outline" className="text-xs text-amber-600">
                    Read-only (President only)
                  </Badge>
                )}
              </div>

              <form onSubmit={savePlatformSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="score-cap" className="text-xs">Annual Score Cap (points/year)</Label>
                    <Input
                      id="score-cap"
                      type="number"
                      value={settings.scoreCap}
                      disabled={!isPresident}
                      onChange={(e) =>
                        setSettings({ ...settings, scoreCap: Number(e.target.value) })
                      }
                    />
                    <p className="text-[11px] text-zinc-500">Ceiling for leaderboard ranking (default: 2,500 pts).</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="buffer-val" className="text-xs">Initial Loss-Aversion Buffer</Label>
                    <Input
                      id="buffer-val"
                      type="number"
                      value={settings.initialBuffer}
                      disabled={!isPresident}
                      onChange={(e) =>
                        setSettings({ ...settings, initialBuffer: Number(e.target.value) })
                      }
                    />
                    <p className="text-[11px] text-zinc-500">Starting buffer credited to every member (default: +50 pts).</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="curr-year" className="text-xs">Current Active Academic Year</Label>
                    <Input
                      id="curr-year"
                      type="number"
                      value={settings.currentAcademicYear}
                      disabled={!isPresident}
                      onChange={(e) =>
                        setSettings({ ...settings, currentAcademicYear: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Tier Badges (Capped Member Progression)
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="font-semibold text-amber-600 dark:text-amber-400">Gold Badge</div>
                      <div className="text-zinc-500 mt-0.5">1.0x cap (≥ {settings.scoreCap} pts)</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="font-semibold text-cyan-600 dark:text-cyan-400">Platinum Badge</div>
                      <div className="text-zinc-500 mt-0.5">1.5x cap (≥ {settings.scoreCap * 1.5} pts)</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="font-semibold text-violet-600 dark:text-violet-400">Diamond Badge</div>
                      <div className="text-zinc-500 mt-0.5">2.0x cap (≥ {settings.scoreCap * 2.0} pts)</div>
                    </div>
                  </div>
                </div>

                {isPresident && (
                  <Button type="submit" size="sm" className="mt-2">
                    Save Platform Settings
                  </Button>
                )}
              </form>
            </div>
          </TabsContent>

          {/* 4. Club Audit Log Tab (Improvement 02 & 05) */}
          <TabsContent value="audit" className="mt-4 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Club-Wide Audit Log ({auditEvents.length})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Append-only ledger of all claims, adjustments, warnings, and officer actions across all divisions.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const columns: CsvColumn<PointEvent>[] = [
                      { key: "id", label: "Event ID" },
                      { key: "createdAt", label: "Timestamp" },
                      { key: (e) => e.memberName || "Member", label: "Member" },
                      { key: "taskTitle", label: "Task / Event" },
                      { key: "eventType", label: "Type" },
                      { key: "delta", label: "Points Delta" },
                      { key: "status", label: "Status" },
                      { key: "reason", label: "Reason / Notes" },
                      { key: (e) => e.approverName || (e.approverId ? "Officer" : "—"), label: "Approver" },
                    ]
                    exportToCsv("csec_club_audit_log", columns, auditEvents)
                  }}
                  disabled={auditEvents.length === 0}
                  className="h-8 text-xs gap-1.5 border-zinc-200 dark:border-zinc-800"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  Export Audit Trail (CSV)
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Event / Task</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes &amp; Decision</TableHead>
                      <TableHead>Approver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLoading && !fetchedAudit ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                            <span className="text-xs">Loading audit ledger...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : auditEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <History className="h-6 w-6 text-zinc-400 opacity-60" />
                            <p className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">No audit events found</p>
                            <p className="text-[11px] text-zinc-400">Claims, manual adjustments, and officer decisions will appear here.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditEvents.map((e) => (
                      <TableRow key={e.id} className="text-xs">
                        <TableCell className="text-zinc-500 whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {e.memberName || "Club Member"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{e.taskTitle}</div>
                        </TableCell>
                        <TableCell>
                          <EventTypePill type={e.eventType ?? "claim"} />
                        </TableCell>
                        <TableCell className="text-right">
                          <PointDelta value={e.delta} />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={e.status} />
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-[11px] text-zinc-700 dark:text-zinc-300 line-clamp-1">&ldquo;{e.reason}&rdquo;</div>
                          {e.decisionReason && (
                            <div className="text-[10px] text-zinc-500 italic line-clamp-1">
                              Decision: {e.decisionReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-300">
                          <span className="text-xs font-medium">
                            {e.approverName || (e.approverId ? "Officer" : "—")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* 5. Login Failures Tab (Improvement 08) */}
          <TabsContent value="failures" className="mt-4 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <UserX className="h-4 w-4 text-amber-500" />
                    Unmatched Login Attempts Log ({loginFailures.length})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Google OAuth attempts by emails not yet present in the verified members table (Improvement 01 &amp; 08).
                  </p>
                </div>
              </div>

              {loginFailures.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-dashed rounded-lg">
                  No failed login attempts recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Attempted Email</TableHead>
                        <TableHead>Google ID</TableHead>
                        <TableHead>Failure Reason</TableHead>
                        <TableHead className="text-right">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginFailures.map((f) => (
                        <TableRow key={f.id} className="text-xs">
                          <TableCell className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {f.email}
                          </TableCell>
                          <TableCell className="font-mono text-zinc-500">
                            {f.googleId || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                              {f.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-zinc-500">
                            {new Date(f.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 6. Annual Reset Tab */}
          <TabsContent value="reset" className="mt-4 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Annual Cycle Archive &amp; Score Reset (PRD §4a)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Snapshots active cycle scores into permanent `annual_summaries` records and resets cycle score with a fresh +{settings.initialBuffer} buffer. Lifetime Career Score is preserved.
                  </p>
                </div>

                {isPresident && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <RotateCcw className="mr-1.5 h-4 w-4" /> Execute Annual Reset
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Execute Year-End Annual Reset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will archive Academic Year {settings.currentAcademicYear} into permanent historical records, snapshot final ranks and tier badges, and advance the platform to Academic Year {settings.currentAcademicYear + 1}. All members start the new cycle with a +{settings.initialBuffer} loss-aversion buffer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeAnnualReset} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Confirm &amp; Advance Academic Year
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Dry-Run Snapshot Preview Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Dry-Run Snapshot Preview (Year {settings.currentAcademicYear})
                  </span>
                  <span>{resetPreview.length} active members to archive</span>
                </div>

                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs hover:bg-transparent">
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead className="text-right">Snapshot Final Score</TableHead>
                        <TableHead className="text-right">New Cycle Starting Buffer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {resetPreview.map((item, idx) => (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="font-semibold tabular-nums text-zinc-500">
                            #{idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-zinc-500">{item.division}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {item.score} pts
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            +{settings.initialBuffer} pts
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 7. Executive Presidential Communications Tab */}
          {currentUser?.role === "president" && (
            <TabsContent value="communications" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Email Composer */}
                <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-sm">
                  <div className="space-y-1 pb-4 border-b border-zinc-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10">
                        Presidential Authority Only
                      </Badge>
                      <span className="text-xs text-zinc-400">· Powered by Google Cloud (GAS)</span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-1">
                      Executive Announcement Dispatcher
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Deliver official notices and presidential addresses directly to members&apos; personal inboxes via the club&apos;s authenticated Gmail engine.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Audience Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Target Audience
                      </Label>
                      <Select
                        value={emailAudience}
                        onValueChange={(val: any) => setEmailAudience(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active_only">Active Enrolled Members (Default)</SelectItem>
                          <SelectItem value="all">All Registered Club Accounts</SelectItem>
                          <SelectItem value="officers_only">Club Officers &amp; Division Heads Only</SelectItem>
                          <SelectItem value="division">Specific Division Enrollees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {emailAudience === "division" && (
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Target Division
                        </Label>
                        <Select
                          value={emailDivisionId}
                          onValueChange={(val) => setEmailDivisionId(val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Choose division..." />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} Division
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Subject Line */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Email Subject Line
                      </Label>
                      <Input
                        placeholder="e.g. Official Address: General Assembly & Q4 Strategy"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Announcement Headline */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Announcement Headline
                        </Label>
                        <Input
                          placeholder="e.g. Q4 General Assembly & Strategy"
                          value={emailTitle}
                          onChange={(e) => setEmailTitle(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      {/* Header Badge */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Letterhead Badge Tag
                        </Label>
                        <Input
                          placeholder="e.g. EXECUTIVE NOTICE, URGENT"
                          value={emailBadge}
                          onChange={(e) => setEmailBadge(e.target.value)}
                          className="h-9 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Message Body
                        </Label>
                        <span className="text-[10px] text-zinc-400">Paragraphs separated by blank lines</span>
                      </div>
                      <Textarea
                        rows={7}
                        placeholder="Write your presidential announcement or message to the club here. Double line breaks create clean paragraphs..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="text-xs leading-relaxed font-sans"
                      />
                    </div>

                    {/* Optional CTA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border border-zinc-200/80 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-950/30">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Action Button Label (Optional)
                        </Label>
                        <Input
                          placeholder="e.g. Join Google Meet Stream"
                          value={emailCtaText}
                          onChange={(e) => setEmailCtaText(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Action Button Link (Optional)
                        </Label>
                        <Input
                          placeholder="https://..."
                          value={emailCtaUrl}
                          onChange={(e) => setEmailCtaUrl(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={() => {
                          if (!emailSubject.trim() || !emailTitle.trim() || !emailBody.trim()) {
                            toast.error("Please fill in Subject, Headline Title, and Message Body.")
                            return
                          }
                          setEmailConfirmOpen(true)
                        }}
                        disabled={sendingEmail}
                        className="bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs h-9 px-5 shadow-lg shadow-violet-500/20"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Review &amp; Dispatch Broadcast
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right: Live Minimalist Email Preview */}
                <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#09090b] p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-zinc-800/80">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                      <Eye className="h-3.5 w-3.5 text-violet-400" /> Live Recipient Inbox Preview
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Minimalist Spec</span>
                  </div>

                  {/* Simulated Email Viewport */}
                  <div className="rounded-xl border border-zinc-800 bg-[#111114] p-5 space-y-4 text-left shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="pb-3 border-b border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] font-bold tracking-widest uppercase bg-[#1a1a1e] border border-[#2e2e34] text-zinc-300 px-2 py-0.5 rounded">
                          {emailBadge.trim() || "OFFICIAL NOTICE"}
                        </span>
                        <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                          CSEC ASTU
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white tracking-tight leading-snug">
                        {emailTitle.trim() || "Announcement Headline"}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Dispatched from the Office of the President
                      </p>
                    </div>

                    {/* Greeting & Body */}
                    <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed min-h-[120px]">
                      <p className="text-zinc-200">
                        Hello <strong className="text-white">Dawit Bekele</strong>,
                      </p>
                      {emailBody.trim() ? (
                        emailBody
                          .split(/\n\s*\n/)
                          .map((para, i) => (
                            <p key={i} className="text-zinc-300/90 whitespace-pre-line">
                              {para}
                            </p>
                          ))
                      ) : (
                        <p className="italic text-zinc-600">
                          (Message preview will appear here in clean typography as you type...)
                        </p>
                      )}

                      {/* Optional Button Preview */}
                      {emailCtaText.trim() && (
                        <div className="pt-3">
                          <span className="inline-block bg-white text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-md">
                            {emailCtaText.trim()} &rarr;
                          </span>
                        </div>
                      )}

                      {/* Signature Preview */}
                      <div className="pt-5 mt-4 border-t border-zinc-800/60">
                        <p className="font-semibold text-white text-xs">Executive Leadership</p>
                        <p className="text-[11px] text-zinc-500">Computer Science &amp; Engineering Club · ASTU</p>
                      </div>
                    </div>

                    {/* Footer Preview */}
                    <div className="pt-3 border-t border-zinc-800/50 text-center">
                      <p className="text-[10px] font-mono text-zinc-600 tracking-wider">
                        EXECUTIVE BROADCAST SERVICE · ADAMA SCIENCE &amp; TECHNOLOGY UNIVERSITY
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Alumni Management Tab */}
          <TabsContent value="alumni" className="mt-4">
            <AlumniAdminTab />
          </TabsContent>
        </Tabs>
      </div>
      )}

      {/* Presidential Broadcast Confirmation Dialog */}
      <AlertDialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-zinc-100">
              Confirm Official Executive Broadcast
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400 space-y-2 pt-2">
              <p>
                You are about to dispatch this official presidential communication via the club&apos;s authenticated Gmail engine.
              </p>
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1 font-mono text-[11px] text-zinc-300">
                <div><span className="text-zinc-500">Subject:</span> {emailSubject}</div>
                <div><span className="text-zinc-500">Headline:</span> {emailTitle}</div>
                <div><span className="text-zinc-500">Audience:</span> {emailAudience.replace("_", " ").toUpperCase()}</div>
              </div>
              <p className="text-amber-500/90 font-medium">
                ⚠️ This action sends real emails to member inboxes and cannot be recalled.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingEmail}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleSendPresidentialEmail()
              }}
              disabled={sendingEmail}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Dispatching...
                </>
              ) : (
                "Confirm & Dispatch via Gmail"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
              {draft.id ? "Edit Task Definition" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              Define the activity, baseline reward points, and task category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</Label>
              <Input
                id="task-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Lead Technical Workshop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description</Label>
              <Textarea
                id="task-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                placeholder="Details on what is expected for verification."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-points" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Points</Label>
                <Input
                  id="task-points"
                  type="number"
                  value={draft.points}
                  onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v as TaskCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {TASK_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Division Scope</Label>
              <Select
                value={draft.division_id || "club_wide"}
                onValueChange={(v) => setDraft({ ...draft, division_id: v === "club_wide" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club_wide">Club-Wide (All Enrolled Members)</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} Division
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Division tasks can only be claimed by members enrolled in that division.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 p-3 bg-zinc-50 dark:bg-zinc-900/40">
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Active Task</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Visible for members to claim points.
                </p>
              </div>
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-200">
              Cancel
            </Button>
            <Button onClick={saveTask} className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20">
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
