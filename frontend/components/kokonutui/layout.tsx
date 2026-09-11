"use client"

import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090B]">
      <Sidebar />
      <div className="w-full flex flex-1 flex-col">
        <header className="h-16 border-b border-zinc-200/80 dark:border-white/[0.06]">
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
