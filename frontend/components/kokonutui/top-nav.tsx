"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronRight } from "lucide-react"
import Profile01 from "./profile-01"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "../theme-toggle"
import { useCurrentUser } from "@/components/user-context"
import { MemberAvatar } from "@/components/csec/ui-bits"

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
  login: "Login",
  events: "Events",
  attendance: "Attendance",
}

export default function TopNav() {
  const pathname = usePathname()
  const { currentUser } = useCurrentUser()

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
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none rounded-full ring-2 ring-gray-200 dark:ring-[#2B2B30]">
            <MemberAvatar
              name={currentUser.name || "Member"}
              imageUrl={currentUser.profileImageUrl || currentUser.avatar}
              size={32}
            />
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
