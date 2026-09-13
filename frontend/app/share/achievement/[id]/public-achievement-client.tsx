"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Award, Sparkles, Share2, Copy, Check, ShieldCheck, Trophy, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MemberAvatar, TierBadge } from "@/components/csec/ui-bits"

interface PublicAchievementClientProps {
  card: {
    full_name: string
    joining_year: number
    division_name: string | null
    secondary_division_name: string | null
    career_score: number
    cycle_score: number
    display_score: number
    badges: string[]
    profile_image_url: string | null
  }
  memberId: string
}

export function PublicAchievementClient({ card, memberId }: PublicAchievementClientProps) {
  const [copied, setCopied] = useState(false)

  const badge = card.badges?.[0] || null

  function copyShareLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success("Credential link copied to clipboard!")
      setTimeout(() => setCopied(false), 2500)
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${card.full_name}'s Achievement Card · CSEC ASTU`,
          text: `Check out ${card.full_name}'s official CSEC ASTU achievement record and score!`,
          url: window.location.href,
        })
      } catch {
        copyShareLink()
      }
    } else {
      copyShareLink()
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.12] bg-white dark:bg-[#121216] shadow-2xl p-6 sm:p-8">
        {/* Glow backdrop */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <MemberAvatar
                name={card.full_name}
                imageUrl={card.profile_image_url || undefined}
                size={64}
                className="ring-2 ring-violet-500/20 shadow-lg"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {card.full_name}
                  </h2>
                  {badge && <TierBadge tier={badge as any} />}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{card.division_name || "General Club Member"}</span>
                  {card.secondary_division_name && (
                    <>
                      <span>·</span>
                      <span>{card.secondary_division_name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Class of {card.joining_year}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Lifetime Career</span>
              </div>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {card.career_score.toLocaleString()} <span className="text-xs font-normal text-zinc-400">pts</span>
              </p>
              <p className="text-[10px] text-zinc-400">Uncapped historical extracurricular standing</p>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span>Cycle Standing</span>
              </div>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-violet-600 dark:text-violet-400">
                {card.display_score.toLocaleString()} <span className="text-xs font-normal text-zinc-400">pts</span>
              </p>
              <p className="text-[10px] text-zinc-400">Active academic year point ledger</p>
            </div>
          </div>

          {/* Credential Seal */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 p-3 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Official Student Credential · Adama Science & Technology University</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700/80 dark:text-emerald-400/80 shrink-0">
              ID: {memberId.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>

      {/* Share / Copy Action Bar */}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={copyShareLink}
          variant="outline"
          className="rounded-xl text-xs gap-1.5 h-9 bg-white dark:bg-[#121216]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied Link" : "Copy Credential Link"}</span>
        </Button>
        <Button
          onClick={handleNativeShare}
          className="rounded-xl text-xs gap-1.5 h-9 bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/20"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share to LinkedIn</span>
        </Button>
      </div>
    </div>
  )
}
