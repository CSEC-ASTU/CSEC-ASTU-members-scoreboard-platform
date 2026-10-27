"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowRight, Calendar, Bell, Sparkles } from "lucide-react"
import { useReveal } from "@/hooks/use-reveal"
import { CLUB } from "@/lib/club-content"
import { eventsService } from "@/lib/api"
import { EventCard, type EventItem } from "@/app/events/components/event-card"

interface EventsSectionProps {
  isActive?: boolean
}

function TelegramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  )
}

function LinkedInIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28M5.07 18.5h2.79v-8.37H5.07v8.37z" />
    </svg>
  )
}

function GitHubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

export function EventsSection({ isActive }: EventsSectionProps) {
  const { ref, isVisible: revealVisible } = useReveal(0.15)
  const isVisible = isActive !== undefined ? isActive : revealVisible
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await eventsService.listEvents({
          filter: "all",
          page_size: 3,
        })
        const items = (data?.items || []) as unknown as EventItem[]
        setEvents(items.slice(0, 3))
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  return (
    <section
      id="events"
      ref={ref}
      className="relative w-full border-t border-zinc-800/80 bg-[#0A0B0D] px-6 py-20 md:px-12 md:py-28 lg:px-16"
    >
      <div id="announcements" className="scroll-mt-24" />

      <div className="mx-auto max-w-7xl">
        {/* Section Header with Small Social Pills */}
        <div
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="max-w-2xl">
            <div className="mb-2.5 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
              <Bell className="h-3.5 w-3.5" />
              <span>OFFICIAL BROADCASTS &amp; CAMPUS EVENTS</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
              Never miss an ASTU talk, contest, or registration.
            </h2>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-zinc-400">
              Weekly division technical discussions, campus hackathons, and verifiable hands-on workshops.
            </p>
          </div>

          {/* Small Social Links Badges (Replacing the old big cards) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mr-1">
              Channels:
            </span>

            {/* Telegram Small Button */}
            <a
              href={CLUB.links.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121316] hover:bg-[#18191f] hover:border-violet-500/40 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:text-white group"
              title="Join CSEC ASTU Telegram Broadcast"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                <TelegramIcon className="h-3.5 w-3.5" />
              </div>
              <span>@CSEC_ASTU</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </a>

            {/* LinkedIn Small Button */}
            <a
              href={CLUB.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121316] hover:bg-[#18191f] hover:border-sky-500/40 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:text-white group"
              title="Follow CSEC ASTU on LinkedIn"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                <LinkedInIcon className="h-3.5 w-3.5" />
              </div>
              <span>csec-astu</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </a>

            {/* GitHub Small Button */}
            <a
              href={CLUB.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121316] hover:bg-[#18191f] hover:border-zinc-600 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:text-white group"
              title="Browse CSEC ASTU Open Source Repositories"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 group-hover:text-white transition-colors">
                <GitHubIcon className="h-3.5 w-3.5" />
              </div>
              <span>GitHub</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </a>
          </div>
        </div>

        {/* 3 Latest Events Grid (Open for registration or concluded) */}
        <div
          className={`transition-all duration-700 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
          }`}
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 text-center max-w-xl mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">No Scheduled Broadcasts Currently</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                New tech talks, workshops, and programming contests are posted here as soon as dates are confirmed. Follow our Telegram broadcast channel to get notified instantly.
              </p>
              <a
                href={CLUB.links.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-4 py-2 text-xs font-medium transition-colors"
              >
                <TelegramIcon className="h-3.5 w-3.5" />
                <span>Join @CSEC_ASTU on Telegram</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((evt) => {
                const isPast = new Date(evt.end_time).getTime() < now
                return (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    isPast={isPast}
                    shareBasePath="/events/explore"
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Prominent White See More CTA Button at the bottom (when events exist) */}
        {events.length > 0 && (
          <div className="mt-12 flex justify-center">
            <Link
              href="/events/explore"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 shadow-lg shadow-black/20"
            >
              <span>See more events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
