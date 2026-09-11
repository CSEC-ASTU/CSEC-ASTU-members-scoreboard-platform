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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer, canManagePermissions, canAccessAdmin } from "@/lib/permissions"
import { useApprovals } from "@/lib/hooks/use-queries"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { currentUser } = useCurrentUser()

  const officer = isOfficer(currentUser)
  const { data: approvalsData } = useApprovals(officer)
  const pendingForMe = approvalsData?.total ?? 0

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  // ─── NavItem ──────────────────────────────────────────────────────────────
  function NavItem({
    href,
    icon: Icon,
    children,
    badge,
  }: {
    href: string
    icon: React.ElementType
    children: React.ReactNode
    badge?: number
  }) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

    return (
      <Link
        href={href}
        onClick={handleNavigation}
        title={collapsed ? String(children) : undefined}
        className={cn(
          "group relative flex items-center rounded-xl transition-all duration-200",
          collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2",
          active
            ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium shadow-sm shadow-violet-500/5"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-white/[0.04]",
        )}
      >
        <span className={cn("flex items-center", collapsed ? "justify-center" : "")}>
          <Icon
            className={cn(
              "h-[18px] w-[18px] flex-shrink-0 transition-colors",
              collapsed ? "" : "mr-3",
              active ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
            )}
          />
          {!collapsed && <span className="text-sm">{children}</span>}
        </span>

        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-1.5 text-[11px] font-semibold",
              collapsed
                ? "absolute -top-1 -right-1 h-4 min-w-[16px] px-0.5 text-[9px]"
                : "ml-2"
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    )
  }

  // ─── Section label ────────────────────────────────────────────────────────
  function SectionLabel({ children }: { children: React.ReactNode }) {
    if (collapsed) {
      return <div className="my-2 h-px bg-zinc-200/80 dark:bg-white/[0.06]" />
    }
    return (
      <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
        {children}
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-xl bg-white dark:bg-[#0F0F12] shadow-md border border-zinc-200 dark:border-white/10"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
      </button>

      {/* ── Sidebar panel ─────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-[70] bg-white/95 dark:bg-[#0B0B0E]/95 backdrop-blur-xl",
          "border-r border-zinc-200/80 dark:border-white/[0.06] flex flex-col",
          "transform transition-all duration-200 ease-in-out",
          // Mobile: slide in/out; always full sidebar width on mobile
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "w-64 lg:translate-x-0 lg:static",
          // Desktop width
          collapsed ? "lg:w-[64px]" : "lg:w-64",
        )}
      >
        <div className="h-full flex flex-col overflow-hidden">

          {/* ── Logo / Branding ────────────────────────────────────────── */}
          <Link
            href="/dashboard"
            className={cn(
              "h-16 flex items-center border-b border-zinc-200/80 dark:border-white/[0.06] flex-shrink-0 transition-all duration-200",
              collapsed ? "justify-center px-0" : "px-6"
            )}
            title={collapsed ? "CSEC ASTU" : undefined}
          >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                CS
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">CSEC ASTU</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Engineering Club</span>
                </div>
              )}
            </div>
          </Link>

          {/* ── Nav items ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-2">
            <div className={cn("space-y-6", collapsed && "space-y-3")}>

              {/* CORE */}
              <div>
                <SectionLabel>Core</SectionLabel>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
                  <NavItem href="/tasks" icon={ListChecks}>Tasks</NavItem>
                  <NavItem href="/leaderboard" icon={Trophy}>Leaderboard</NavItem>
                </div>
              </div>

              {/* DIRECTORY */}
              <div>
                <SectionLabel>Directory</SectionLabel>
                <div className="space-y-1">
                  <NavItem href="/members" icon={Users2}>Members</NavItem>
                  <NavItem href="/claims" icon={History}>My History</NavItem>
                </div>
              </div>

              {/* ADMINISTRATION */}
              {officer && (
                <div>
                  <SectionLabel>Administration</SectionLabel>
                  <div className="space-y-1">
                    {canManagePermissions(currentUser) && (
                      <NavItem href="/permissions" icon={KeyRound}>Permissions</NavItem>
                    )}
                    {canAccessAdmin(currentUser) && (
                      <div>
                      <NavItem href="/approvals" icon={Inbox} badge={pendingForMe}>Approvals</NavItem>
                      <NavItem href="/admin" icon={Settings}>Admin Settings</NavItem>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer: Profile + Collapse toggle ─────────────────────── */}
          <div className="border-t border-zinc-200/80 dark:border-white/[0.06] flex-shrink-0 px-2 py-3 space-y-1">
            {/* Profile link */}
            <Link
              href="/profile"
              onClick={handleNavigation}
              title={collapsed ? "My Profile" : undefined}
              className={cn(
                "group flex items-center rounded-xl transition-all duration-200",
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                pathname === "/profile"
                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-white/[0.04]",
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  pathname === "/profile" ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                )}
              />
              {!collapsed && <span className="text-sm">My Profile</span>}
            </Link>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "hidden lg:flex w-full items-center rounded-xl px-3 py-2 text-sm transition-all duration-200",
                "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-white/[0.04]",
                collapsed ? "justify-center px-0" : "gap-2.5"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px] flex-shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-[18px] w-[18px] flex-shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
