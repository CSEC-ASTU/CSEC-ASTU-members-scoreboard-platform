"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { ROLE_LABELS, type Role } from "@/lib/csec-data"
import { ChevronRight, ShieldAlert, Github } from "lucide-react"
import type { MemberRowItem } from "../types"

interface MembersTableProps {
  rows: MemberRowItem[]
  officer: boolean
  membersFetching: boolean
}

export function MembersTable({ rows, officer, membersFetching }: MembersTableProps) {
  const router = useRouter()

  return (
    <div className={`relative overflow-x-auto w-full pt-1 transition-opacity duration-150 ${membersFetching ? "opacity-60" : "opacity-100"}`}>
      {rows.length === 0 ? (
        <div className="py-20 text-center text-xs text-zinc-500 dark:text-zinc-400">
          No members match your selected filters.
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          {/* Header Row - Subtle, Bold, Clean Notion Style */}
          <thead>
            <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
              {/* Sticky Column 1: Member Name */}
              <th className="sticky left-0 z-20 bg-white dark:bg-[#0B0B0E] py-3.5 px-5 min-w-[240px] font-semibold">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                  <span className="font-semibold">Member Name</span>
                </div>
              </th>

              {/* Column 2: Division */}
              <th className="py-3.5 px-5 min-w-[180px] font-semibold">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <span className="text-[13px]">🎯</span>
                  <span className="font-semibold">Division</span>
                </div>
              </th>

              {/* Column 3: Department & Year */}
              <th className="py-3.5 px-5 min-w-[170px] font-semibold">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <span className="text-[13px]">🏛️</span>
                  <span className="font-semibold">Department</span>
                </div>
              </th>

              {/* Column 4: Cycle Score */}
              <th className="py-3.5 px-5 min-w-[140px] font-semibold">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <span className="text-[13px]">📊</span>
                  <span className="font-semibold">Cycle Score</span>
                </div>
              </th>

              {/* Column 5: Role & Status */}
              <th className="py-3.5 px-5 min-w-[150px] font-semibold">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                  <span className="text-[13px]">🏷️</span>
                  <span className="font-semibold">Role & Status</span>
                </div>
              </th>

              {/* Column 6: Contact (Officer only) */}
              {officer && (
                <th className="py-3.5 px-5 min-w-[160px] font-semibold">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                    <span className="text-[13px]">📱</span>
                    <span className="font-semibold">Contact</span>
                  </div>
                </th>
              )}

              <th className="py-3.5 px-4 w-10"></th>
            </tr>
          </thead>

          {/* Table Body - Generous 52-60px row height, no vertical borders, whisper-thin horizontal separator */}
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                onClick={() => router.push(`/members/${m.id}`)}
                className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                {/* Sticky Member Name */}
                <td className="sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] group-hover:bg-zinc-50 dark:group-hover:bg-[#101014] py-4 px-5 transition-colors">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={m.name} imageUrl={m.avatar ?? undefined} size={32} />
                    <div className="truncate max-w-[180px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/members/${m.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                        >
                          {m.name}
                        </Link>
                        {m.badge && <TierBadge tier={m.badge as any} />}
                        {m.githubUrl && (
                          <a
                            href={m.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`GitHub: ${m.githubUrl}`}
                            className="inline-flex items-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          >
                            <Github className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                        {m.studentId ? `${m.studentId} · ` : ""}{m.email}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Division Name */}
                <td className="py-4 px-5">
                  <span className="text-xs text-zinc-800 dark:text-white font-normal">
                    {m.divisionsText}
                  </span>
                </td>

                {/* Department & Joining Year */}
                <td className="py-4 px-5">
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 font-normal">
                    {m.department}
                  </div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Class of {m.joiningYear}
                  </div>
                </td>

                {/* Cycle & Career Score */}
                <td className="py-4 px-5">
                  <div className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {m.cycleScore} pts
                  </div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Career: {m.careerScore} pts
                  </div>
                </td>

                {/* Role & Status */}
                <td className="py-4 px-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10">
                      {ROLE_LABELS[m.role as Role] || m.role}
                    </span>
                    {!m.isActive && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        <ShieldAlert className="h-3 w-3" /> Laid Off
                      </span>
                    )}
                  </div>
                </td>

                {/* Contact (Officer only) */}
                {officer && (
                  <td className="py-4 px-5">
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                      {m.phoneNumber || <span className="text-zinc-400 font-sans italic text-[11px]">No phone</span>}
                    </div>
                    {m.telegramUsername && (
                      <div className="text-[11px] text-purple-600 dark:text-purple-400">
                        @{m.telegramUsername}
                      </div>
                    )}
                  </td>
                )}

                {/* Quick Arrow Action */}
                <td className="py-4 px-4 text-right">
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
