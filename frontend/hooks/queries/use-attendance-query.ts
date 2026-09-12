"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { attendanceService, type AttendanceSessionCreateIn } from "@/lib/api"

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

export function useAttendanceMatrix(division_id?: string, days: number = 30) {
  return useQuery({
    queryKey: ["attendance-matrix", division_id, days],
    queryFn: () => attendanceService.getAttendanceMatrix(division_id, days),
    staleTime: 30 * 1000,
  })
}
