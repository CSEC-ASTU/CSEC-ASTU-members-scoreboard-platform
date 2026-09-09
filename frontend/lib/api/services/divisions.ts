import { apiFetch } from "../client"
import type { DivisionOut, DivisionCreateIn, DivisionUpdateIn } from "../types"

export const divisionsService = {
  getDivisions: async (): Promise<DivisionOut[]> => {
    return apiFetch<DivisionOut[]>("/divisions")
  },

  /** Alias for getDivisions */
  listDivisions: async (): Promise<DivisionOut[]> => {
    return apiFetch<DivisionOut[]>("/divisions")
  },

  getDivision: async (id: string): Promise<DivisionOut> => {
    return apiFetch<DivisionOut>(`/divisions/${id}`)
  },

  createDivision: async (data: DivisionCreateIn): Promise<DivisionOut> => {
    return apiFetch<DivisionOut>("/divisions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateDivision: async (id: string, data: DivisionUpdateIn): Promise<DivisionOut> => {
    return apiFetch<DivisionOut>(`/divisions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  deleteDivision: async (id: string): Promise<void> => {
    return apiFetch<void>(`/divisions/${id}`, {
      method: "DELETE",
    })
  },
}
