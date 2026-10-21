import { apiFetch } from "../client"
import type { AlumniCreateIn, AlumniItem, AlumniUpdateIn } from "../types"

export const alumniService = {
  listAlumni: async (params?: {
    featured_only?: boolean
    include_inactive?: boolean
    limit?: number
  }): Promise<AlumniItem[]> => {
    return apiFetch<AlumniItem[]>("/alumni", { params })
  },

  getAlumni: async (id: string): Promise<AlumniItem> => {
    return apiFetch<AlumniItem>(`/alumni/${id}`)
  },

  createAlumni: async (data: AlumniCreateIn): Promise<AlumniItem> => {
    return apiFetch<AlumniItem>("/alumni", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateAlumni: async (id: string, data: AlumniUpdateIn): Promise<AlumniItem> => {
    return apiFetch<AlumniItem>(`/alumni/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteAlumni: async (id: string): Promise<void> => {
    return apiFetch<void>(`/alumni/${id}`, {
      method: "DELETE",
    })
  },

  uploadPhoto: async (file: File): Promise<{ photo_url: string }> => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFetch<{ photo_url: string }>("/alumni/upload-photo", {
      method: "POST",
      body: formData,
    })
  },
}
