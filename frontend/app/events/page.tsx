"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Search,
  Filter,
  Sparkles,
  Plus,
  Loader2,
  CalendarCheck2,
  History,
  Info,
} from "lucide-react"
import { EventCard, type EventItem } from "./components/event-card"
import { CreateEventDialog } from "./components/create-event-dialog"
import Layout from "@/components/kokonutui/layout"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function EventsPage() {
  const { currentUser } = useCurrentUser()
  const officer = currentUser ? isOfficer(currentUser) : false

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [events, setEvents] = useState<EventItem[]>([])
  const [divisions, setDivisions] = useState<Array<{ id: string; name: string }>>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch divisions
  useEffect(() => {
    async function fetchDivisions() {
      try {
        const res = await fetch("/api/v1/divisions")
        if (res.ok) {
          const data = await res.json()
          setDivisions(data.map((d: any) => ({ id: d.id, name: d.name })))
        }
      } catch {
        // ignore
      }
    }
    fetchDivisions()
  }, [])

  // Fetch events based on tab
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("filter", activeTab)
        if (selectedDivisionId !== "all") {
          params.set("division_id", selectedDivisionId)
        }
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim())
        }

        const res = await fetch(`/api/v1/events?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data.items || [])
        } else {
          setEvents([])
        }
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchEvents()
    }, 200)

    return () => clearTimeout(timer)
  }, [activeTab, selectedDivisionId, searchQuery])

  const handleEventCreated = (newEvent: EventItem) => {
    setEvents((prev) => [newEvent, ...prev])
  }

  // Predefined division filter pills
  const divisionPills = useMemo(() => {
    return [
      { id: "all", name: "All Events" },
      ...divisions,
    ]
  }, [divisions])

  return (
    <Layout>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-8">
        {/* Top Hero Section */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/70 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Events & Workshops
              </h1>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
              Zero-friction registration powered by Luma Edge. Verified Apple & Google Wallet passes with automatic certificate minting.
            </p>
          </div>

          {officer && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold text-xs px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                Publish Event
              </Button>
            </div>
          )}
        </div>

        {/* Filter Bar: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-neutral-900/90 p-1 border border-neutral-800/80">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "upcoming"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "past"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Past Events
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search events, topics, labs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/90 border border-neutral-800/80 pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Division Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {divisionPills.map((div) => {
            const isSelected = selectedDivisionId === div.id
            return (
              <button
                key={div.id}
                onClick={() => setSelectedDivisionId(div.id)}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all border",
                  isSelected
                    ? "bg-neutral-100 text-neutral-950 border-white font-semibold shadow-sm"
                    : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200"
                )}
              >
                {div.name}
              </button>
            )
          })}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/70 mb-3" />
            <p className="text-xs text-neutral-500 font-mono">Loading upcoming events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-900/30 py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-neutral-800/50 flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 text-neutral-500" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-200">
              {activeTab === "upcoming" ? "No upcoming events scheduled" : "No past events found"}
            </h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm">
              {activeTab === "upcoming"
                ? "New workshops and bootcamps are announced on the CSEC Telegram channel before appearing here."
                : "Past events and conference archives will be listed here."}
            </p>
            {officer && activeTab === "upcoming" && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="mt-4 gap-2 border-neutral-800 text-xs text-neutral-300 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule First Event
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                isPast={activeTab === "past"}
              />
            ))}
          </div>
        )}
      </div>

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onEventCreated={handleEventCreated}
          divisions={divisions}
        />
      </div>
    </Layout>
  )
}
