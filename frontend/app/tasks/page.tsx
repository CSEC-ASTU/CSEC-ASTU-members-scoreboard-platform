"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { ClaimDialog } from "@/components/csec/claim-dialog"
import List02 from "@/components/kokonutui/list-02"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCurrentUser } from "@/components/user-context"
import { TASK_CATEGORY_LABELS, PLATFORM_SETTINGS, type PointEvent, type TaskDef, type TaskCategory } from "@/lib/csec-data"
import { Plus, CheckCircle2, Clock, AlertCircle, Zap, ShieldAlert } from "lucide-react"
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

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (!t.active) return false
        if (selectedCategory !== "all" && t.category !== selectedCategory) return false
        if (selectedDivisionFilter === "club_wide" && t.division_id) return false
        if (selectedDivisionFilter === "my_divisions" && t.division_id && !memberDivisionIds.has(t.division_id)) return false
        if (selectedDivisionFilter !== "all" && selectedDivisionFilter !== "club_wide" && selectedDivisionFilter !== "my_divisions" && t.division_id !== selectedDivisionFilter) return false
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
  }, [tasks, selectedCategory, selectedDivisionFilter, memberDivisionIds])

  async function submitClaim(task: TaskDef & { division_id?: string | null }, payload: { reason: string; division_id?: string | null }) {
    try {
      await createClaimMutation.mutateAsync({
        task_id: task.id,
        reason: payload.reason,
        division_id: payload.division_id || undefined,
      })
      toast.success("Claim submitted successfully!")
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
          title="Task Catalog &amp; Submissions"
          description="Fulfill official club duties, claim earned points, and track verification statuses in real-time."
        />

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-80">
            <TabsTrigger value="tasks">Available Tasks ({tasks.filter((t) => t.active).length})</TabsTrigger>
            <TabsTrigger value="claims">My History ({events.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6 space-y-4">
            {/* Division filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-zinc-400 mr-1 text-[11px] font-medium uppercase tracking-wider">Division:</span>
              <button
                type="button"
                onClick={() => setSelectedDivisionFilter("all")}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  selectedDivisionFilter === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                All Tasks
              </button>
              {memberDivisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDivisionFilter("my_divisions")}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedDivisionFilter === "my_divisions"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  My Enrolled Divisions
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDivisionFilter("club_wide")}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  selectedDivisionFilter === "club_wide"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                Club-Wide
              </button>
              {divisions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDivisionFilter(d.id)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedDivisionFilter === d.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <span className="text-zinc-400 mr-1 text-[11px] font-medium uppercase tracking-wider">Category:</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === c
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {TASK_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Task grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTasks.map((task) => {
                const isAutoApprove =
                  Math.abs(task.points) <= PLATFORM_SETTINGS.autoApproveClaimMaxPoints && !task.isPenalty
                const taskDivName = task.division_id ? divisionsMap[task.division_id] : null
                const isEligible = !task.division_id || memberDivisionIds.has(task.division_id)

                return (
                  <div
                    key={task.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="font-normal text-[11px]">
                            {TASK_CATEGORY_LABELS[task.category as TaskCategory] || task.category}
                          </Badge>
                          {taskDivName ? (
                            <Badge variant="outline" className="text-[10px]">
                              {taskDivName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-zinc-500">
                              Club-Wide
                            </Badge>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{task.points} pts
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{task.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      {isAutoApprove && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Zap className="h-3 w-3" /> Auto-approved (low-stakes claim)
                        </div>
                      )}

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
                            <Button className="w-full" size="sm">
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
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2.5 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                <span>{counts.pending} Pending</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{counts.approved} Approved</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-1 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" />
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
