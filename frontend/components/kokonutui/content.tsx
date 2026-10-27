"use client"

import { useMemo } from "react"
import { LineChart, Receipt, ArrowRight, AlertTriangle, Send, Plus, FileText, ChevronRight } from "lucide-react"
import Link from "next/link"
import List01 from "./list-01"
import List02 from "./list-02"
import List03 from "./list-03"
import { useCurrentUser } from "@/components/user-context"
import { useMemberEvents } from "@/lib/hooks/use-queries"
import { DashboardSkeleton } from "@/components/csec/skeletons"
import { POINT_EVENTS, type PointEvent } from "@/lib/csec-data"

export default function Content() {
  const { currentUser, liveUser, isAuthenticated } = useCurrentUser()
  const activeMemberId = isAuthenticated ? (liveUser?.id || currentUser.id) : null
  const { data: eventsData, isLoading, isError, refetch } = useMemberEvents(activeMemberId, { page_size: 20 })
  const isTelegramConnected = Boolean(currentUser.telegramConnected || liveUser?.telegram_connected)

  const isFallback = Boolean(isError)

  const events: PointEvent[] = useMemo(() => {
    if (isError) {
      const userMock = POINT_EVENTS.filter((e) => e.memberId === currentUser.id)
      return userMock.length > 0 ? userMock : POINT_EVENTS.slice(0, 6)
    }
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
  }, [eventsData, isError, currentUser.id])

  if (isLoading && !isError && events.length === 0) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header Banner — Grounded in Department context without cliché uppercase tracking */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>ASTU Dept. of Computer Science & Engineering</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>Performance Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Active cycle standing, verified task points, and ledger audit history.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/claims"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
          >
            <FileText className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>My Claims</span>
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Claim a Task</span>
          </Link>
        </div>
      </div>

      {/* Telegram Connection Strip (Integrated, quiet notice instead of a jarring banner) */}
      {isAuthenticated && !isTelegramConnected && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Telegram Account Unlinked</span>
              <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                Link your Telegram handle to receive automated approval notifications and maintain standing.
              </span>
            </div>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 text-xs font-medium transition-colors shrink-0 self-start sm:self-auto"
          >
            <Send className="h-3 w-3" />
            <span>Link Account</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Hero Performance Ledger Strip — Single unified surface */}
      <List01 />

      {/* Points trend chart — Kept exactly intact with refined container */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <LineChart className="h-3.5 w-3.5" />
            </div>
            <span>Division Contribution Trend</span>
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Active Cycle Progress</span>
        </div>
        <List03 />
      </div>

      {/* Recent point events ledger */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span>Recent Point Events</span>
          </h2>
          <Link
            href="/claims"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
          >
            <span>View full ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <List02
          events={events.slice(0, 6)}
          showMember={false}
          emptyLabel="You have no point events on record yet."
          isFallback={isFallback}
          onRetry={refetch}
        />
      </div>
    </div>
  )
}
