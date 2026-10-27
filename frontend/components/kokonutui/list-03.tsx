"use client"

import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, RotateCw } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DIVISIONS, getPointsTrend, type Division } from "@/lib/csec-data"
import { pointEventsService } from "@/lib/api"
import { useDivisions } from "@/lib/hooks/use-queries"

const chartConfig = {
  points: {
    label: "Points",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Points-earned-over-time trend, filterable by division.
export default function List03({ className }: { className?: string }) {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("all")
  const { data: divisionsData } = useDivisions()

  // Find matching division name for fallback mock calculations
  const selectedDivisionName = useMemo(() => {
    if (selectedDivisionId === "all") return undefined
    const found = (divisionsData || []).find((d) => d.id === selectedDivisionId)
    return found ? (found.name as Division) : undefined
  }, [selectedDivisionId, divisionsData])

  // Query live approved point events from backend
  const {
    data: eventsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["trend-events", selectedDivisionId],
    queryFn: () =>
      pointEventsService.listEvents({
        status: "approved",
        division_id: selectedDivisionId === "all" ? undefined : selectedDivisionId,
        page_size: 100,
      }),
    staleTime: 60 * 1000,
    retry: 1,
  })

  // Group live events by week
  const liveTrendData = useMemo(() => {
    if (!eventsResponse?.items) return null
    const buckets: Record<string, number> = {}

    for (const e of eventsResponse.items) {
      const d = new Date(e.created_at)
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      buckets[label] = (buckets[label] ?? 0) + e.points_delta
    }

    const items = Object.entries(buckets).map(([week, points]) => ({ week, points }))
    items.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
    return items
  }, [eventsResponse])

  // Mock data fallback
  const mockData = useMemo(() => {
    return getPointsTrend(selectedDivisionName)
  }, [selectedDivisionName])

  // Determine if we should show mock fallback (e.g. API error or unreachable backend)
  const isFallback = isError || (!isLoading && liveTrendData === null)
  const data = isFallback || (liveTrendData && liveTrendData.length === 0)
    ? (liveTrendData && liveTrendData.length === 0 && !isError ? liveTrendData : mockData)
    : (liveTrendData || mockData)

  const total = data.reduce((sum, d) => sum + d.points, 0)

  return (
    <div className={cn("w-full", className)}>
      {/* Fallback Alert Banner */}
      {isFallback && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Showing preview trend data · Live backend connection unavailable</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
          >
            <RotateCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {total} <span className="text-xs font-mono font-normal text-zinc-500 dark:text-zinc-400">pts earned</span>
          </div>
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Approved division point events over time</p>
        </div>
        <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
          <SelectTrigger className="h-8 w-[190px] text-xs font-mono rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
            <SelectValue placeholder="All divisions" />
          </SelectTrigger>
          <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121316]">
            <SelectItem value="all" className="text-xs font-mono">
              All divisions
            </SelectItem>
            {divisionsData && divisionsData.length > 0
              ? divisionsData.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs font-mono">
                    {d.name}
                  </SelectItem>
                ))
              : DIVISIONS.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs font-mono">
                    {name}
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
