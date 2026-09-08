"use client"

import { LogOut, Trophy, Building2, GraduationCap, Send, Award, Sparkles } from "lucide-react"
import Link from "next/link"
import { useCurrentUser } from "@/frontend/components/user-context"
import {
  getMemberCycleScore,
  getMemberCareerScore,
  getMemberBadge,
  ROLE_LABELS,
  PLATFORM_SETTINGS,
} from "@/lib/csec-data"
import { MemberAvatar, TierBadge } from "@/frontend/components/csec/ui-bits"

export default function Profile01() {
  const { currentUser } = useCurrentUser()
  const cycleScore = getMemberCycleScore(currentUser.id)
  const careerScore = getMemberCareerScore(currentUser.id)
  const badge = getMemberBadge(cycleScore, PLATFORM_SETTINGS.scoreCap)

  const facts = [
    {
      label: "Cycle Score",
      value: `${cycleScore} pts`,
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
    },
    {
      label: "Career Score",
      value: `${careerScore} pts`,
      icon: <Sparkles className="w-4 h-4 text-cyan-500" />,
    },
    {
      label: "Division",
      value: currentUser.division,
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      label: "Department",
      value: currentUser.department,
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      label: "Telegram",
      value: currentUser.telegramUsername ?? "Not connected",
      icon: <Send className="w-4 h-4 text-blue-500" />,
    },
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative px-6 pt-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <MemberAvatar name={currentUser.name} size={60} />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.name}</h2>
                {badge && <TierBadge tier={badge} />}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{ROLE_LABELS[currentUser.role]}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-3" />

          <div className="space-y-1">
            {facts.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-1.5 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  {item.icon}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[130px] text-right font-medium">
                  {item.value}
                </span>
              </div>
            ))}

            <div className="pt-2 space-y-1.5">
              <Link
                href={`/profile`}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 p-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
              >
                Account &amp; Settings
              </Link>
              <Link
                href={`/profile/achievement`}
                className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 p-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Award className="w-3.5 h-3.5" />
                View Achievement Card
              </Link>
              <Link
                href={`/login`}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout (Switch Account)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
