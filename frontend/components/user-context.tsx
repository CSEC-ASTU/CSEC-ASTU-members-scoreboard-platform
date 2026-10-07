"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { Member, Permission } from "@/lib/csec-data"
import type { CurrentUserOut } from "@/lib/api/types"
import { authService } from "@/lib/api/services/auth"
import {
  clearCachedUserProfile,
  clearPwaSyncMeta,
  isPwaStandalone,
  readCachedUserProfile,
  writeCachedUserProfile,
} from "@/lib/pwa"

type AppUser = Member & {
  divisionId?: string | null
  secondaryDivisionId?: string | null
  secondaryDivision?: string
  cycleScore?: number
  displayScore?: number
  careerScore?: number
  badge?: string | null
  profileImageUrl?: string
  rawPermissions?: string[]
  telegramConnected?: boolean
  phoneNumber?: string | null
  githubUrl?: string | null
  studentId?: string | null
}

interface UserContextValue {
  currentUser: AppUser
  liveUser: CurrentUserOut | null
  isLoading: boolean
  isAuthenticated: boolean
  isOfflineSession: boolean
  logout: () => Promise<void>
  refetchUser: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

const UNAUTHENTICATED_STUB: AppUser = {
  id: "",
  name: "",
  email: "",
  division: "Development",
  divisionId: null,
  secondaryDivisionId: null,
  department: "",
  joiningYear: 0,
  role: "member",
  isActive: false,
  onboarded: false,
  permissions: [],
  rawPermissions: [],
  cycleScore: 0,
  displayScore: 0,
  careerScore: 0,
  badge: null,
  telegramConnected: false,
  phoneNumber: undefined,
  githubUrl: undefined,
  studentId: undefined,
}

function mapLiveUser(liveUser: CurrentUserOut): AppUser {
  const mappedPerms: Permission[] = (liveUser.permissions || []).map((pKey, idx) => ({
    id: `live-perm-${idx}`,
    label: pKey,
    permissionKey: pKey as any,
    grantedBy: "system",
    isEnabled: true,
    grantedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  return {
    id: liveUser.id,
    name: liveUser.full_name,
    email: liveUser.email,
    avatar: liveUser.profile_image_url ?? undefined,
    profileImageUrl: liveUser.profile_image_url ?? undefined,
    division:
      (liveUser.division_name as AppUser["division"]) ||
      (liveUser.division_id as AppUser["division"]) ||
      "Development",
    divisionId: liveUser.division_id,
    secondaryDivisionId: liveUser.secondary_division_id,
    secondaryDivision: liveUser.secondary_division_name ?? undefined,
    department: liveUser.department || "Software Engineering",
    joiningYear: liveUser.joining_year || 2024,
    role: liveUser.role,
    isActive: true,
    onboarded: liveUser.onboarded,
    permissions: mappedPerms,
    rawPermissions: liveUser.permissions || [],
    cycleScore: liveUser.cycle_score,
    displayScore: liveUser.display_score,
    careerScore: liveUser.career_score,
    badge: liveUser.badge ?? null,
    telegramUsername: liveUser.telegram_username ?? undefined,
    telegramConnected: Boolean(liveUser.telegram_connected),
    phoneNumber: liveUser.phone_number ?? undefined,
    githubUrl: liveUser.github_url ?? undefined,
    studentId: liveUser.student_id ?? undefined,
  }
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [liveUser, setLiveUser] = useState<CurrentUserOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOfflineSession, setIsOfflineSession] = useState(false)
  const mountedRef = useRef(false)

  const checkAuth = useCallback(async () => {
    try {
      const user = await authService.getMe()
      if (!mountedRef.current) return

      if (user) {
        setLiveUser(user)
        setIsOfflineSession(false)
        writeCachedUserProfile(user)
        try {
          const pendingRedirect = localStorage.getItem("csec_post_login_redirect")
          if (pendingRedirect && pendingRedirect.startsWith("/") && !pendingRedirect.startsWith("//")) {
            localStorage.removeItem("csec_post_login_redirect")
            const currentPath = window.location.pathname
            if (currentPath === "/dashboard" || currentPath === "/") {
              window.location.replace(pendingRedirect)
            }
          }
        } catch {
          // ignore
        }
        return
      }
      setLiveUser(null)
      setIsOfflineSession(false)
      clearCachedUserProfile()
    } catch {
      if (!mountedRef.current) return
      const cached = readCachedUserProfile()
      if (cached && (isBrowserOffline() || isPwaStandalone())) {
        setLiveUser(cached)
        setIsOfflineSession(true)
      } else if (!cached) {
        setLiveUser(null)
        setIsOfflineSession(false)
      }
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const cached = readCachedUserProfile()
    if (cached) {
      setLiveUser(cached)
      setIsLoading(false)
    }

    void checkAuth()

    const handleSessionExpired = () => {
      if (isBrowserOffline()) return
      setLiveUser(null)
      setIsOfflineSession(false)
      clearCachedUserProfile()
      void (async () => {
        try {
          if (isPwaStandalone()) {
            const { clearPwaPersistedQueries } = await import("@/lib/pwa-persister")
            clearPwaSyncMeta()
            await clearPwaPersistedQueries()
          } else {
            clearCachedUserProfile()
          }
        } catch {
          // ignore
        }
      })()
    }

    window.addEventListener("csec:session-expired", handleSessionExpired)
    return () => {
      mountedRef.current = false
      window.removeEventListener("csec:session-expired", handleSessionExpired)
    }
  }, [checkAuth])

  const currentUser = useMemo(() => {
    if (liveUser) return mapLiveUser(liveUser)
    return UNAUTHENTICATED_STUB
  }, [liveUser])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    }
    setLiveUser(null)
    setIsOfflineSession(false)
    clearCachedUserProfile()
    try {
      if (isPwaStandalone()) {
        const { clearPwaPersistedQueries } = await import("@/lib/pwa-persister")
        clearPwaSyncMeta()
        await clearPwaPersistedQueries()
      }
    } catch {
      // ignore
    }
    // Full reload on purpose: drops all in-memory query/user state after logout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/"
  }, [])

  const value = useMemo<UserContextValue>(
    () => ({
      currentUser,
      liveUser,
      isLoading,
      isAuthenticated: !!liveUser,
      isOfflineSession,
      logout,
      refetchUser: checkAuth,
    }),
    [currentUser, liveUser, isLoading, isOfflineSession, logout, checkAuth],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useCurrentUser must be used within a UserProvider")
  return ctx
}
