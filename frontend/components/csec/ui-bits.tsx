import { cn } from "@/lib/utils"
import type { ClaimStatus, WarningLevel, EventType, BadgeTier } from "@/lib/csec-data"
import { Sparkles, Shield, Award, Gem } from "lucide-react"

// Small rounded status pill (monochromatic)
export function StatusPill({
  status,
  className,
}: {
  status: ClaimStatus | "active" | "inactive"
  className?: string
}) {
  const styles: Record<string, string> = {
    approved: "bg-zinc-100 text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100 border border-zinc-200/80 dark:border-white/10",
    active: "bg-zinc-100 text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100 border border-zinc-200/80 dark:border-white/10",
    pending: "bg-zinc-100/70 text-zinc-600 dark:bg-white/[0.04] dark:text-zinc-400 border border-zinc-200/50 dark:border-white/[0.06]",
    rejected: "bg-zinc-100/70 text-zinc-500 dark:bg-white/[0.04] dark:text-zinc-500 border border-zinc-200/50 dark:border-white/[0.06]",
    inactive: "bg-zinc-100/50 text-zinc-400 dark:bg-white/[0.03] dark:text-zinc-500 border border-zinc-200/40 dark:border-white/[0.04]",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}

export function WarningPill({ level, className }: { level: WarningLevel; className?: string }) {
  const labels: Record<WarningLevel, string> = {
    normal: "Warning (-15 pts)",
    yellow: "Warning (-25 pts)",
    red: "Critical (-50 pts)",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {labels[level] || "Warning"}
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
  const configs: Record<EventType, { label: string }> = {
    claim: { label: "Claim" },
    normal_warning: { label: "Warning" },
    yellow_warning: { label: "Pattern Alert" },
    red_warning: { label: "Final Notice" },
    manual_adjustment: { label: "Adjustment" },
    layoff: { label: "Layoff" },
  }

  const { label } = configs[type] || { label: type }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10",
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

  const badges: Record<BadgeTier, { label: string; icon: typeof Award }> = {
    gold: {
      label: "Gold Tier",
      icon: Award,
    },
    platinum: {
      label: "Platinum Tier",
      icon: Sparkles,
    },
    diamond: {
      label: "Diamond Tier",
      icon: Gem,
    },
  }

  const config = badges[tier]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-zinc-200/80 dark:border-white/10 bg-zinc-100/80 dark:bg-white/[0.05] text-zinc-800 dark:text-zinc-200 px-2 py-0.5 text-[11px] font-medium tracking-wide",
        className,
      )}
    >
      <Icon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
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
        <span className="font-medium text-zinc-500 dark:text-zinc-400">
          {isCapped ? "Score Capped" : `${percentage}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-500 bg-zinc-900 dark:bg-zinc-100"
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
        "font-semibold tabular-nums",
        positive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      {positive ? "+" : ""}
      {value} pts
    </span>
  )
}

// Deterministic initials avatar (monochromatic)
function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

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
  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-white/10",
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
        "flex shrink-0 items-center justify-center rounded-full font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/10",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
