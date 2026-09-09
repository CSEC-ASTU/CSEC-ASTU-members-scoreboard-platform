import { apiFetch } from "../client"
import type { AttendanceSessionCreateIn, AttendanceSessionOut } from "../types"

export const attendanceService = {
  createSession: async (data: AttendanceSessionCreateIn): Promise<AttendanceSessionOut> => {
    return apiFetch<AttendanceSessionOut>("/attendance-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getActiveSessions: async (division_id?: string): Promise<AttendanceSessionOut[]> => {
    return apiFetch<AttendanceSessionOut[]>("/attendance-sessions/active", {
      params: division_id ? { division_id } : undefined,
    })
  },

  endSession: async (sessionId: string): Promise<AttendanceSessionOut> => {
    return apiFetch<AttendanceSessionOut>(`/attendance-sessions/${sessionId}/end`, {
      method: "POST",
    })
  },
}
