"use client"

import {
  LayoutDashboard,
  ListChecks,
  Trophy,
  Users2,
  ShieldCheck,
  Inbox,
  KeyRound,
  Settings,
  History,
  Menu,
} from "lucide-react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer, canManagePermissions } from "@/lib/permissions"
import { useApprovals } from "@/lib/hooks/use-queries"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { currentUser } = useCurrentUser()

  const officer = isOfficer(currentUser)
  const { data: approvalsData } = useApprovals(officer)
  const pendingForMe = approvalsData?.total ?? 0


  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    badge,
  }: {
    href: string
    icon: any
    children: React.ReactNode
    badge?: number
  }) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={cn(
          "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
          active
            ? "bg-zinc-100 dark:bg-[#1F1F23] text-gray-900 dark:text-white font-medium"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
        )}
      >
        <span className="flex items-center">
          <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
          {children}
        </span>
        {badge !== undefined && badge > 0 ? (
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[11px] font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            {badge}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23]"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav
        className={`
          fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-[#1F1F23]
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col">
          <Link
            href="/dashboard"
            className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                CS
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">CSEC ASTU</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Member Platform</span>
              </div>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Overview
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={LayoutDashboard}>
                    Dashboard
                  </NavItem>
                  <NavItem href="/tasks" icon={ListChecks}>
                    Tasks
                  </NavItem>
                  <NavItem href="/claims" icon={History}>
                    My History
                  </NavItem>
                  <NavItem href="/leaderboard" icon={Trophy}>
                    Leaderboard
                  </NavItem>
                  <NavItem href="/members" icon={Users2}>
                    Members
                  </NavItem>
                </div>
              </div>

              {officer && (
                <div>
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Officer
                  </div>
                  <div className="space-y-1">
                    <NavItem href="/approvals" icon={Inbox} badge={pendingForMe}>
                      Approval Queue
                    </NavItem>
                    {canManagePermissions(currentUser) && (
                      <NavItem href="/permissions" icon={KeyRound}>
                        Permissions
                      </NavItem>
                    )}
                    {canManagePermissions(currentUser) && (
                      <NavItem href="/admin" icon={Settings}>
                        Admin
                      </NavItem>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23] space-y-1">
            <Link
              href="/profile"
              onClick={handleNavigation}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/profile"
                  ? "bg-zinc-100 dark:bg-[#1F1F23] text-gray-900 dark:text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-[#1F1F23]",
              )}
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              My Profile
            </Link>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
