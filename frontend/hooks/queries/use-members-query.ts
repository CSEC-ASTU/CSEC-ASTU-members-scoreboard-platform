"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { membersService, pointEventsService, type Role, type MemberSelfUpdateIn } from "@/lib/api"

export function useMembers(params?: {
  page?: number
  page_size?: number
  search?: string
  division_id?: string
  role?: Role
  is_active?: boolean
}) {
  return useQuery({
    queryKey: ["members", params],
    queryFn: () => membersService.listMembers(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

export function useMemberDetail(memberId?: string) {
  return useQuery({
    queryKey: ["member", memberId],
    queryFn: () => membersService.getMember(memberId!),
    enabled: Boolean(memberId),
    staleTime: 60 * 1000,
  })
}

export function useMemberEvents(memberId?: string | null) {
  return useQuery({
    queryKey: ["point-events", memberId],
    queryFn: () => pointEventsService.listEvents({ member_id: memberId! }),
    enabled: Boolean(memberId && memberId !== "guest"),
    staleTime: 30 * 1000,
  })
}

export function useMemberDetailEvents(memberId?: string | null) {
  return useQuery({
    queryKey: ["member-events", memberId],
    queryFn: () => membersService.getMemberPointEvents(memberId!),
    enabled: Boolean(memberId),
    staleTime: 30 * 1000,
  })
}

export function useMemberSummaries(memberId?: string | null) {
  return useQuery({
    queryKey: ["member-summaries", memberId],
    queryFn: () => membersService.getAnnualSummaries({ member_id: memberId! }),
    enabled: Boolean(memberId && memberId !== "guest"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateMemberRoleOrDeptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        role?: Role
        division_id?: string | null
        secondary_division_id?: string | null
        department?: string
      }
    }) => membersService.updateMemberRoleOrDept(id, data),
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}

export function useUpdateMeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MemberSelfUpdateIn) => membersService.updateMe(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useLayoffMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      membersService.layoffMember(id, reason),
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["member", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["permissions"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
    },
  })
}
