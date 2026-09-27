"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCurrentUser } from "@/components/user-context"

/**
 * Requires a signed-in member (or an offline cached session) before rendering
 * the authenticated app shell. Unauthenticated visitors are sent to the landing page.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const router = useRouter()
  const pathname = usePathname()
  const redirected = useRef(false)

  useEffect(() => {
    if (isLoading || isAuthenticated || redirected.current) return
    redirected.current = true
    try {
      if (pathname && pathname !== "/" && pathname.startsWith("/")) {
        localStorage.setItem("csec_post_login_redirect", pathname)
      }
    } catch {
      // ignore
    }
    router.replace("/")
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-[#09090B]">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs font-medium">Checking session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-[#09090B]">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs font-medium">Redirecting to home…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
