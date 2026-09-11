"use client"

import { cn } from "@/lib/utils"
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
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function List02({
  events = POINT_EVENTS,
  showMember = true,
  className,
  emptyLabel = "No point events recorded on the ledger yet.",
}: List02Props) {
  const rows = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  if (rows.length === 0) {
    return (
      <div className={cn("rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400", className)}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/[0.06]", className)}>
      <Table>
        <TableHeader className="bg-zinc-50/50 dark:bg-white/[0.02]">
          <TableRow className="hover:bg-transparent border-b border-zinc-200/80 dark:border-white/[0.06]">
            {showMember && <TableHead>Member</TableHead>}
            <TableHead>Event / Task</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Notes &amp; Decision</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            const member = getMember(e.memberId)
            return (
              <TableRow key={e.id}>
                {showMember && (
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar name={e.memberName || member?.name || "?"} size={30} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {e.memberName || member?.name || "Member"}
                        </div>
                        {member?.division && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.division) && (
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {member.division}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{e.taskTitle}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
                      <span className="inline-block text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-1">
                        ↳ Decision: {e.decisionReason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(e.createdAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
