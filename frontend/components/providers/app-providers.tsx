"use client"

import type { ReactNode } from "react"
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
