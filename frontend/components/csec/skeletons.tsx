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
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Greeting & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg self-start sm:self-auto" />
      </div>

      {/* KPI Cards (4 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Contribution Trend Chart Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-48 rounded" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* My Recent Point Events Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
          </div>
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-36 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
        <Skeleton className="h-7 w-28 shrink-0 rounded-full" />
      </div>

      {/* Tasks Grid (6 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4"
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
 */
export function ClaimsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Score Summary Cards (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-2"
          >
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      {/* Ledger List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            </div>
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 4. Officer Approvals Sub-Page Skeleton
 */
export function ApprovalsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Approvals Review List (4 cards) */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3"
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
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 text-center space-y-3"
          >
            <Skeleton className="h-6 w-8 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-1.5 flex flex-col items-center">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table/List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-6 rounded" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 6. Members Directory Sub-Page Skeleton
 */
export function MembersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-52 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-36 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-36 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-28 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-28 rounded-lg" />
      </div>

      {/* Members List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="space-y-1 text-right">
                <Skeleton className="h-4 w-16 rounded ml-auto" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 7. Member Profile / Detail Sub-Page Skeleton
 */
export function MemberDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-6">
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

        {/* Scores Overview (4 grid items) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40 space-y-2"
            >
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Score Cap Progress */}
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* Tabs & History Feed */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      {/* Identity Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-5">
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
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg space-y-1 text-right">
              <Skeleton className="h-3 w-20 rounded ml-auto" />
              <Skeleton className="h-6 w-16 rounded ml-auto" />
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg space-y-1 text-right">
              <Skeleton className="h-3 w-20 rounded ml-auto" />
              <Skeleton className="h-6 w-16 rounded ml-auto" />
            </div>
          </div>
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* 2-Column Form & Telegram Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
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

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
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
 */
export function PermissionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      {/* Grants Table / Card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-60 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>

      {/* Catalog Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-3.5 w-60 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Task Table Card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
 * 12. Attendance Matrix & Timeline Page Skeleton
 */
export function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* KPI Cards (4 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.04] dark:bg-white/[0.02] space-y-2.5"
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

      {/* Table Skeleton */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.04] dark:bg-white/[0.02] space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3 dark:border-white/[0.04]">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
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
  )
}
