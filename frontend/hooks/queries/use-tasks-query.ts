"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { tasksService, pointEventsService, type ClaimCreateIn, type OfficerAdjustmentIn, type BatchOfficerEventCreateIn, type TaskCreateIn, type TaskUpdateIn } from "@/lib/api"

export function useTasks(params?: { page?: number; page_size?: number; division_id?: string; active_only?: boolean }) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => tasksService.listTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useCreateClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ClaimCreateIn) => pointEventsService.createClaim(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}

export function useSubmitOfficerAdjustmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OfficerAdjustmentIn) => pointEventsService.submitOfficerAdjustment(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
      queryClient.invalidateQueries({ queryKey: ["member"] })
      queryClient.invalidateQueries({ queryKey: ["member-events"] })
    },
  })
}

export function useBatchOfficerEventsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchOfficerEventCreateIn) => pointEventsService.batchOfficerEvents(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["point-events"] })
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["member"] })
      queryClient.invalidateQueries({ queryKey: ["member-events"] })
    },
  })
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreateIn) => tasksService.createTask(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdateIn }) =>
      tasksService.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] })
      const previousQueries = queryClient.getQueriesData({ queryKey: ["tasks"] })

      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.map((t: any) => (t.id === id ? { ...t, ...data } : t))
        }
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((t: any) => (t.id === id ? { ...t, ...data } : t)),
          }
        }
        return old
      })

      return { previousQueries }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, oldData] of context.previousQueries) {
          queryClient.setQueryData(queryKey, oldData)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
