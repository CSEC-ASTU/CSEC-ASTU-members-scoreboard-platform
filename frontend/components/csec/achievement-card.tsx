"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Award, Sparkles, Share2, Copy, Check, ShieldCheck, Trophy, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"
import { useDivisions } from "@/lib/hooks/use-queries"
import {
  type Member,
  getMemberCareerScore,
  getMemberCycleScore,
  getMemberBadge,
  ROLE_LABELS,
  PLATFORM_SETTINGS,
} from "@/lib/csec-data"

export function AchievementCard({
  member,
  className,
}: {
  member: Member
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const { data: divisions = [] } = useDivisions()

  const resolvedDivision =
    divisions.find((d) => d.id === member.division || d.name.toLowerCase() === member.division?.toLowerCase())?.name ||
    (member.division && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.division)
      ? member.division
      : "General")

  const careerScore = (member as any).careerScore ?? getMemberCareerScore(member.id)
  const cycleScore = (member as any).cycleScore ?? getMemberCycleScore(member.id)
  const badge = (member as any).badge ?? getMemberBadge(cycleScore, PLATFORM_SETTINGS.scoreCap)

  function copyShareLink() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/members/${member.id}` : ""
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Share link copied to clipboard!")
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className={className}>
      {/* The Styled Achievement Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100/80 p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-[#0F0F12] dark:to-zinc-900">
        {/* Subtle decorative background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-zinc-500/[0.03] blur-3xl" />

        {/* Card Header: Club branding + Verified badge */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
              CS
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                CSEC ASTU
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Official Achievement Record · {PLATFORM_SETTINGS.currentAcademicYear}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" /> Verified
          </div>
        </div>

        {/* Member Profile info */}
        <div className="mt-5 flex items-start gap-4">
          <MemberAvatar
            name={member.name}
            imageUrl={(member as any).profileImageUrl || member.avatar}
            size={56}
            className="ring-2 ring-zinc-200 dark:ring-zinc-800"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{member.name}</h3>
              {badge && <TierBadge tier={badge} />}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{ROLE_LABELS[member.role]}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <span>{resolvedDivision}</span>
              <span>•</span>
              <span>{member.department}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Joined {member.joiningYear}
              </span>
            </div>
          </div>
        </div>

        {/* Score Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-zinc-100/60 p-3.5 dark:bg-zinc-900/60">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Lifetime Career Score</span>
            <div className="mt-1 flex items-baseline gap-1">
              <Trophy className="h-4 w-4 text-zinc-400" />
              <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {careerScore}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">pts</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Current Cycle ({PLATFORM_SETTINGS.currentAcademicYear})
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {cycleScore}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">pts</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>Adama Science & Technology University</span>
          <span>Computer Science & Engineering Club</span>
        </div>
      </div>

      {/* Share Actions */}
      <div className="mt-4 flex gap-2">
        <Button onClick={copyShareLink} variant="outline" className="flex-1" size="sm">
          {copied ? <Check className="mr-1.5 h-4 w-4 text-zinc-900 dark:text-zinc-100" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copied ? "Copied!" : "Copy Share Link"}
        </Button>
        <Button
          onClick={() => {
            toast.info("Achievement card ready for LinkedIn and social sharing!")
          }}
          className="flex-1"
          size="sm"
        >
          <Share2 className="mr-1.5 h-4 w-4" /> Share Card
        </Button>
      </div>
    </div>
  )
}
