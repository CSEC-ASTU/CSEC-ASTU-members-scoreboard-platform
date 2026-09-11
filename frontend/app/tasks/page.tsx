"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { ClaimDialog } from "@/components/csec/claim-dialog"
import { SessionCodeCard } from "@/components/csec/session-code-card"
import List02 from "@/components/kokonutui/list-02"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCurrentUser } from "@/components/user-context"
import { TASK_CATEGORY_LABELS, PLATFORM_SETTINGS, type PointEvent, type TaskDef, type TaskCategory } from "@/lib/csec-data"
import { Plus, CheckCircle2, Clock, AlertCircle, Zap, ShieldAlert, KeyRound } from "lucide-react"
import { tasksService, pointEventsService, divisionsService, type TaskOut, type PointEventOut, type DivisionOut } from "@/lib/api"
import { TasksSkeleton } from "@/components/csec/skeletons"
import { useTasks, useMemberEvents, useDivisions, useCreateClaimMutation } from "@/lib/hooks/use-queries"

const CATEGORIES = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]

export default function TasksPage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ page_size: 100 })
  const { data: eventsData, isLoading: eventsLoading } = useMemberEvents(isAuthenticated ? currentUser.id : null)
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()
  const createClaimMutation = useCreateClaimMutation()

  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>("all")

  const tasks: TaskOut[] = useMemo(() => {
    return Array.isArray(tasksData) ? tasksData : (tasksData as any)?.items ?? []
  }, [tasksData])

  const divisions: DivisionOut[] = useMemo(() => divisionsData || [], [divisionsData])

  const events: PointEvent[] = useMemo(() => {
    return (eventsData?.items || []).map((e) => ({
      id: e.id,
      memberId: e.member_id,
      taskTitle: e.task_title || e.reason,
      category: (e.task_id ? "division_session" : "external_activity") as any,
      eventType: e.event_type as any,
      delta: e.points_delta,
      status: e.status as any,
      reason: e.reason,
      decisionReason: e.decision_reason,
      approverId: e.approved_by,
      academicYear: e.academic_year,
      createdAt: e.created_at,
    }))
  }, [eventsData])

  const isLoading = tasksLoading || eventsLoading || divisionsLoading

  const divisionsMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) {
      map[d.id] = d.name
    }
    return map
  }, [divisions])

  // User's enrolled divisions
  const memberDivisions = useMemo(() => {
    const list: { id: string; name: string }[] = []
    if (currentUser.divisionId && divisionsMap[currentUser.divisionId]) {
      list.push({ id: currentUser.divisionId, name: divisionsMap[currentUser.divisionId] })
    }
    if (currentUser.secondaryDivisionId && divisionsMap[currentUser.secondaryDivisionId]) {
      list.push({ id: currentUser.secondaryDivisionId, name: divisionsMap[currentUser.secondaryDivisionId] })
    }
    return list
  }, [currentUser.divisionId, currentUser.secondaryDivisionId, divisionsMap])

  const memberDivisionIds = useMemo(() => {
    return new Set(memberDivisions.map((d) => d.id))
  }, [memberDivisions])

  const isClubOfficer = currentUser.role === "president" || currentUser.role === "vice_president"

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (!t.active) return false
        // Non-officer members must only ever see tasks from their enrolled divisions (primary & secondary) or club-wide tasks
        if (!isClubOfficer) {
          if (t.division_id && !memberDivisionIds.has(t.division_id)) {
            return false
          }
        }
        if (selectedCategory !== "all" && t.category !== selectedCategory) return false
        if (selectedDivisionFilter === "club_wide" && t.division_id) return false
        if (selectedDivisionFilter === "my_divisions" && t.division_id && !memberDivisionIds.has(t.division_id)) return false
        if (
          selectedDivisionFilter !== "all" &&
          selectedDivisionFilter !== "club_wide" &&
          selectedDivisionFilter !== "my_divisions" &&
          t.division_id !== selectedDivisionFilter
        ) {
          return false
        }
        return true
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category as any,
        points: t.base_points,
        description: t.description || "",
        active: t.active,
        isPenalty: t.is_penalty,
        division_id: t.division_id,
      }))
  }, [tasks, selectedCategory, selectedDivisionFilter, memberDivisionIds, isClubOfficer])

  async function submitClaim(
    task: TaskDef & { division_id?: string | null },
    payload: { reason: string; division_id?: string | null; verification_code?: string | null }
  ) {
    try {
      await createClaimMutation.mutateAsync({
        task_id: task.id,
        reason: payload.reason,
        division_id: payload.division_id || undefined,
        verification_code: payload.verification_code || undefined,
      })
      toast.success(
        payload.verification_code
          ? "Attendance verified! +10 points awarded instantly."
          : "Claim submitted successfully!"
      )
    } catch (err: any) {
      toast.error("Failed to submit claim", { description: err.message })
    }
  }

  const counts = {
    pending: events.filter((c) => c.status === "pending").length,
    approved: events.filter((c) => c.status === "approved").length,
    rejected: events.filter((c) => c.status === "rejected").length,
  }

  return (
    <Layout>
      {isLoading && tasks.length === 0 ? (
        <TasksSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="Task Catalog & Submissions"
          description="Fulfill official club duties, claim earned points, and track verification statuses in real-time."
        />

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-80">
            <TabsTrigger value="tasks">Available Tasks ({visibleTasks.length})</TabsTrigger>
            <TabsTrigger value="claims">My History ({events.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6 space-y-4">
            {/* Officer Live Session Whiteboard Generator */}
            <SessionCodeCard currentUser={currentUser} tasks={tasks} divisions={divisions} />

            {/* Honor Code & Physical Presence Notice */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-900/30 p-4 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="leading-relaxed">
                  <strong>Attendance &amp; Task Integrity:</strong> If you are not actually present in a session or did not complete the duty, please do not submit a claim. Submitting false claims will result in negative point deductions, official warnings, or club dismissal.
                </span>
              </div>
            </div>

            {/* Division filter pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-zinc-200/80 dark:border-white/[0.06] text-xs">
              <span className="text-zinc-400 mr-1 text-[11px] font-semibold uppercase tracking-wider">Division:</span>
              <button
                type="button"
                onClick={() => setSelectedDivisionFilter("all")}
                className={`rounded-xl px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  selectedDivisionFilter === "all"
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                    : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {isClubOfficer ? "All Tasks" : "All My Tasks"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDivisionFilter("club_wide")}
                className={`rounded-xl px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  selectedDivisionFilter === "club_wide"
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                    : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Club-Wide
              </button>
              {/* Show only member's enrolled divisions if regular member; show all divisions if club officer */}
              {(isClubOfficer ? divisions : memberDivisions).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDivisionFilter(d.id)}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    selectedDivisionFilter === d.id
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                      : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="text-zinc-400 mr-1 text-[11px] font-semibold uppercase tracking-wider">Category:</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedCategory === "all"
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                    : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    selectedCategory === c
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                      : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {TASK_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Task grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTasks.map((task) => {
                const isAutoApprove =
                  Math.abs(task.points) <= PLATFORM_SETTINGS.autoApproveClaimMaxPoints && !task.isPenalty
                const taskDivName = task.division_id ? divisionsMap[task.division_id] : null
                const isEligible = !task.division_id || memberDivisionIds.has(task.division_id)

                return (
                  <div
                    key={task.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 hover:-translate-y-0.5 hover:border-violet-500/30 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300">
                            {TASK_CATEGORY_LABELS[task.category as TaskCategory] || task.category}
                          </span>
                          {taskDivName ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                              {taskDivName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                              Club-Wide
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-white/10 tabular-nums">
                          +{task.points} pts
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h3>
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{task.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/[0.06] space-y-3">
                      {task.category === "division_session" ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                          <KeyRound className="h-3.5 w-3.5" /> Requires Whiteboard PIN
                        </div>
                      ) : isAutoApprove ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                          <Zap className="h-3.5 w-3.5" /> Auto-approved (low-stakes claim)
                        </div>
                      ) : null}

                      {!isEligible ? (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 py-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Restricted to {taskDivName} members</span>
                        </div>
                      ) : (
                        <ClaimDialog
                          task={task}
                          taskDivisionName={taskDivName}
                          memberDivisions={memberDivisions}
                          onSubmit={(payload) => submitClaim(task, payload)}
                          trigger={
                            <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all duration-200" size="sm">
                              <Plus className="mr-1.5 h-4 w-4" /> Submit Claim
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 px-2.5 py-1 rounded-full font-medium">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>{counts.pending} Pending</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>{counts.approved} Approved</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 px-2.5 py-1 rounded-full font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
                <span>{counts.rejected} Rejected</span>
              </div>
            </div>

            <List02
              events={events}
              showMember={false}
              emptyLabel="You haven't submitted any task claims yet."
            />
          </TabsContent>
        </Tabs>
      </div>
      )}
    </Layout>
  )
}
