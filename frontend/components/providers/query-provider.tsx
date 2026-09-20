"use client"

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { isPwaStandalone } from "@/lib/pwa"
import { getPwaPersister } from "@/lib/pwa-persister"

const PWA_PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7 // 7 days

function createQueryClient(pwaMode: boolean) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: pwaMode ? PWA_PERSIST_MAX_AGE : 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
        // In PWA, prefer cached data when offline instead of treating as hard failure UX.
        networkMode: pwaMode ? "offlineFirst" : "online",
      },
      mutations: {
        networkMode: "online",
        retry: 0,
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        if (!pwaMode || typeof navigator === "undefined" || navigator.onLine) return
        const message = error instanceof Error ? error.message : ""
        if (/network|failed to fetch|offline/i.test(message) || !navigator.onLine) {
          toast.error("You're offline. Actions require a connection.")
        }
      },
    }),
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [pwaMode, setPwaMode] = useState(false)
  const [ready, setReady] = useState(false)
  const [queryClient] = useState(() => createQueryClient(false))
  const [pwaQueryClient] = useState(() => createQueryClient(true))

  useEffect(() => {
    setPwaMode(isPwaStandalone())
    setReady(true)
  }, [])

  // SSR + first paint: same as before (in-memory only). Avoids enabling persist for web users.
  if (!ready || !pwaMode) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const persister = getPwaPersister(true)

  return (
    <PersistQueryClientProvider
      client={pwaQueryClient}
      persistOptions={{
        persister,
        maxAge: PWA_PERSIST_MAX_AGE,
        buster: "csec-pwa-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.status !== "success") return false
            const key = query.queryKey[0]
            // Persist read-oriented club data only — never auth refresh internals.
            const allowed = new Set([
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
            ])
            return typeof key === "string" && allowed.has(key)
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
