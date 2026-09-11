"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import List02 from "@/components/kokonutui/list-02"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/components/user-context"
import { Plus, History, Trophy, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClaimsSkeleton } from "@/components/csec/skeletons"
import { useMemberEvents } from "@/lib/hooks/use-queries"
import type { PointEvent } from "@/lib/csec-data"

type FilterTab = "all" | "approved" | "pending" | "rejected" | "warnings"

export default function ClaimsHistoryPage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const [filter, setFilter] = useState<FilterTab>("all")

  const { data: eventsData, isLoading } = useMemberEvents(isAuthenticated ? currentUser.id : null)
  const isInitialLoading = isLoading && !eventsData

  const allEvents: PointEvent[] = useMemo(() => {
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

  const cycleScore = currentUser?.cycleScore ?? 50
  const careerScore = currentUser?.careerScore ?? 50

  const filtered = useMemo(() => {
    if (filter === "all") return allEvents
    if (filter === "approved") return allEvents.filter((e) => e.status === "approved" && e.eventType === "claim")
    if (filter === "pending") return allEvents.filter((e) => e.status === "pending")
    if (filter === "rejected") return allEvents.filter((e) => e.status === "rejected")
    if (filter === "warnings")
      return allEvents.filter(
        (e) =>
          e.eventType === "normal_warning" ||
          e.eventType === "yellow_warning" ||
          e.eventType === "red_warning" ||
          e.delta < 0,
      )
    return allEvents
  }, [allEvents, filter])

  const counts = {
    all: allEvents.length,
    approved: allEvents.filter((e) => e.status === "approved" && e.eventType === "claim").length,
    pending: allEvents.filter((e) => e.status === "pending").length,
    rejected: allEvents.filter((e) => e.status === "rejected").length,
    warnings: allEvents.filter(
      (e) =>
        e.eventType === "normal_warning" ||
        e.eventType === "yellow_warning" ||
        e.eventType === "red_warning" ||
        e.delta < 0,
    ).length,
  }

  return (
    <Layout>
      {isInitialLoading ? (
        <ClaimsSkeleton />
      ) : (
        <div className="space-y-8">
          <PageHeader
            title="My Point Ledger &amp; History"
            description="Append-only record of all your task claims, duty completions, and officer accountability events."
            action={
              <Link href="/tasks">
                <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all duration-200" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Submit New Claim
                </Button>
              </Link>
            }
          />

          {/* Quick summary metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/5 dark:shadow-black/20 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Cycle Score
                </span>
                <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
                  <Trophy className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                  {cycleScore}
                </span>
                <span className="text-xs font-medium text-zinc-400">pts</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Career: {careerScore} pts</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/5 dark:shadow-black/20 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Pending Review
                </span>
                <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                {counts.pending}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Awaiting officer action</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/5 dark:shadow-black/20 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Approved Claims
                </span>
                <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                {counts.approved}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Credited to ledger</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/5 dark:shadow-black/20 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Deductions &amp; Warnings
                </span>
                <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                {counts.warnings}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Accountability records</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
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

          {/* Ledger Table Container */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/40 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/5 dark:shadow-black/20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1.5 text-zinc-500 dark:text-zinc-400">
                  <History className="h-4 w-4" />
                </div>
                Ledger Transactions
                <span className="text-xs font-normal text-zinc-400">({filtered.length} entries)</span>
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
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25"
          : "border border-zinc-200/80 bg-white dark:bg-zinc-900/40 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[10px] font-semibold rounded-md px-1.5 py-0.5",
          active ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400"
        )}
      >
        {count}
      </span>
    </button>
  )
}
