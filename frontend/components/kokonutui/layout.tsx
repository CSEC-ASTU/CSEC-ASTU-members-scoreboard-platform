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
  const [collapsed, setCollapsedState] = useState(false)

  // Restore the saved sidebar state after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (saved !== null) {
        setCollapsedState(saved === "true")
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Update state and persist it
  function setCollapsed(value: boolean) {
    setCollapsedState(value)

    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // Ignore storage errors
    }
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090B]">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-200 ease-in-out">
        <header className="h-16 border-b border-zinc-200/80 dark:border-white/[0.06] flex-shrink-0">
          <TopNav />
        </header>

        <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#09090B]">
          <div className="mx-auto w-full max-w-7xl mt-4 px-4 py-8 sm:px-8 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}