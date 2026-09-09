"use client"

import { useMemo } from "react"
import { LineChart, Receipt, ArrowRight } from "lucide-react"
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

  if (isLoading && events.length === 0) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome back, {currentUser.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            CSEC ASTU Member Accountability &amp; Performance Overview.
          </p>
        </div>

        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 self-start rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Claim a Task <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* KPI summary cards */}
      <List01 />

      {/* Points trend chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
          <LineChart className="h-4 w-4" />
          Division Contribution Trend
        </h2>
        <List03 />
      </div>

      {/* My recent point events */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <Receipt className="h-4 w-4" />
            My Recent Point Events
          </h2>
          <Link
            href="/claims"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1"
          >
            View full ledger <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <List02 events={events.slice(0, 6)} showMember={false} emptyLabel="You have no point events on record yet." />
      </div>
    </div>
  )
}
