"use client"

import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"

const STORAGE_KEY = "csec-sidebar-collapsed"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // Initialise from localStorage so state survives Next.js remounts on navigation
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(STORAGE_KEY) === "true"
    } catch {
      return false
    }
  })

  // Keep localStorage in sync whenever the user toggles
  function setCollapsed(value: boolean) {
    setCollapsedState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore (e.g. private browsing with storage blocked)
    }
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090B]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-200 ease-in-out">
        <header className="h-16 border-b border-zinc-200/80 dark:border-white/[0.06] flex-shrink-0">
          <TopNav />
        </header>
        <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#09090B]">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
