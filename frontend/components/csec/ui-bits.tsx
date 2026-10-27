"use client"

import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ClaimStatus, WarningLevel, EventType, BadgeTier } from "@/lib/csec-data"
import {
  Sparkles,
  Shield,
  Award,
  Gem,
  Check,
  Clock,
  X,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckSquare,
  SlidersHorizontal,
  UserX,
  Minus,
} from "lucide-react"

// Small rounded status pill with crisp semantic icons
export function StatusPill({
  status,
  className,
}: {
  status: ClaimStatus | "active" | "inactive"
  className?: string
}) {
  const styles: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/40",
    inactive: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.04] dark:text-zinc-400 border border-zinc-200/60 dark:border-white/[0.06]",
  }

  const icons: Record<string, typeof Check> = {
    approved: Check,
    active: Check,
    pending: Clock,
    rejected: X,
    inactive: Minus,
  }

  const Icon = icons[status] || Minus

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[status],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {status}
    </span>
  )
}

export function WarningPill({ level, className }: { level: WarningLevel; className?: string }) {
  const configs: Record<WarningLevel, { label: string; icon: typeof AlertTriangle; style: string }> = {
    normal: {
      label: "Warning (-15 pts)",
      icon: AlertTriangle,
      style: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    },
    yellow: {
      label: "Warning (-25 pts)",
      icon: AlertCircle,
      style: "bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700/50",
    },
    red: {
      label: "Critical (-50 pts)",
      icon: AlertOctagon,
      style: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/40",
    },
  }

  const config = configs[level] || configs.normal
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
        config.style,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
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
  const configs: Record<EventType, { label: string; icon: typeof CheckSquare }> = {
    claim: { label: "Claim", icon: CheckSquare },
    normal_warning: { label: "Warning", icon: AlertTriangle },
    yellow_warning: { label: "Pattern Alert", icon: AlertCircle },
    red_warning: { label: "Final Notice", icon: AlertOctagon },
    manual_adjustment: { label: "Adjustment", icon: SlidersHorizontal },
    layoff: { label: "Layoff", icon: UserX },
  }

  const { label, icon: Icon } = configs[type] || { label: type, icon: CheckSquare }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
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

function formatAvatarUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Format Google Drive links into direct CDN image endpoints
  const driveIdMatch =
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/)

  if (driveIdMatch && driveIdMatch[1]) {
    const fileId = driveIdMatch[1]
    return `https://lh3.googleusercontent.com/d/${fileId}`
  }

  return trimmed
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
  const [hasError, setHasError] = useState(false)
  const resolvedUrl = useMemo(() => formatAvatarUrl(imageUrl), [imageUrl])

  // Reset error state if the imageUrl changes (e.g. after uploading a new photo)
  useEffect(() => {
    setHasError(false)
  }, [imageUrl])

  if (resolvedUrl && !hasError) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={resolvedUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/10 select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
