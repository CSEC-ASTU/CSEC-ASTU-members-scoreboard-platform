import { apiFetch } from "../client"
import type {
  MemberDetailOut,
  MemberOut,
  AchievementCardOut,
  AnnualSummaryOut,
  Paginated,
  PointEventOut,
  Role,
} from "../types"

export const membersService = {
  getMembers: async (params?: {
    page?: number
    page_size?: number
    division_id?: string
    role?: Role
    is_active?: boolean
    search?: string
  }): Promise<Paginated<MemberOut>> => {
    return apiFetch<Paginated<MemberOut>>("/members", { params })
  },

  /** Alias for getMembers */
  listMembers: async (params?: {
    page?: number
    page_size?: number
    division_id?: string
    role?: Role
    is_active?: boolean
    search?: string
  }): Promise<Paginated<MemberOut>> => {
    return apiFetch<Paginated<MemberOut>>("/members", { params })
  },

  getMember: async (id: string): Promise<MemberDetailOut> => {
    return apiFetch<MemberDetailOut>(`/members/${id}`)
  },

  updateMe: async (data: { department?: string; joining_year?: number }): Promise<MemberOut> => {
    return apiFetch<MemberOut>("/members/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  uploadProfilePicture: async (file: File): Promise<{ profile_image_url: string }> => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFetch<{ profile_image_url: string }>("/members/me/profile-picture", {
      method: "POST",
      body: formData,
    })
  },

  deleteProfilePicture: async (): Promise<{ status: string }> => {
    return apiFetch<{ status: string }>("/members/me/profile-picture", {
      method: "DELETE",
    })
  },

  updateMemberRoleOrDept: async (
    id: string,
    data: {
      role?: Role
      division_id?: string | null
      secondary_division_id?: string | null
      department?: string
    },
  ): Promise<MemberOut> => {
    return apiFetch<MemberOut>(`/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  layoffMember: async (id: string, reason: string): Promise<{ status: string; event_id: string }> => {
    return apiFetch<{ status: string; event_id: string }>(`/members/${id}/layoff`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  getMemberPointEvents: async (
    id: string,
    params?: { page?: number; page_size?: number },
  ): Promise<Paginated<PointEventOut>> => {
    return apiFetch<Paginated<PointEventOut>>(`/members/${id}/point-events`, { params })
  },

  getMemberAchievementCard: async (id: string): Promise<AchievementCardOut> => {
    return apiFetch<AchievementCardOut>(`/members/${id}/achievement-card`)
  },

  getAnnualSummaries: async (params?: {
    member_id?: string
    academic_year?: number
    page?: number
    page_size?: number
  }): Promise<Paginated<AnnualSummaryOut>> => {
    return apiFetch<Paginated<AnnualSummaryOut>>("/annual", { params })
  },
}

