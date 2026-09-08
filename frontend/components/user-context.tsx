"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { MEMBERS, type Member } from "@/lib/csec-data"

interface UserContextValue {
  currentUser: Member
  setCurrentUserId: (id: string) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  // Default to the president so every surface is visible; a switcher in the
  // top nav lets you preview the app as any role while the backend is mocked.
  const [currentUserId, setCurrentUserId] = useState<string>("m1")

  const value = useMemo<UserContextValue>(() => {
    const currentUser = MEMBERS.find((m) => m.id === currentUserId) ?? MEMBERS[0]
    return { currentUser, setCurrentUserId }
  }, [currentUserId])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useCurrentUser must be used within a UserProvider")
  return ctx
}
