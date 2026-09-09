import { apiFetch } from "../client"
import type { CurrentUserOut } from "../types"

export const authService = {
  getGoogleLoginUrl: () => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
    return `${base}/auth/google/login`
  },

  getMe: async (): Promise<CurrentUserOut> => {
    return apiFetch<CurrentUserOut>("/auth/me")
  },

  refreshToken: async (): Promise<{ status: string }> => {
    return apiFetch<{ status: string }>("/auth/refresh", { method: "POST" })
  },

  logout: async (): Promise<{ status: string }> => {
    return apiFetch<{ status: string }>("/auth/logout", { method: "POST" })
  },
}
