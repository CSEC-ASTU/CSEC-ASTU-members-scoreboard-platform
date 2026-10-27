"use client"

import { LogOut, Trophy, Building2, GraduationCap, Send, Award, Sparkles } from "lucide-react"
import Link from "next/link"
import { useCurrentUser } from "@/components/user-context"
import {
  getMemberCycleScore,
  getMemberCareerScore,
  getMemberBadge,
  ROLE_LABELS,
} from "@/lib/csec-data"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { useEffectiveSettings } from "@/lib/hooks/use-queries"

export default function Profile01() {
  const platformSettings = useEffectiveSettings()
  const { currentUser, liveUser, logout } = useCurrentUser()
  const cycleScore = liveUser?.cycle_score ?? currentUser.cycleScore ?? getMemberCycleScore(currentUser.id)
  const careerScore = liveUser?.career_score ?? currentUser.careerScore ?? getMemberCareerScore(currentUser.id)
  const badge = (currentUser.badge as any) ?? getMemberBadge(cycleScore, platformSettings.scoreCap)
  const isLive = Boolean(liveUser)
  const divisionName = liveUser?.division_name || currentUser.division || "General"
  const department = liveUser?.department || currentUser.department || "Not specified"
  const isTelegramConnected = Boolean(currentUser.telegramConnected || liveUser?.telegram_connected)
  const telegramUsername = liveUser?.telegram_username || currentUser.telegramUsername

  const facts = [
    {
      label: "Cycle Score",
      value: `${cycleScore} pts`,
      icon: <Trophy className="w-4 h-4 text-zinc-400" />,
    },
    {
      label: "Career Score",
      value: `${careerScore} pts`,
      icon: <Sparkles className="w-4 h-4 text-zinc-400" />,
    },
    {
      label: "Division",
      value: divisionName,
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      label: "Department",
      value: department,
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      label: "Telegram",
      value: telegramUsername ? `@${telegramUsername}` : (isTelegramConnected ? "Connected" : "Not connected"),
      icon: <Send className="w-4 h-4 text-zinc-400" />,
    },
  ]

  return (
    <div className="w-full p-5 space-y-3">
      <div className="flex items-center gap-3.5 mb-2">
        <div className="relative shrink-0">
          <MemberAvatar
            name={currentUser.name}
            imageUrl={currentUser.profileImageUrl || currentUser.avatar}
            size={48}
          />
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#121316] ${
              isTelegramConnected ? "bg-emerald-500" : "bg-zinc-400"
            }`}
            title={isTelegramConnected ? "Telegram Connected" : "Telegram Not Linked"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.name}</h2>
            {badge && <TierBadge tier={badge} />}
            {!isLive && (
              <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-mono text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Demo
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400">{ROLE_LABELS[currentUser.role]}</p>
          {currentUser.email && (
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 truncate mt-0.5">{currentUser.email}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-200/80 dark:bg-zinc-800/80 my-2" />

      <div className="space-y-1">
        {facts.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              {item.icon}
              <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
            </div>
            <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[130px] text-right font-medium">
              {item.value}
            </span>
          </div>
        ))}

        <div className="pt-2 space-y-1.5">
          <Link
            href="/profile"
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
          >
            Account &amp; Settings
          </Link>
          <Link
            href="/profile/achievement"
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 p-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Award className="w-3.5 h-3.5" />
            <span>View Achievement Card</span>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
