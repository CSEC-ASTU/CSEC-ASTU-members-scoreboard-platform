"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/frontend/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { ChevronRight } from "lucide-react"
import Profile01 from "./profile-01"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "../theme-toggle"
import { useCurrentUser } from "@/frontend/components/user-context"
import { MEMBERS, ROLE_LABELS } from "@/lib/csec-data"
import { MemberAvatar } from "@/frontend/components/csec/ui-bits"

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  claims: "My History",
  leaderboard: "Leaderboard",
  members: "Members",
  approvals: "Approval Queue",
  permissions: "Permissions",
  admin: "Admin",
  profile: "My Profile",
  achievement: "Achievement Card",
  onboarding: "Onboarding",
  login: "Login",
}

export default function TopNav() {
  const pathname = usePathname()
  const { currentUser, setCurrentUserId } = useCurrentUser()

  const segments = pathname.split("/").filter(Boolean)
  const crumbs = segments.map((seg, i) => ({
    label: SEGMENT_LABELS[seg] ?? (seg.startsWith("m") ? "Member Profile" : seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }))

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px] pl-10 lg:pl-0">
        <Link href="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          CSEC
        </Link>
        {crumbs.map((item) => (
          <div key={item.href} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />
            <Link
              href={item.href}
              className="text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors capitalize"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        {/* Preview-as switcher for test previewing every role */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">View as</span>
          <Select value={currentUser.id} onValueChange={setCurrentUserId}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBERS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name} · {ROLE_LABELS[m.role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none rounded-full ring-2 ring-gray-200 dark:ring-[#2B2B30]">
            <MemberAvatar name={currentUser.name} size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-background border-border rounded-lg shadow-lg p-0"
          >
            <Profile01 />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
