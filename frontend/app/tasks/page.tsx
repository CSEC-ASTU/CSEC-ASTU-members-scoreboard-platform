"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { ClaimDialog } from "@/frontend/components/csec/claim-dialog"
import List02 from "@/frontend/components/kokonutui/list-02"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { StatusPill } from "@/frontend/components/csec/ui-bits"
import { useCurrentUser } from "@/frontend/components/user-context"
import {
  TASKS,
  TASK_CATEGORY_LABELS,
  getMemberEvents,
  type PointEvent,
  type TaskDef,
  type TaskCategory,
} from "@/lib/csec-data"
import { Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react"

const CATEGORIES = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]

export default function TasksPage() {
  const { currentUser } = useCurrentUser()
  const [localClaims, setLocalClaims] = useState<PointEvent[]>([])
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | "all">("all")

  const myClaims = useMemo(
    () => [...localClaims, ...getMemberEvents(currentUser.id)],
    [localClaims, currentUser.id],
  )

  const visibleTasks = useMemo(() => {
    return TASKS.filter((t) => t.active && (selectedCategory === "all" || t.category === selectedCategory))
  }, [selectedCategory])

  function submitClaim(task: TaskDef, payload: { reason: string }) {
    const event: PointEvent = {
      id: `local-${Date.now()}`,
      memberId: currentUser.id,
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      eventType: "claim",
      delta: task.points,
      status: "pending",
      reason: payload.reason,
      academicYear: 2026,
      createdAt: new Date().toISOString(),
    }
    setLocalClaims((prev) => [event, ...prev])
    toast.success("Claim submitted successfully", {
      description: `"${task.title}" is now pending officer approval.`,
    })
  }

  const counts = {
    pending: myClaims.filter((c) => c.status === "pending").length,
    approved: myClaims.filter((c) => c.status === "approved").length,
    rejected: myClaims.filter((c) => c.status === "rejected").length,
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Task Catalog &amp; Submissions"
          description="Fulfill official club duties, claim earned points, and track verification statuses in real-time."
        />

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList>
            <TabsTrigger value="catalog">Available Tasks ({TASKS.filter((t) => t.active).length})</TabsTrigger>
            <TabsTrigger value="claims">My Submissions ({myClaims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-4 space-y-4">
            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
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
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="font-normal text-[11px]">
                        {TASK_CATEGORY_LABELS[task.category]}
                      </Badge>
                      <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{task.points} pts
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{task.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <ClaimDialog
                      task={task}
                      onSubmit={(payload) => submitClaim(task, payload)}
                      trigger={
                        <Button className="w-full" size="sm">
                          <Plus className="mr-1.5 h-4 w-4" /> Submit Claim
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
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
              events={myClaims}
              showMember={false}
              emptyLabel="You haven't submitted any task claims yet."
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
