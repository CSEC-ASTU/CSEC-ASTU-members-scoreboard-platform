"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import List02 from "@/components/kokonutui/list-02"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/components/user-context"
import { Plus, History, Trophy, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClaimsSkeleton } from "@/components/csec/skeletons"
import { useMemberEvents } from "@/lib/hooks/use-queries"
import type { PointEvent } from "@/lib/csec-data"

type FilterTab = "all" | "approved" | "pending" | "rejected" | "warnings"

export default function ClaimsHistoryPage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const [filter, setFilter] = useState<FilterTab>("all")

  const { data: eventsData, isLoading } = useMemberEvents(isAuthenticated ? currentUser.id : null)

  const allEvents: PointEvent[] = useMemo(() => {
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

  const cycleScore = currentUser?.cycleScore ?? 50
  const careerScore = currentUser?.careerScore ?? 50

  const filtered = useMemo(() => {
    if (filter === "all") return allEvents
    if (filter === "approved") return allEvents.filter((e) => e.status === "approved" && e.eventType === "claim")
    if (filter === "pending") return allEvents.filter((e) => e.status === "pending")
    if (filter === "rejected") return allEvents.filter((e) => e.status === "rejected")
    if (filter === "warnings") return allEvents.filter((e) => e.eventType === "yellow_warning" || e.eventType === "red_warning" || e.delta < 0)
    return allEvents
  }, [allEvents, filter])

  const counts = {
    all: allEvents.length,
    approved: allEvents.filter((e) => e.status === "approved" && e.eventType === "claim").length,
    pending: allEvents.filter((e) => e.status === "pending").length,
    rejected: allEvents.filter((e) => e.status === "rejected").length,
    warnings: allEvents.filter((e) => e.eventType === "yellow_warning" || e.eventType === "red_warning" || e.delta < 0).length,
  }

  return (
    <Layout>
      {isLoading && allEvents.length === 0 ? (
        <ClaimsSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="My Point Ledger &amp; History"
          description="Append-only record of all your task claims, duty completions, and officer accountability events."
          action={
            <Link href="/tasks">
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Submit New Claim
              </Button>
            </Link>
          }
        />

        {/* Quick summary metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Cycle Score</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {cycleScore} <span className="text-xs font-normal text-zinc-400">pts</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Pending Review</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {counts.pending}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Approved Claims</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {counts.approved}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>Warnings / Deductions</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {counts.warnings}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <FilterTabButton
            active={filter === "all"}
            label="All Entries"
            count={counts.all}
            onClick={() => setFilter("all")}
          />
          <FilterTabButton
            active={filter === "approved"}
            label="Approved Claims"
            count={counts.approved}
            onClick={() => setFilter("approved")}
          />
          <FilterTabButton
            active={filter === "pending"}
            label="Pending"
            count={counts.pending}
            onClick={() => setFilter("pending")}
          />
          <FilterTabButton
            active={filter === "rejected"}
            label="Rejected"
            count={counts.rejected}
            onClick={() => setFilter("rejected")}
          />
          <FilterTabButton
            active={filter === "warnings"}
            label="Warnings &amp; Deductions"
            count={counts.warnings}
            onClick={() => setFilter("warnings")}
          />
        </div>

        {/* Ledger Table */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4 w-4" />
              Ledger Transactions ({filtered.length})
            </h2>
          </div>
          <List02 events={filtered} showMember={false} emptyLabel="No point events found for this filter." />
        </div>
      </div>
      )}
    </Layout>
  )
}

function FilterTabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      <span>{label}</span>
      <span className={cn("text-[10px] rounded-full px-1.5 py-0.2", active ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900" : "bg-zinc-200 dark:bg-zinc-700")}>
        {count}
      </span>
    </button>
  )
}
