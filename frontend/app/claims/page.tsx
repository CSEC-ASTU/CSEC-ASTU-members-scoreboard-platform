"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/components/user-context"
import { Plus, History, Trophy, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClaimsSkeleton } from "@/components/csec/skeletons"
import { useMemberEvents } from "@/lib/hooks/use-queries"
import { TASK_CATEGORY_LABELS, type PointEvent } from "@/lib/csec-data"

type FilterTab = "all" | "approved" | "pending" | "rejected" | "warnings"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

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
        <div className="space-y-6">
          <PageHeader
            title="My Point Ledger & History"
            description="Append-only record of all your task claims, duty completions, and officer accountability events."
            action={
              <Link href="/tasks">
                <Button className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-medium shadow-none" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Submit New Claim
                </Button>
              </Link>
            }
          />

          {/* Quick summary metrics - Flat, Editorial Notion Style */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-transparent p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Cycle Score</span>
                <Trophy className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {cycleScore} <span className="text-xs font-normal text-zinc-400">pts</span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Career: {careerScore} pts</p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-transparent p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Pending Review</span>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {counts.pending}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Awaiting officer action</p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-transparent p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Approved Claims</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {counts.approved}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Credited to ledger</p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-transparent p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Deductions & Warnings</span>
                <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {counts.warnings}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Accountability records</p>
            </div>
          </div>

          {/* Filter Tabs - Clean Notion Tag Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
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
              label="Warnings & Deductions"
              count={counts.warnings}
              onClick={() => setFilter("warnings")}
            />
          </div>

          {/* Native Notion Database Table - Completely Unboxed, Borderless, Generous Spacing */}
          <div className="relative overflow-x-auto w-full pt-1">
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No point events found for this filter.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                {/* Header Row - Subtle, Bold, Clean Notion Style */}
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
                    {/* Sticky Column 1: Event / Task */}
                    <th className="sticky left-0 z-20 bg-white dark:bg-[#0B0B0E] py-3.5 px-5 min-w-[260px] font-semibold">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                        <span className="font-semibold">Event / Task</span>
                      </div>
                    </th>

                    {/* Column 2: Type */}
                    <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <span className="text-[13px]">🏷️</span>
                        <span className="font-semibold">Type</span>
                      </div>
                    </th>

                    {/* Column 3: Points */}
                    <th className="py-3.5 px-5 min-w-[120px] font-semibold">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <span className="text-[13px]">📊</span>
                        <span className="font-semibold">Points</span>
                      </div>
                    </th>

                    {/* Column 4: Status */}
                    <th className="py-3.5 px-5 min-w-[130px] font-semibold">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <span className="text-[13px]">⚪</span>
                        <span className="font-semibold">Status</span>
                      </div>
                    </th>

                    {/* Column 5: Notes & Decision */}
                    <th className="py-3.5 px-5 min-w-[240px] font-semibold">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <span className="text-[13px]">💬</span>
                        <span className="font-semibold">Notes & Decision</span>
                      </div>
                    </th>

                    {/* Column 6: Date */}
                    <th className="py-3.5 px-5 min-w-[130px] text-right font-semibold">
                      <div className="flex items-center justify-end gap-2 text-zinc-900 dark:text-white">
                        <span className="text-[13px]">📅</span>
                        <span className="font-semibold">Date</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Table Body - Generous 52-60px row height, no vertical borders, whisper-thin horizontal separator */}
                <tbody>
                  {filtered.map((e) => {
                    const isPositive = e.delta > 0
                    const isNegative = e.delta < 0
                    const isApproved = e.status === "approved"
                    const isPending = e.status === "pending"
                    const isRejected = e.status === "rejected"

                    return (
                      <tr
                        key={e.id}
                        className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Sticky Event / Task Column */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] group-hover:bg-zinc-50 dark:group-hover:bg-[#101014] py-4 px-5 transition-colors">
                          <div className="truncate max-w-[250px]">
                            <span className="block text-sm text-zinc-900 dark:text-zinc-100 font-medium truncate">
                              {e.taskTitle}
                            </span>
                            <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                              {TASK_CATEGORY_LABELS[e.category] ?? e.category}
                            </span>
                          </div>
                        </td>

                        {/* Event Type Badge */}
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10 capitalize">
                            {e.eventType ? e.eventType.replace(/_/g, " ") : "Claim"}
                          </span>
                        </td>

                        {/* Points Delta */}
                        <td className="py-4 px-5">
                          <span
                            className={cn(
                              "text-xs font-bold tabular-nums",
                              isPositive && "text-zinc-900 dark:text-zinc-100",
                              isNegative && "text-rose-600 dark:text-rose-400",
                              !isPositive && !isNegative && "text-zinc-400",
                            )}
                          >
                            {isPositive ? `+${e.delta}` : e.delta} pts
                          </span>
                        </td>

                        {/* Status Badge - Solid & High-Contrast Notion Design */}
                        <td className="py-4 px-5">
                          {isApproved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                              Approved
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-300 dark:text-amber-950 dark:border-amber-400/40">
                              Pending
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100/70 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300">
                              {e.status}
                            </span>
                          )}
                        </td>

                        {/* Notes & Decision */}
                        <td className="py-4 px-5 max-w-[280px]">
                          <div className="space-y-0.5">
                            {e.reason && (
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate" title={e.reason}>
                                &ldquo;{e.reason}&rdquo;
                              </p>
                            )}
                            {e.decisionReason && (
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic truncate" title={e.decisionReason}>
                                ↳ Decision: {e.decisionReason}
                              </p>
                            )}
                            {!e.reason && !e.decisionReason && (
                              <span className="text-zinc-400 dark:text-zinc-600 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-5 whitespace-nowrap text-right text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {formatDate(e.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 border",
        active
          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-none"
          : "border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[10px] font-semibold rounded px-1 py-0.2",
          active ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950" : "bg-zinc-100 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400",
        )}
      >
        {count}
      </span>
    </button>
  )
}
