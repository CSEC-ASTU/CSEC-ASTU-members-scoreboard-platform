"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { permissionsService, type MemberPermissionCreateIn } from "@/lib/api"

export function useMemberPermissions(params?: { page?: number; page_size?: number; member_id?: string }) {
  return useQuery({
    queryKey: ["permissions", params],
    queryFn: () => permissionsService.getMemberPermissions(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => permissionsService.getCatalog(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

export function useGrantPermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MemberPermissionCreateIn) => permissionsService.grantPermission(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}

export function useRevokePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => permissionsService.deletePermission(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}
