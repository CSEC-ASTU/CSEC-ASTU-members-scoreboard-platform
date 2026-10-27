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
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0B0C0E] border-b border-zinc-200/80 dark:border-zinc-800/80 h-full">
      <div className="font-mono text-xs hidden sm:flex items-center gap-1.5 truncate max-w-[340px] pl-10 lg:pl-0">
        <Link href="/dashboard" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          CSEC
        </Link>
        {crumbs.map((item) => (
          <div key={item.href} className="flex items-center gap-1.5">
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <Link
              href={item.href}
              className="text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none rounded-full ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-400 dark:hover:ring-zinc-600 transition-all">
            <MemberAvatar
              name={currentUser.name || "Member"}
              imageUrl={currentUser.profileImageUrl || currentUser.avatar}
              size={30}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-0 overflow-hidden"
          >
            <Profile01 />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
