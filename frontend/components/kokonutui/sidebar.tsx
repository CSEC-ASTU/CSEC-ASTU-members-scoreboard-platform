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
import { useState } from "react"
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
          "group flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all duration-200",
          active
            ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium shadow-sm shadow-violet-500/5"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-white/[0.04]",
        )}
      >
        <span className="flex items-center">
          <Icon
            className={cn(
              "h-4 w-4 mr-3 flex-shrink-0 transition-colors",
              active ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
            )}
          />
          {children}
        </span>
        {badge !== undefined && badge > 0 ? (
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-1.5 text-[11px] font-semibold">
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
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-xl bg-white dark:bg-[#0F0F12] shadow-md border border-zinc-200 dark:border-white/10"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
      </button>

      <nav
        className={`
          fixed inset-y-0 left-0 z-[70] w-64 bg-white/95 dark:bg-[#0B0B0E]/95 backdrop-blur-xl transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:w-64 border-r border-zinc-200/80 dark:border-white/[0.06] flex flex-col
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col">
          <Link
            href="/dashboard"
            className="h-16 px-6 flex items-center border-b border-zinc-200/80 dark:border-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                CS
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">CSEC ASTU</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Engineering Club</span>
              </div>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-5 px-3">
            <div className="space-y-6">
              {/* CORE */}
              <div>
                <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Core
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={LayoutDashboard}>
                    Dashboard
                  </NavItem>
                  <NavItem href="/tasks" icon={ListChecks}>
                    Tasks
                  </NavItem>
                  <NavItem href="/leaderboard" icon={Trophy}>
                    Leaderboard
                  </NavItem>
                </div>
              </div>

              {/* DIRECTORY */}
              <div>
                <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Directory
                </div>
                <div className="space-y-1">
                  <NavItem href="/members" icon={Users2}>
                    Members
                  </NavItem>
                  <NavItem href="/claims" icon={History}>
                    My History
                  </NavItem>
                </div>
              </div>

              {/* ADMINISTRATION */}
              {officer && (
                <div>
                  <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Administration
                  </div>
                  <div className="space-y-1">
                    <NavItem href="/approvals" icon={Inbox} badge={pendingForMe}>
                      Approvals
                    </NavItem>
                    {canManagePermissions(currentUser) && (
                      <NavItem href="/permissions" icon={KeyRound}>
                        Permissions
                      </NavItem>
                    )}
                    {canManagePermissions(currentUser) && (
                      <NavItem href="/admin" icon={Settings}>
                        Settings
                      </NavItem>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-3 py-4 border-t border-zinc-200/80 dark:border-white/[0.06] space-y-1">
            <Link
              href="/profile"
              onClick={handleNavigation}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                pathname === "/profile"
                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-white/[0.04]",
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  pathname === "/profile" ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                )}
              />
              <span>My Profile</span>
            </Link>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
