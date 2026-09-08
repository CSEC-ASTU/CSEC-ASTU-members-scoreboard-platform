"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Textarea } from "@/frontend/components/ui/textarea"
import { Switch } from "@/frontend/components/ui/switch"
import { Badge } from "@/frontend/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog"
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
} from "@/frontend/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select"
import { useCurrentUser } from "@/frontend/components/user-context"
import { canManagePermissions, canManageSettings, canExecuteAnnualReset } from "@/lib/permissions"
import {
  TASKS,
  TASK_CATEGORY_LABELS,
  POINT_EVENTS,
  MEMBERS,
  PLATFORM_SETTINGS,
  getMember,
  getMemberCycleScore,
  type TaskDef,
  type TaskCategory,
  type PlatformSettings,
  type PointEvent,
} from "@/lib/csec-data"
import { StatusPill, PointDelta, MemberAvatar, EventTypePill } from "@/frontend/components/csec/ui-bits"
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
} from "lucide-react"

const CATEGORIES = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]

type Draft = Omit<TaskDef, "id"> & { id?: string }

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  points: 10,
  category: "division_session",
  active: true,
}

export default function AdminPage() {
  const { currentUser } = useCurrentUser()
  const [tasks, setTasks] = useState<TaskDef[]>(TASKS)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [open, setOpen] = useState(false)

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings>(PLATFORM_SETTINGS)
  const [resetCompleted, setResetCompleted] = useState(false)
  const [resetEvents, setResetEvents] = useState<PointEvent[]>(POINT_EVENTS)

  const allowed = canManagePermissions(currentUser)
  const isPresident = canManageSettings(currentUser)

  const groupedTasks = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        category: c,
        items: tasks.filter((t) => t.category === c),
      })).filter((g) => g.items.length > 0),
    [tasks],
  )

  // Annual Reset Preview calculations
  const resetPreview = useMemo(() => {
    return MEMBERS.filter((m) => m.isActive).map((m, idx) => {
      const cycleScore = getMemberCycleScore(m.id, resetEvents, settings.currentAcademicYear)
      return {
        member: m,
        academicYear: settings.currentAcademicYear,
        finalScore: cycleScore,
        projectedRank: idx + 1,
      }
    }).sort((a, b) => b.finalScore - a.finalScore)
  }, [resetEvents, settings.currentAcademicYear])

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
    setDraft({ ...t })
    setOpen(true)
  }

  function saveTask() {
    if (!draft.title.trim()) {
      toast.error("Task title is required.")
      return
    }
    setTasks((prev) => {
      if (draft.id) {
        return prev.map((t) => (t.id === draft.id ? ({ ...draft, id: draft.id } as TaskDef) : t))
      }
      return [{ ...draft, id: `local-${Date.now()}` } as TaskDef, ...prev]
    })
    toast.success(draft.id ? "Task definition updated" : "New task created")
    setOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  function toggleActive(id: string, active: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, active } : t)))
  }

  function savePlatformSettings(e: React.FormEvent) {
    e.preventDefault()
    toast.success("Platform settings updated successfully")
  }

  function executeAnnualReset() {
    setResetCompleted(true)
    setSettings((prev) => ({
      ...prev,
      currentAcademicYear: prev.currentAcademicYear + 1,
    }))
    toast.success(`Annual reset executed successfully!`, {
      description: `Academic year advanced to ${settings.currentAcademicYear + 1}. All members reset to +${settings.initialBuffer} buffer.`,
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Club Administration &amp; Governance"
          description="Manage the global task catalog, tune platform scoring parameters, audit the club-wide ledger, and execute annual resets."
        />

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="catalog">Task Catalog</TabsTrigger>
            <TabsTrigger value="settings">Platform Settings</TabsTrigger>
            <TabsTrigger value="audit">Club Audit Log</TabsTrigger>
            <TabsTrigger value="reset">Annual Reset</TabsTrigger>
          </TabsList>

          {/* 1. Task Catalog Tab */}
          <TabsContent value="catalog" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
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
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {t.title}
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
          </TabsContent>

          {/* 2. Platform Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
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

          {/* 3. Club Audit Log Tab */}
          <TabsContent value="audit" className="mt-4 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Unfiltered Club-Wide Audit Log ({POINT_EVENTS.length})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Append-only ledger of all claims, adjustments, warnings, and officer actions across all divisions.
                  </p>
                </div>
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
                      <TableHead>Approver / Officer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {POINT_EVENTS.map((e) => {
                      const member = getMember(e.memberId)
                      const approver = e.approverId ? getMember(e.approverId) : null
                      return (
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
                              {member?.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">{member?.division}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{e.taskTitle}</div>
                            <div className="text-[11px] text-zinc-400 line-clamp-1">{e.reason}</div>
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
                          <TableCell className="text-zinc-600 dark:text-zinc-300">
                            {approver ? approver.name : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* 4. Annual Reset Tab */}
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
                        <TableRow key={item.member.id} className="text-xs">
                          <TableCell className="font-semibold tabular-nums text-zinc-500">
                            #{idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.member.name}
                          </TableCell>
                          <TableCell className="text-zinc-500">{item.member.division}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {item.finalScore} pts
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
        </Tabs>
      </div>

      {/* Task Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Task Definition" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              Define the activity, baseline reward points, and task category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Lead Technical Workshop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                placeholder="Details on what is expected for verification."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-points">Points</Label>
                <Input
                  id="task-points"
                  type="number"
                  value={draft.points}
                  onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
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
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Active Task</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Visible for members to claim points.
                </p>
              </div>
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTask}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
