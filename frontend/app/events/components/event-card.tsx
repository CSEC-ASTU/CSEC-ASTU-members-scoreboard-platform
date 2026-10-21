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

  return (
    <div
      id={event.slug}
      className="group relative flex flex-col rounded-lg border border-zinc-800 bg-[#121316]/90 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-zinc-700"
    >
      {/* Event Media / Header Frame */}
      <div className="relative aspect-video w-full overflow-hidden border-b border-zinc-800/80 bg-[#0E0F12]">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#121316] via-[#0E0F12] to-[#0A0B0D]">
            <Sparkles className="w-7 h-7 text-zinc-600 mb-2 group-hover:text-violet-400 transition-colors" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              {event.division_name || "CSEC ASTU"} Workshop
            </span>
          </div>
        )}

        {/* Date Stamp Overlay */}
        <div className="absolute top-3 left-3 flex flex-col items-center justify-center rounded border border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 shadow-md min-w-[46px]">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-violet-400">{monthStr}</span>
          <span className="text-sm font-mono font-bold text-zinc-100 leading-tight">{dayStr}</span>
        </div>

        {/* Badges Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="rounded border border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-zinc-300 shadow-sm flex items-center gap-1">
            <Users className="w-3 h-3 text-zinc-400" />
            {event.event_type === "internal" ? "Members Only" : "Public Campus"}
          </span>
          {event.points_reward > 0 && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-medium text-amber-300 shadow-sm">
              +{event.points_reward} Pts
            </span>
          )}
        </div>
      </div>

      {/* Content Details */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono font-medium text-violet-400 tracking-wider uppercase">
            {event.division_name || "Club Guild"}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{timeStr} EAT</span>
          </div>
        </div>

        <h3 className="text-base font-semibold text-zinc-100 line-clamp-1 group-hover:text-violet-300 transition-colors">
          {event.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-violet-400" />
          <span className="truncate">{event.location_name || "ASTU Campus"}</span>
        </div>

        <p className="mt-2.5 text-xs text-zinc-300 line-clamp-2 leading-relaxed flex-1">
          {event.description}
        </p>

        <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center gap-2">
          {isPast ? (
            <LumaRegisterButton
              lumaEventId={event.luma_event_id}
              lumaUrl={event.luma_url}
              label="Concluded Session"
              disabled
              className="flex-1"
            />
          ) : (
            <LumaRegisterButton
              lumaEventId={event.luma_event_id}
              lumaUrl={event.luma_url}
              label="Register for Session"
              className="flex-1"
            />
          )}

          <button
            type="button"
            onClick={handleShare}
            title="Copy share link"
            className="flex items-center justify-center h-8 w-8 rounded border border-zinc-800 bg-zinc-900/80 hover:border-zinc-600 hover:text-white text-zinc-400 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
