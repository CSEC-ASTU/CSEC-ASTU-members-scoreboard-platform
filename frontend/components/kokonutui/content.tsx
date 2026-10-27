"use client"

import { useMemo } from "react"
import { LineChart, Receipt, ArrowRight, Sparkles, AlertTriangle, Send } from "lucide-react"
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-600 dark:text-violet-400">
            <span>ASTU · DEPT OF CSE</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span>MEMBER PERFORMANCE LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Active cycle standing, verified task points, and ledger audit history.
          </p>
        </div>

        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 px-4 py-2 text-xs font-semibold transition-colors shadow-sm"
        >
          <span>Claim a Task</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Mandatory Telegram Connection Prompt */}
      {isAuthenticated && !isTelegramConnected && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Telegram Account Not Linked
                  </h3>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                    Action Required
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  Connecting your Telegram account is required to maintain active member standing. You will not receive automated point approvals, attendance alerts, warning notices, or club digests until your account is linked.
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 text-xs font-semibold transition-colors shrink-0 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Connect Telegram</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Hero Spotlight + Quick Pulse */}
      <List01 />

      {/* Points trend chart */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <LineChart className="h-3.5 w-3.5" />
            </div>
            <span>Division Contribution Trend</span>
          </h2>
          <span className="text-xs font-mono text-zinc-400">Active Cycle Progress</span>
        </div>
        <List03 />
      </div>

      {/* My recent point events */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/90 p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <div className="rounded-md bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span>My Recent Point Events</span>
          </h2>
          <Link
            href="/claims"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
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
