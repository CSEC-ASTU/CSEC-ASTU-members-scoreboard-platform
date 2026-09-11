"use client"

import { useMemo } from "react"
import { LineChart, Receipt, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import List01 from "./list-01"
import List02 from "./list-02"
import List03 from "./list-03"
import { useCurrentUser } from "@/components/user-context"
import { useMemberEvents } from "@/lib/hooks/use-queries"
import { DashboardSkeleton } from "@/components/csec/skeletons"
import type { PointEvent } from "@/lib/csec-data"

export default function Content() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const { data: eventsData, isLoading } = useMemberEvents(isAuthenticated ? currentUser.id : null)

  const events: PointEvent[] = useMemo(() => {
    return (eventsData?.items || []).map((e) => ({
      id: e.id,
      memberId: e.member_id,
      memberName: e.member_name,
      taskTitle: e.task_title || e.reason,
      category: (e.task_id ? "division_session" : "external_activity") as any,
      eventType: e.event_type as any,
      delta: e.points_delta,
      status: e.status as any,
      reason: e.reason,
      decisionReason: e.decision_reason,
      approverId: e.approved_by,
      approverName: e.approver_name,
      academicYear: e.academic_year,
      createdAt: e.created_at,
    }))
  }, [eventsData])

  if (isLoading && events.length === 0) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            CSEC ASTU Member Accountability &amp; Performance Overview.
          </p>
        </div>

        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Claim a Task</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Hero Spotlight + Quick Pulse */}
      <List01 />

      {/* Points trend chart */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/5 dark:shadow-black/20">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <LineChart className="h-4 w-4" />
            </div>
            Division Contribution Trend
          </h2>
          <span className="text-xs text-zinc-400">Active Cycle Progress</span>
        </div>
        <List03 />
      </div>

      {/* My recent point events */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/5 dark:shadow-black/20">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Receipt className="h-4 w-4" />
            </div>
            My Recent Point Events
          </h2>
          <Link
            href="/claims"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
          >
            <span>View full ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <List02 events={events.slice(0, 6)} showMember={false} emptyLabel="You have no point events on record yet." />
      </div>
    </div>
  )
}
