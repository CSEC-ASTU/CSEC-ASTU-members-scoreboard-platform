"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { leaderboardService } from "@/lib/api"

export function useLeaderboard(divisionId?: string) {
  return useQuery({
    queryKey: ["leaderboard", divisionId],
    queryFn: () => leaderboardService.getLeaderboard(divisionId === "all" ? undefined : divisionId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}
