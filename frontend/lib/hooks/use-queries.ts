"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  divisionsService,
  pointEventsService,
  tasksService,
  membersService,
  leaderboardService,
  permissionsService,
  settingsService,
  adminService,
  attendanceService,
  type ClaimCreateIn,
  type OfficerAdjustmentIn,
  type BatchOfficerEventCreateIn,
  type MemberPermissionCreateIn,
  type Role,
  type TaskCreateIn,
  type TaskUpdateIn,
  type AttendanceSessionCreateIn,
  type MemberSelfUpdateIn,
} from "@/lib/api"

/** =========================================================================
 * 1. Divisions Query (Cached for 1 hour across all pages)
 * ========================================================================= */
export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    queryFn: () => divisionsService.listDivisions(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

/** =========================================================================
 * 2. Approvals Queries & Mutations (Shared between Sidebar badge & Approvals page)
 * ========================================================================= */
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

/** =========================================================================
 * 3. Tasks Queries & Claim Mutations
 * ========================================================================= */
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

/** =========================================================================
 * 4. Member Ledger & Events
 * ========================================================================= */
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

/** =========================================================================
 * 5. Leaderboard Queries
 * ========================================================================= */
export function useLeaderboard(divisionId?: string) {
  return useQuery({
    queryKey: ["leaderboard", divisionId],
    queryFn: () => leaderboardService.getLeaderboard(divisionId === "all" ? undefined : divisionId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

/** =========================================================================
 * 6. Members Directory & Profile Detail Queries
 * ========================================================================= */
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

/** =========================================================================
 * 7. Delegated Permissions & Catalog Queries
 * ========================================================================= */
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

/** =========================================================================
 * 8. Platform Settings & Administration Queries
 * ========================================================================= */
export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => settingsService.getSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useAuditLog(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => adminService.getAuditLog(params),
    staleTime: 30 * 1000,
  })
}

export function useLoginFailures(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ["login-failures", params],
    queryFn: () => adminService.getLoginFailures(params),
    staleTime: 30 * 1000,
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

/** =========================================================================
 * 9. Attendance Session Code Queries & Mutations
 * ========================================================================= */
export function useActiveAttendanceSessions(division_id?: string) {
  return useQuery({
    queryKey: ["active-attendance-sessions", division_id],
    queryFn: () => attendanceService.getActiveSessions(division_id),
    staleTime: 10 * 1000, // 10 seconds refresh
    refetchInterval: 15 * 1000, // Polling active session status every 15s
  })
}

export function useCreateAttendanceSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AttendanceSessionCreateIn) => attendanceService.createSession(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["active-attendance-sessions"] })
    },
  })
}

export function useEndAttendanceSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => attendanceService.endSession(sessionId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["active-attendance-sessions"] })
    },
  })
}

