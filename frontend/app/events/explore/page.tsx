"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { CalendarDays, History, Loader2, Search, CalendarCheck2, ExternalLink, ArrowRight } from "lucide-react"
import { EventCard, type EventItem } from "@/app/events/components/event-card"
import { useCurrentUser } from "@/components/user-context"
import { ApiError, eventsService } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ExploreEventsPage() {
  const { isAuthenticated } = useCurrentUser()
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
    <div className="relative min-h-screen w-full bg-[#0B0C0E] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200">
      {/* Authentic Student Photo Backdrop matching Landing Page */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-30">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members"
          fill
          priority
          className="object-cover object-[center_60%] grayscale-[15%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C0E]/90 via-[#0B0C0E]/60 to-[#0B0C0E]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/95 via-[#0B0C0E]/60 to-transparent" />
      </div>

      {/* Editorial Architectural Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#0B0C0E]/95 backdrop-blur-md shadow-sm shadow-black/40 py-3.5 px-6 md:px-12 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/csec_astu.svg"
              alt="CSEC ASTU"
              width={26}
              height={18}
              className="h-5 w-auto invert opacity-90 transition-opacity group-hover:opacity-100"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">CSEC ASTU</span>
              <span className="font-mono text-[10px] text-zinc-400 hidden sm:inline">Dept. of Computer Science &amp; Engineering</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Home
            </Link>
            <Link href="/#about" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              About
            </Link>
            <Link href="/#timeline" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Heritage
            </Link>
            <Link href="/#divisions" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Divisions
            </Link>
            <Link href="/events/explore" className="text-xs font-semibold text-zinc-100 transition-colors border-b-2 border-violet-400 pb-0.5">
              Events
            </Link>
            <Link href="/#alumni" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Alumni
            </Link>
            <Link href="/#community" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            <a
              href="https://lu.ma/csec-astu"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Lu.ma Calendar
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>

            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="rounded bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
            >
              {isAuthenticated ? "Dashboard" : "Member Login"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24 md:px-12 lg:px-16">
        {/* Page Heading */}
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
            <span>ASTU · DEPT OF COMPUTER SCIENCE &amp; ENGINEERING</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">PUBLIC ARCHIVE</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
            Public Sessions, Contests &amp; Tech Talks
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-300">
            Weekly Sunday lectures, competitive programming qualifiers, and open campus workshops.
            Open to all ASTU students and guests. Club-only internal laboratory sessions appear in the member hub.
          </p>
        </div>

        {/* Toolbar & Filters */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-[#121316] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "inline-flex items-center gap-2 rounded px-4 py-1.5 text-xs font-medium transition-colors",
                activeTab === "upcoming"
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Upcoming Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("past")}
              className={cn(
                "inline-flex items-center gap-2 rounded px-4 py-1.5 text-xs font-medium transition-colors",
                activeTab === "past"
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <History className="h-3.5 w-3.5" />
              Past Archive
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search topics or division..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-[#121316] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <a
              href="https://lu.ma/csec-astu"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-[#121316] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
            >
              Lu.ma
              <ExternalLink className="h-3 w-3 text-zinc-500" />
            </a>
          </div>
        </div>

        {/* Event List Area */}
        <div className="mt-8 min-h-[360px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-violet-400" />
              <p className="font-mono text-xs text-zinc-400">Loading public events ledger…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-zinc-800/80 bg-[#121316]/60 p-12 text-center backdrop-blur-sm">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
                <CalendarDays className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-100">
                {activeTab === "upcoming" ? "No upcoming public events scheduled" : "No past sessions found"}
              </h3>
              <p className="mt-2 max-w-md mx-auto text-xs leading-relaxed text-zinc-400">
                {activeTab === "upcoming"
                  ? "Sunday Tech Talks, CTF contests, and workshops are announced weekly. Join our Telegram for immediate registration links."
                  : "Try clearing your search query to see past recorded sessions."}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="https://t.me/CSEC_ASTU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
                >
                  Join Telegram Channel
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://lu.ma/csec-astu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
                >
                  Lu.ma Page
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  Showing {events.length} {activeTab === "upcoming" ? "upcoming" : "concluded"} session{events.length === 1 ? "" : "s"}
                </span>
                <span>ASTU Computer Labs</span>
              </div>
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
      </main>

      {/* Collegiate Brightened Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#08090A] px-6 py-12 md:px-12 lg:px-16 text-zinc-300">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100">CSEC ASTU</span>
              <span className="text-zinc-500">·</span>
              <span className="text-xs text-zinc-300">Computer Science &amp; Engineering Club</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Department of Computer Science &amp; Engineering · Adama Science and Technology University · Adama, Ethiopia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-300">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/#about" className="hover:text-white transition-colors">About</Link>
            <Link href="/#timeline" className="hover:text-white transition-colors">Heritage</Link>
            <Link href="/#divisions" className="hover:text-white transition-colors">Divisions</Link>
            <Link href="/events/explore" className="hover:text-white transition-colors">Events</Link>
            <Link href="/#alumni" className="hover:text-white transition-colors">Alumni</Link>
            <Link href="/#community" className="hover:text-white transition-colors">Contact</Link>
            <a href="https://t.me/CSEC_ASTU" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
            <a href="https://www.linkedin.com/company/csec-astu" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="https://github.com/CSEC-ASTU" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/login" className="hover:text-white transition-colors">Member Sign In</Link>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-zinc-800/80 pt-6 text-center sm:text-left text-xs text-zinc-400">
          © {new Date().getFullYear()} CSEC ASTU. An independent student organization at Adama Science and Technology University.
        </div>
      </footer>
    </div>
  )
}
