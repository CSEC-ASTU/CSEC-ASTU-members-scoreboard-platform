"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MEMBERS, type Member, type Permission } from "@/lib/csec-data"
import { authService, type CurrentUserOut } from "@/lib/api"

interface UserContextValue {
  currentUser: Member & {
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
  liveUser: CurrentUserOut | null
  setCurrentUserId: (id: string) => void
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refetchUser: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("m1")
  const [liveUser, setLiveUser] = useState<CurrentUserOut | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkAuth = async () => {
    try {
      const user = await authService.getMe()
      if (user) {
        setLiveUser(user)
        try {
          const pendingRedirect = localStorage.getItem("csec_post_login_redirect")
          if (pendingRedirect && pendingRedirect.startsWith("/") && !pendingRedirect.startsWith("//")) {
            localStorage.removeItem("csec_post_login_redirect")
            if (typeof window !== "undefined") {
              const currentPath = window.location.pathname
              if (currentPath === "/dashboard" || currentPath === "/") {
                window.location.replace(pendingRedirect)
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // Not logged in or dev mode
      setLiveUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()

    const handleSessionExpired = () => {
      setLiveUser(null)
    }

    window.addEventListener("csec:session-expired", handleSessionExpired)
    return () => {
      window.removeEventListener("csec:session-expired", handleSessionExpired)
    }
  }, [])

  const currentUser = useMemo(() => {
    if (liveUser) {
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
        division: (liveUser.division_name as any) || (liveUser.division_id as any) || "Development",
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
        badge: (liveUser.badge as any) ?? null,
        telegramUsername: liveUser.telegram_username ?? undefined,
        telegramConnected: Boolean(liveUser.telegram_connected),
        phoneNumber: liveUser.phone_number ?? undefined,
        githubUrl: liveUser.github_url ?? undefined,
        studentId: liveUser.student_id ?? undefined,
      }
    }
    return {
      id: "guest",
      name: "Guest Member",
      email: "",
      division: "Development" as const,
      divisionId: null,
      secondaryDivisionId: null,
      department: "Software Engineering",
      joiningYear: 2026,
      role: "member" as const,
      isActive: false,
      onboarded: false,
      permissions: [],
      rawPermissions: [],
      cycleScore: 50,
      displayScore: 50,
      careerScore: 50,
      badge: null,
      telegramConnected: false,
      phoneNumber: undefined,
      githubUrl: undefined,
      studentId: undefined,
    }
  }, [liveUser])

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    }
    setLiveUser(null)
    window.location.href = "/login"
  }

  const value = useMemo<UserContextValue>(() => ({
    currentUser,
    liveUser,
    setCurrentUserId,
    isLoading,
    isAuthenticated: !!liveUser,
    logout,
    refetchUser: checkAuth,
  }), [currentUser, liveUser, isLoading])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useCurrentUser must be used within a UserProvider")
  return ctx
}

