"use client"

import { useEffect, useState } from "react"
import { CalendarDays, History, Loader2, Search, CalendarCheck2 } from "lucide-react"
import { EventCard, type EventItem } from "@/app/events/components/event-card"
import { PublicSiteHeader } from "@/components/landing/public-site-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { ApiError, eventsService } from "@/lib/api"
import { landingFontClassName } from "@/lib/landing-fonts"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ExploreEventsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [events, setEvents] = useState<EventItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const data = await eventsService.listEvents({
          filter: activeTab,
          search: searchQuery.trim() || undefined,
          event_type: "external",
          page_size: 50,
        })
        setEvents(data.items || [])
        setTotal(data.total || 0)
      } catch (err) {
        setEvents([])
        setTotal(0)
        if (err instanceof ApiError && err.status !== 401) {
          toast.error(err.detail || "Failed to load events")
        }
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchEvents, 200)
    return () => clearTimeout(timer)
  }, [activeTab, searchQuery])

  useEffect(() => {
    if (typeof window === "undefined" || loading) return
    const hash = window.location.hash.replace("#", "")
    if (!hash) return
    const el = document.getElementById(hash)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [loading, events])

  return (
    <div className={`dark ${landingFontClassName} min-h-screen bg-[#07080a] text-zinc-100 antialiased`}>
      <div className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16,185,129,0.14), transparent 55%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
          <PublicSiteHeader active="events" />

          <div className="mt-12 sm:mt-16">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
              Open to everyone
            </p>
            <h1 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
              Public events
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
              Workshops and campus sessions open to all. Club-only labs appear in the member hub after you sign in.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  activeTab === "upcoming"
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("past")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  activeTab === "past"
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                <History className="h-3.5 w-3.5" />
                Past
              </button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-9 pr-4 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-8 min-h-[320px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-500/70" />
                <p className="font-mono text-xs text-zinc-500">Loading events…</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 py-16 text-center">
                <CalendarDays className="mb-3 h-8 w-8 text-zinc-700" />
                <h2 className="text-sm font-semibold text-zinc-300">
                  {activeTab === "upcoming" ? "No upcoming public events" : "No past public events"}
                </h2>
                <p className="mt-1 max-w-sm text-xs text-zinc-600">
                  {activeTab === "upcoming"
                    ? "New open workshops will show up here when they are published."
                    : "Past public sessions will archive here after they conclude."}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-zinc-600">
                  {total} event{total === 1 ? "" : "s"}
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      isPast={activeTab === "past"}
                      shareBasePath="/events/explore"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  )
}
