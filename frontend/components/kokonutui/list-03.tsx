"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/frontend/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { DIVISIONS, getPointsTrend, type Division } from "@/lib/csec-data"

const chartConfig = {
  points: {
    label: "Points",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Points-earned-over-time trend, filterable by division.
export default function List03({ className }: { className?: string }) {
  const [division, setDivision] = useState<Division | "all">("all")
  const data = getPointsTrend(division === "all" ? undefined : division)
  const total = data.reduce((sum, d) => sum + d.points, 0)

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {total} <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">pts earned</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Approved point events over time</p>
        </div>
        <Select value={division} onValueChange={(v) => setDivision(v as Division | "all")}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All divisions
            </SelectItem>
            {DIVISIONS.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fillPoints" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-points)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-points)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} width={32} fontSize={12} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="points"
            type="monotone"
            fill="url(#fillPoints)"
            stroke="var(--color-points)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
