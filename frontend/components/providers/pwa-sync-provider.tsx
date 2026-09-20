"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useIsRestoring, useQueryClient } from "@tanstack/react-query"
import { useCurrentUser } from "@/components/user-context"
import {
  formatLastSynced,
  isPwaStandalone,
  PWA_CACHE_USER_KEY,
  readLastSyncedAt,
  writeLastSyncedAt,
} from "@/lib/pwa"

export type PwaSyncStatus = "idle" | "syncing" | "synced" | "failed"

interface PwaSyncContextValue {
  isPwa: boolean
  isOnline: boolean
  status: PwaSyncStatus
  lastSyncedAt: number | null
  lastSyncedLabel: string | null
  syncNow: () => Promise<void>
}

const PwaSyncContext = createContext<PwaSyncContextValue | null>(null)

const READ_QUERY_PREFIXES = [
  "divisions",
  "leaderboard",
  "members",
  "member",
  "member-events",
  "member-summaries",
  "point-events",
  "tasks",
  "approvals",
  "permissions",
  "active-attendance-sessions",
  "profile-change-requests",
  "settings",
]

export function PwaSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()
  const { isAuthenticated, liveUser, isLoading } = useCurrentUser()
  const [isPwa, setIsPwa] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [status, setStatus] = useState<PwaSyncStatus>("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const syncInFlight = useRef(false)

  useEffect(() => {
    setIsPwa(isPwaStandalone())
    setLastSyncedAt(readLastSyncedAt())
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine)

    const onOnline = () => setIsOnline(true)
    const onOffline = () => {
      setIsOnline(false)
      setStatus((prev) => (prev === "syncing" ? "failed" : prev))
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!isPwa || !isAuthenticated || syncInFlight.current) return

    syncInFlight.current = true
    setStatus("syncing")

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("failed")
      syncInFlight.current = false
      return
    }

    try {
      const results = await queryClient.refetchQueries({
        type: "all",
        predicate: (query) => {
          const key = query.queryKey[0]
          return typeof key === "string" && READ_QUERY_PREFIXES.includes(key)
        },
      })

      const hadFailure = Array.isArray(results)
        ? results.some((result) => result.status === "error")
        : false

      if (hadFailure) {
        setStatus("failed")
        return
      }

      const now = Date.now()
      writeLastSyncedAt(now)
      setLastSyncedAt(now)
      setStatus("synced")
    } catch {
      setStatus("failed")
    } finally {
      syncInFlight.current = false
    }
  }, [isAuthenticated, isPwa, queryClient])

  // Scope persisted cache to the signed-in member; wipe if a different user opens the PWA.
  useEffect(() => {
    if (!isPwa || !liveUser?.id) return
    try {
      const previous = localStorage.getItem(PWA_CACHE_USER_KEY)
      if (previous && previous !== liveUser.id) {
        void queryClient.clear()
      }
      localStorage.setItem(PWA_CACHE_USER_KEY, liveUser.id)
    } catch {
      // ignore
    }
  }, [isPwa, liveUser?.id, queryClient])

  // Sync after login once persisted cache has been restored.
  useEffect(() => {
    if (!isPwa || isLoading || isRestoring || !isAuthenticated) return
    void syncNow()
  }, [isAuthenticated, isLoading, isPwa, isRestoring, syncNow])

  // Retry when connectivity returns.
  useEffect(() => {
    if (!isPwa || !isAuthenticated || isRestoring || !isOnline) return
    if (status === "failed") {
      void syncNow()
    }
  }, [isOnline, isAuthenticated, isPwa, isRestoring, status, syncNow])

  const value = useMemo<PwaSyncContextValue>(
    () => ({
      isPwa,
      isOnline,
      status,
      lastSyncedAt,
      lastSyncedLabel: formatLastSynced(lastSyncedAt),
      syncNow,
    }),
    [isOnline, isPwa, lastSyncedAt, status, syncNow]
  )

  return <PwaSyncContext.Provider value={value}>{children}</PwaSyncContext.Provider>
}

export function usePwaSync(): PwaSyncContextValue {
  const ctx = useContext(PwaSyncContext)
  if (!ctx) {
    return {
      isPwa: false,
      isOnline: true,
      status: "idle",
      lastSyncedAt: null,
      lastSyncedLabel: null,
      syncNow: async () => {},
    }
  }
  return ctx
}
