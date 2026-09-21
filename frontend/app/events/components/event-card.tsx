"use client"

import { useState } from "react"
import { Clock, MapPin, Share2, Sparkles, Check, Users } from "lucide-react"
import { LumaRegisterButton } from "./luma-register-button"
import { cn } from "@/lib/utils"

export interface EventItem {
  id: string
  title: string
  slug: string
  description: string
  cover_image_url?: string | null
  luma_url?: string | null
  luma_event_id?: string | null
  event_type: string
  division_id?: string | null
  division_name?: string | null
  points_reward: number
  start_time: string
  end_time: string
  location_name: string
  certificate_template_id?: string | null
  is_published: boolean
  creator_name?: string | null
}

interface EventCardProps {
  event: EventItem
  isPast?: boolean
  /** Base path used when copying a share link (default: /events). */
  shareBasePath?: string
}

export function EventCard({ event, isPast = false, shareBasePath = "/events" }: EventCardProps) {
  const [copied, setCopied] = useState(false)

  const startDate = new Date(event.start_time)

  const monthStr = startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const dayStr = startDate.toLocaleDateString("en-US", { day: "2-digit" })
  const timeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${shareBasePath}#${event.slug}` : ""
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // ignore
    }
  }

  const getGradientForDivision = (divName?: string | null) => {
    const name = (divName || "").toLowerCase()
    if (name.includes("cyber")) {
      return "from-emerald-100 via-zinc-50 to-white border-emerald-200/60 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-950 dark:border-emerald-500/20"
    }
    if (name.includes("software") || name.includes("dev")) {
      return "from-blue-100 via-zinc-50 to-white border-blue-200/60 dark:from-blue-950/40 dark:via-zinc-900 dark:to-zinc-950 dark:border-blue-500/20"
    }
    if (name.includes("ai") || name.includes("data")) {
      return "from-violet-100 via-zinc-50 to-white border-violet-200/60 dark:from-purple-950/40 dark:via-zinc-900 dark:to-zinc-950 dark:border-purple-500/20"
    }
    if (name.includes("cp") || name.includes("competitive")) {
      return "from-amber-100 via-zinc-50 to-white border-amber-200/60 dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-950 dark:border-amber-500/20"
    }
    return "from-cyan-100 via-zinc-50 to-white border-cyan-200/60 dark:from-cyan-950/40 dark:via-zinc-900 dark:to-zinc-950 dark:border-cyan-500/20"
  }

  return (
    <div
      id={event.slug}
      className="group relative flex flex-col rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/60 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-zinc-300 dark:hover:border-white/15 hover:shadow-lg hover:shadow-zinc-200/60 dark:hover:shadow-black/40"
    >
      <div className={cn("relative aspect-video w-full overflow-hidden bg-gradient-to-br border-b", getGradientForDivision(event.division_name))}>
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            <Sparkles className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-2 group-hover:text-violet-500 dark:group-hover:text-violet-400/70 transition-colors" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
              {event.division_name || "CSEC-ASTU"} Workshop
            </span>
          </div>
        )}

        {/* Overlays stay dark glass so they remain readable on photos */}
        <div className="absolute top-3 left-3 flex flex-col items-center justify-center rounded-xl bg-zinc-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1.5 shadow-lg min-w-[50px]">
          <span className="text-[10px] font-bold tracking-wider text-rose-300">{monthStr}</span>
          <span className="text-base font-extrabold text-white leading-tight">{dayStr}</span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="rounded-lg bg-zinc-950/75 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-200 shadow-sm flex items-center gap-1">
            <Users className="w-3 h-3 text-zinc-400" />
            {event.event_type === "internal" ? "Internal Lab" : "Public & Members"}
          </span>
          {event.points_reward > 0 && (
            <span className="rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-2 py-0.5 text-[11px] font-bold text-amber-200 shadow-sm">
              +{event.points_reward} Pts
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08]">
            {event.division_name || "Club-wide"}
          </span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeStr} EAT</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
          {event.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500/80" />
          <span className="truncate">{event.location_name}</span>
        </div>

        <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400/90 line-clamp-2 leading-relaxed flex-1">
          {event.description}
        </p>

        <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center gap-2">
          {isPast ? (
            <LumaRegisterButton
              lumaEventId={event.luma_event_id}
              lumaUrl={event.luma_url}
              label="Event Concluded"
              disabled
              className="flex-1"
            />
          ) : (
            <LumaRegisterButton
              lumaEventId={event.luma_event_id}
              lumaUrl={event.luma_url}
              label="Register for Event"
              className="flex-1"
            />
          )}

          <button
            onClick={handleShare}
            title="Copy event link"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
