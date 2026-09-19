import { apiFetch } from "../client"
import type {
  Paginated,
  ProfileChangeRequestOut,
  ProfileChangeStatus,
  ProfilePictureRequestResult,
  ProfileSelfUpdateResult,
  MemberSelfUpdateIn,
} from "../types"

export const profileChangesService = {
  list: async (params?: {
    status?: ProfileChangeStatus | null
    page?: number
    page_size?: number
  }): Promise<Paginated<ProfileChangeRequestOut>> => {
    return apiFetch<Paginated<ProfileChangeRequestOut>>("/profile-change-requests", { params })
  },

  getMyPending: async (): Promise<ProfileChangeRequestOut | null> => {
    return apiFetch<ProfileChangeRequestOut | null>("/profile-change-requests/me/pending")
  },

  approve: async (id: string): Promise<ProfileChangeRequestOut> => {
    return apiFetch<ProfileChangeRequestOut>(`/profile-change-requests/${id}/approve`, {
      method: "POST",
    })
  },

  reject: async (id: string, decision_reason: string): Promise<ProfileChangeRequestOut> => {
    return apiFetch<ProfileChangeRequestOut>(`/profile-change-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ decision_reason }),
    })
  },

  cancel: async (id: string): Promise<ProfileChangeRequestOut> => {
    return apiFetch<ProfileChangeRequestOut>(`/profile-change-requests/${id}/cancel`, {
      method: "POST",
    })
  },
}

// Re-export helpers used from members service path for profile update responses
export type { ProfileSelfUpdateResult, ProfilePictureRequestResult, MemberSelfUpdateIn }
