"use client"

import { cn } from "@/lib/utils"
import { CornerDownRight, AlertTriangle, RotateCcw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusPill, PointDelta, MemberAvatar, EventTypePill } from "@/components/csec/ui-bits"
import { POINT_EVENTS, getMember, TASK_CATEGORY_LABELS, type PointEvent } from "@/lib/csec-data"

interface List02Props {
  events?: PointEvent[]
  showMember?: boolean
  className?: string
  emptyLabel?: string
  isFallback?: boolean
  onRetry?: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function List02({
  events = POINT_EVENTS,
  showMember = true,
  className,
  emptyLabel = "No point events recorded on the ledger yet.",
  isFallback = false,
  onRetry,
}: List02Props) {
  const rows = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  if (rows.length === 0 && !isFallback) {
    return (
      <div className={cn("rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-white/[0.02] p-8 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400", className)}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121316]/50", className)}>
      {isFallback && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Live ledger sync unavailable. Showing fallback demo records.</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-900 dark:text-amber-200 underline hover:no-underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry Sync</span>
            </button>
          )}
        </div>
      )}
      <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader className="bg-zinc-50/80 dark:bg-[#121316] border-b border-zinc-200/80 dark:border-zinc-800/80">
          <TableRow className="hover:bg-transparent border-none">
            {showMember && <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Member</TableHead>}
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Event / Task</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Type</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 text-right">Points</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hidden md:table-cell">Notes &amp; Decision</TableHead>
            <TableHead className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            const member = getMember(e.memberId)
            return (
              <TableRow key={e.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors">
                {showMember && (
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar name={e.memberName || member?.name || "?"} size={28} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {e.memberName || member?.name || "Member"}
                        </div>
                        {member?.division && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.division) && (
                          <div className="truncate text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                            {member.division}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{e.taskTitle}</div>
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {TASK_CATEGORY_LABELS[e.category] ?? e.category}
                  </div>
                </TableCell>
                <TableCell>
                  <EventTypePill type={e.eventType ?? "claim"} />
                </TableCell>
                <TableCell className="text-right">
                  <PointDelta value={e.delta} />
                </TableCell>
                <TableCell>
                  <StatusPill status={e.status} />
                </TableCell>
                <TableCell className="hidden max-w-[300px] md:table-cell">
                  <div className="space-y-0.5">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-1">
                      &ldquo;{e.reason}&rdquo;
                    </span>
                    {e.decisionReason && (
                      <span className="inline-flex items-center text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-1">
                        <CornerDownRight className="h-3 w-3 mr-1 text-zinc-400 shrink-0" />
                        Decision: {e.decisionReason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  {formatDate(e.createdAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
