import { cn } from "@/lib/utils"
import type { ClaimStatus, WarningLevel, EventType, BadgeTier } from "@/lib/csec-data"
import { Sparkles, Shield, Award, Gem } from "lucide-react"

// Small rounded status pill
export function StatusPill({
  status,
  className,
}: {
  status: ClaimStatus | "active" | "inactive"
  className?: string
}) {
  const styles: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function WarningPill({ level, className }: { level: WarningLevel; className?: string }) {
  const styles: Record<WarningLevel, string> = {
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        styles[level],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level === "yellow" ? "Yellow Warning" : "Red Warning"}
    </span>
  )
}

export function EventTypePill({
  type,
  className,
}: {
  type: EventType
  className?: string
}) {
  const configs: Record<EventType, { label: string; style: string }> = {
    claim: {
      label: "Claim",
      style: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    yellow_warning: {
      label: "Yellow Warning",
      style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    red_warning: {
      label: "Red Warning",
      style: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    manual_adjustment: {
      label: "Officer Adjustment",
      style: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    layoff: {
      label: "Layoff",
      style: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    },
  }

  const { label, style } = configs[type] || { label: type, style: "bg-zinc-100 text-zinc-700" }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        style,
        className,
      )}
    >
      {label}
    </span>
  )
}

// Tier Badges for when a member hits the score cap (PRD §4a)
export function TierBadge({
  tier,
  className,
}: {
  tier: BadgeTier | null | undefined
  className?: string
}) {
  if (!tier) return null

  const badges: Record<BadgeTier, { label: string; icon: typeof Award; style: string }> = {
    gold: {
      label: "Gold Tier",
      icon: Award,
      style:
        "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 shadow-sm",
    },
    platinum: {
      label: "Platinum Tier",
      icon: Sparkles,
      style:
        "bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700/60 shadow-sm",
    },
    diamond: {
      label: "Diamond Tier",
      icon: Gem,
      style:
        "bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700/60 shadow-sm",
    },
  }

  const config = badges[tier]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        config.style,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// Score progress against the academic year score cap
export function ScoreCapProgress({
  cycleScore,
  scoreCap = 2500,
  className,
}: {
  cycleScore: number
  scoreCap?: number
  className?: string
}) {
  const percentage = Math.min(Math.round((cycleScore / scoreCap) * 100), 100)
  const isCapped = cycleScore >= scoreCap

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          Cycle Progress <span className="font-semibold text-zinc-900 dark:text-zinc-100">{cycleScore}</span> / {scoreCap} pts
        </span>
        <span className={cn("font-medium", isCapped ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-zinc-500 dark:text-zinc-400")}>
          {isCapped ? "Score Capped ✨" : `${percentage}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isCapped
              ? "bg-gradient-to-r from-amber-500 to-amber-300"
              : "bg-zinc-900 dark:bg-zinc-50",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Signed point delta with clear color
export function PointDelta({ value, className }: { value: number; className?: string }) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {positive ? "+" : ""}
      {value} pts
    </span>
  )
}

// Deterministic initials avatar
function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const AVATAR_TONES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
]

export function MemberAvatar({
  name,
  imageUrl,
  size = 36,
  className,
}: {
  name: string
  imageUrl?: string | null
  size?: number
  className?: string
}) {
  const tone = AVATAR_TONES[name.length % AVATAR_TONES.length]

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        tone,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
