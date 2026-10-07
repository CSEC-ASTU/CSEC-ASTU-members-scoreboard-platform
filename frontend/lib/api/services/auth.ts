import { apiFetch, ApiError, authRefreshCoordinator } from "../client"
import type { CurrentUserOut, TelegramConnectOut } from "../types"
import { getClientApiBaseUrl } from "@/lib/backend-url.mjs"

const AUTH_TIMEOUT_MS = 8000

function withTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

export const authService = {
  getGoogleLoginUrl: (redirect?: string) => {
    const base = getClientApiBaseUrl()
    return redirect
      ? `${base}/auth/google/login?redirect=${encodeURIComponent(redirect)}`
      : `${base}/auth/google/login`
  },

  /**
   * Resolve the current user quickly.
   * Uses skipAuthRefresh on the first attempt so anonymous visitors don't wait on a
   * doomed refresh round-trip; retries once after a successful refresh if needed.
   */
  getMe: async (): Promise<CurrentUserOut> => {
    try {
      return await apiFetch<CurrentUserOut>("/auth/me", {
        skipAuthRefresh: true,
        signal: withTimeout(AUTH_TIMEOUT_MS),
      })
    } catch (err) {
      const isUnauthorized = err instanceof ApiError && err.status === 401
      if (!isUnauthorized) throw err

      const refreshed = await authRefreshCoordinator.refreshToken()
      if (!refreshed) throw err

      return apiFetch<CurrentUserOut>("/auth/me", {
        skipAuthRefresh: true,
        signal: withTimeout(AUTH_TIMEOUT_MS),
      })
    }
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
