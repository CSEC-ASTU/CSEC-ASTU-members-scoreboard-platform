"use client"

import { useEffect, type ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { PwaSyncProvider } from "@/components/providers/pwa-sync-provider"
import { UserProvider } from "@/components/user-context"
import { Toaster } from "@/components/ui/sonner"

/**
 * Single client boundary for app-wide providers.
 * Keeps root layout.tsx from pulling every provider into a fragile mega-chunk.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // In development, ensure stale service workers and caches from previous builds don't trap the browser on cached pages
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister()
          }
        })
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key)
          }
        })
      }
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <UserProvider>
          <PwaSyncProvider>{children}</PwaSyncProvider>
        </UserProvider>
      </QueryProvider>
      <Toaster />
    </ThemeProvider>
  )
}
