"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { profileChangesService, type ProfileChangeStatus } from "@/lib/api"

export function useProfileChangeRequests(
  enabled = true,
  status: ProfileChangeStatus | null = "pending",
) {
  return useQuery({
    queryKey: ["profile-change-requests", status],
    queryFn: () => profileChangesService.list({ status, page_size: 50 }),
    enabled,
    staleTime: 20 * 1000,
  })
}

export function useMyPendingProfileChange(enabled = true) {
  return useQuery({
    queryKey: ["profile-change-requests", "me-pending"],
    queryFn: () => profileChangesService.getMyPending(),
    enabled,
    staleTime: 20 * 1000,
  })
}

export function useApproveProfileChangeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileChangesService.approve(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-change-requests"] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}

export function useRejectProfileChangeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision_reason }: { id: string; decision_reason: string }) =>
      profileChangesService.reject(id, decision_reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-change-requests"] })
    },
  })
}

export function useCancelProfileChangeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileChangesService.cancel(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-change-requests"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}
