"use client"

import { Globe, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DivisionOut } from "@/lib/api/types"

interface DivisionComparisonViewProps {
  divisions: DivisionOut[]
  onSelectDivision: (divisionId: string) => void
}

export function DivisionComparisonView({ divisions, onSelectDivision }: DivisionComparisonViewProps) {
  return (
    <div className="relative overflow-x-auto w-full pt-1">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs font-semibold">
            <th className="py-3.5 px-5 min-w-[240px] font-semibold">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <span className="font-serif text-[13px] text-zinc-500 dark:text-zinc-400 font-bold">Aa</span>
                <span className="font-semibold">Division</span>
              </div>
            </th>
            <th className="py-3.5 px-5 min-w-[180px] font-semibold">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <span className="text-[13px]">🎯</span>
                <span className="font-semibold">Scope</span>
              </div>
            </th>
            <th className="py-3.5 px-5 min-w-[140px] font-semibold">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <span className="text-[13px]">⚡</span>
                <span className="font-semibold">Quick Action</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Club-Wide Entry */}
          <tr className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors">
            <td className="py-4 px-5">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-500" />
                <span>Club-Wide All-Hands</span>
              </span>
            </td>
            <td className="py-4 px-5 text-xs text-zinc-800 dark:text-white font-normal">
              General Club Membership
            </td>
            <td className="py-4 px-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectDivision("all")}
                className="h-7 text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700"
              >
                <span>Inspect Matrix</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </td>
          </tr>

          {/* Division Entries */}
          {divisions.map((d) => (
            <tr
              key={d.id}
              className="border-b border-zinc-200/60 dark:border-white/[0.03] hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-4 px-5">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {d.name}
                </span>
              </td>
              <td className="py-4 px-5 text-xs text-zinc-800 dark:text-white font-normal">
                Technical Track
              </td>
              <td className="py-4 px-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectDivision(d.id)}
                  className="h-7 text-xs flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                >
                  <span>Inspect Matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
