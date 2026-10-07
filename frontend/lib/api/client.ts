// Centralized HTTP API client with cookie credentials, error normalization,
// and transparent token refresh orchestration (Clean Architecture).

import { getClientApiBaseUrl } from "@/lib/backend-url.mjs"

export class ApiError extends Error {
  status: number
  detail: string
  requestId?: string

  constructor(status: number, detail: string, requestId?: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
    this.requestId = requestId
  }
}

// In production on Vercel: requests go to /api/proxy/* (same domain → no cross-origin cookie issues)
// In local development: falls back directly to localhost:8000
const BASE_URL = getClientApiBaseUrl()

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  skipAuthRefresh?: boolean
  _retry?: boolean
}

/**
 * Endpoints that should never trigger an automatic 401 refresh retry.
 */
const AUTH_BYPASS_PREFIXES = [
  "/auth/refresh",
  "/auth/google",
  "/auth/logout",
]

function shouldBypassAuthRefresh(endpoint: string, options: RequestOptions): boolean {
  if (options.skipAuthRefresh || options._retry) {
    return true
  }
  return AUTH_BYPASS_PREFIXES.some((prefix) => endpoint.includes(prefix))
}

function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith("http")) return endpoint
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${base}${path}`
}

/**
 * AuthRefreshCoordinator
 *
 * Implements a concurrency lock (singleton Promise mutex) so that multiple
 * near-simultaneous 401 responses wait for a single POST /auth/refresh call.
 */
class AuthRefreshCoordinator {
  private activeRefreshPromise: Promise<boolean> | null = null

  public async refreshToken(): Promise<boolean> {
    if (this.activeRefreshPromise) {
      return this.activeRefreshPromise
    }

    this.activeRefreshPromise = this.performRefresh()
    try {
      return await this.activeRefreshPromise
    } finally {
      this.activeRefreshPromise = null
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const refreshUrl = resolveUrl("/auth/refresh")
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const response = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (response.ok) {
        return true
      }

      // Real auth rejection (online) — clear the session.
      this.notifySessionExpired()
      return false
    } catch {
      // Network failure / timeout (often offline): do not wipe a still-valid local session.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return false
      }
      // Aborted/timeout while online — soft failure; don't clear the session.
      return false
    }
  }

  private notifySessionExpired(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("csec:session-expired"))
    }
  }
}

export const authRefreshCoordinator = new AuthRefreshCoordinator()

/**
 * Explicit helper to refresh the active session (e.g. during app bootstrap).
 */
export async function refreshSession(): Promise<boolean> {
  return authRefreshCoordinator.refreshToken()
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, skipAuthRefresh, _retry, ...rest } = options

  let url = resolveUrl(endpoint)

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    })
    const qs = searchParams.toString()
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs
    }
  }

  const defaultHeaders: HeadersInit = {
    Accept: "application/json",
    ...(rest.body && !(rest.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
  }

  const response = await fetch(url, {
    ...rest,
    credentials: "include", // essential for httpOnly JWT cookie flow
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  })

  const requestId = response.headers.get("X-Request-ID") || undefined

  if (!response.ok) {
    // Intercept 401 Unauthorized and attempt token rotation
    if (response.status === 401 && !shouldBypassAuthRefresh(endpoint, options)) {
      const refreshed = await authRefreshCoordinator.refreshToken()
      if (refreshed) {
        // Replay original request with refreshed session cookies
        return apiFetch<T>(endpoint, {
          ...options,
          _retry: true,
        })
      }
    }

    let detail = `Request failed with status ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData.detail) {
        detail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail)
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(response.status, detail, requestId)
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  return response.json() as Promise<T>
}
