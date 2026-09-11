import { apiFetch } from "../client"
import type { CurrentUserOut, TelegramConnectOut } from "../types"

export const authService = {
  getGoogleLoginUrl: (redirect?: string) => {
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
        ? "/api/proxy"
        : "http://localhost:8000/api/v1")
    return redirect
      ? `${base}/auth/google/login?redirect=${encodeURIComponent(redirect)}`
      : `${base}/auth/google/login`
  },


  getMe: async (): Promise<CurrentUserOut> => {
    return apiFetch<CurrentUserOut>("/auth/me")
  },

  refreshToken: async (): Promise<{ status?: string; detail: string }> => {
    return apiFetch<{ status?: string; detail: string }>("/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true,
    })
  },

  logout: async (): Promise<{ status: string }> => {
    return apiFetch<{ status: string }>("/auth/logout", { method: "POST" })
  },

  connectTelegram: async (): Promise<TelegramConnectOut> => {
    return apiFetch<TelegramConnectOut>("/auth/telegram/connect", { method: "POST" })
  },
}
