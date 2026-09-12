"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { pointEventsService } from "@/lib/api"

export function useApprovals(enabled = true) {
  return useQuery({
    queryKey: ["approvals"],
    queryFn: () => pointEventsService.listApprovals(),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds
    enabled,
  })
}

export function useApproveClaimsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => pointEventsService.bulkApprove(ids),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["member"] })
      queryClient.invalidateQueries({ queryKey: ["member-events"] })
    },
  })
}

export function useRejectClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      pointEventsService.rejectEvent(id, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      queryClient.invalidateQueries({ queryKey: ["member-events"] })
    },
  })
}
