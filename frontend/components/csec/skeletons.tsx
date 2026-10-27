"use client"

import { Skeleton } from "@/components/ui/skeleton"
import Layout from "@/components/kokonutui/layout"

/**
 * Common page container skeleton with Layout wrapper
 */
export function PageSkeletonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        {children}
      </div>
    </Layout>
  )
}

/**
 * 1. Dashboard Sub-Page Skeleton
 * Perfectly mirrors the Unified Executive Ledger Strip + Chart + Audit Table
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-64 rounded" />
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Unified Executive Ledger Strip (3 Columns) */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-white/[0.08]">
          {/* Section 1: Active Cycle (6 cols) */}
          <div className="p-6 sm:p-7 lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <Skeleton className="h-12 w-28 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-44 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 pt-3 border-t border-zinc-100 dark:border-white/[0.05]">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>

          {/* Section 2: Lifetime Career (3 cols) */}
          <div className="p-6 sm:p-7 lg:col-span-3 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.05] space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>

          {/* Section 3: Standing & Telegram (3 cols) */}
          <div className="p-6 sm:p-7 lg:col-span-3 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <div className="space-y-2 pt-1">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3.5 w-28 rounded" />
                </div>
                <Skeleton className="h-3 w-3 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Trend Chart Card */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <Skeleton className="h-3 w-28 rounded" />
        </div>
        <Skeleton className="h-60 w-full rounded-lg" />
      </div>

      {/* My Recent Point Events Card */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E0F12] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.05] border-t border-zinc-100 dark:border-white/[0.05]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3.5">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-52 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 2. Tasks Sub-Page Skeleton
 */
export function TasksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-9 w-full sm:w-64 rounded-lg" />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-lg" />
        ))}
      </div>

      {/* Division Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-36 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-28 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-32 shrink-0 rounded-full" />
      </div>

      {/* Tasks Grid (6 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
              <Skeleton className="h-5 w-4/5 rounded" />
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-lg pt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 3. Claims History Sub-Page Skeleton
 * Matches the 4 summary metrics + clean filter chips + full table
 */
export function ClaimsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* Score Summary Metrics (4 cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200/80 dark:border-white/[0.06] bg-white dark:bg-transparent p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Claims Table */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 grid grid-cols-6 gap-4">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-16 rounded ml-auto" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-6 gap-4 items-center">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3.5 w-20 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 4. Officer Approvals Sub-Page Skeleton
 */
export function ApprovalsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0E0F12]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Approvals Review List (4 items) */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded mt-1" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-32 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 5. Leaderboard Sub-Page Skeleton
 * Matches podium cards (Rank 2, 1, 3) + division chips + table
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Division filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>

      {/* Top 3 Podium Cards (Rank 2 Left, Rank 1 Center Elevated, Rank 3 Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 pb-6 items-end">
        {/* Rank 2 */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.06] p-5 flex flex-col items-center text-center space-y-3 h-48 justify-center">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        {/* Rank 1 Champion (Elevated) */}
        <div className="rounded-xl border border-zinc-300 dark:border-white/15 p-5 flex flex-col items-center text-center space-y-3 h-56 justify-center md:-translate-y-1.5 bg-zinc-50/50 dark:bg-white/[0.02]">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
        {/* Rank 3 */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.06] p-5 flex flex-col items-center text-center space-y-3 h-48 justify-center">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 grid grid-cols-6 gap-4">
          <Skeleton className="h-3.5 w-12 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-6 gap-4 items-center">
              <Skeleton className="h-4 w-8 rounded" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 6. Members Directory Sub-Page Skeleton
 * Matches the filter toolbar + full tabular directory
 */
export function MembersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-36 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-36 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-28 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-28 rounded-lg" />
      </div>

      {/* Tabular Members Directory */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 grid grid-cols-6 gap-4">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-6 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 7. Member Profile / Detail Sub-Page Skeleton
 */
export function MemberDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Identity Card */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-44 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-48 rounded" />
              <Skeleton className="h-3 w-60 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* Scores Overview (4 items) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-zinc-100 dark:border-white/[0.06]">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-zinc-50 p-3 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.04] space-y-2"
            >
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Score Cap Progress */}
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Tabs & History Feed */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-white/[0.05] last:border-0">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 8. User Profile Sub-Page Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      {/* Identity Card */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-40 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.04] rounded-lg space-y-1 text-right">
              <Skeleton className="h-3 w-20 rounded ml-auto" />
              <Skeleton className="h-6 w-16 rounded ml-auto" />
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.04] rounded-lg space-y-1 text-right">
              <Skeleton className="h-3 w-20 rounded ml-auto" />
              <Skeleton className="h-6 w-16 rounded ml-auto" />
            </div>
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* 2-Column Form & Telegram Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-4">
          <Skeleton className="h-5 w-48 rounded" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0E0F12] space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * 9. Delegated Permissions Sub-Page Skeleton
 * Matches Table 1 (Officer Leadership) + Table 2 (Delegated Grants)
 */
export function PermissionsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      {/* Table 1: Officer Leadership */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 grid grid-cols-4 gap-4">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-20 rounded ml-auto" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-4 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-8 w-20 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Table 2: Delegated Duties */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 grid grid-cols-5 gap-4">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 grid grid-cols-5 gap-4 items-center">
              <Skeleton className="h-4 w-36 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 10. Admin Sub-Page Skeleton
 */
export function AdminSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <Skeleton className="h-7 w-60 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-3.5 w-60 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Admin Table */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 flex items-center justify-between">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 11. Attendance Matrix & Timeline Page Skeleton
 */
export function AttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* KPI Cards (4 metrics) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.06] dark:bg-transparent space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar / Tabs Skeleton */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Attendance Matrix Grid Skeleton */}
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0B0B0E]">
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] px-5 py-3.5 flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-36 rounded" />
                  <Skeleton className="h-2.5 w-24 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
