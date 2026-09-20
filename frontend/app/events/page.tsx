"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Search,
  Plus,
  Loader2,
  CalendarCheck2,
  History,
} from "lucide-react"
import { EventCard, type EventItem } from "./components/event-card"
import { CreateEventDialog } from "./components/create-event-dialog"
import Layout from "@/components/kokonutui/layout"
import { useCurrentUser } from "@/components/user-context"
import { isOfficer } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApiError, divisionsService, eventsService } from "@/lib/api"
import { toast } from "sonner"

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

  useEffect(() => {
    async function fetchDivisions() {
      try {
        const data = await divisionsService.listDivisions()
        setDivisions(data.map((d) => ({ id: d.id, name: d.name })))
      } catch {
        // ignore — filters still work without pills
      }
    }
    fetchDivisions()
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const data = await eventsService.listEvents({
          filter: activeTab,
          division_id: selectedDivisionId !== "all" ? selectedDivisionId : undefined,
          search: searchQuery.trim() || undefined,
        })
        setEvents(data.items || [])
      } catch (err) {
        setEvents([])
        if (err instanceof ApiError && err.status !== 401) {
          toast.error(err.detail || "Failed to load events")
        }
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

  const divisionPills = useMemo(() => {
    return [{ id: "all", name: "All Events" }, ...divisions]
  }, [divisions])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Events & Workshops
              </h1>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Zero-friction registration powered by Luma. Verified passes with automatic certificate minting.
            </p>
          </div>

          {officer && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 rounded-xl font-semibold text-xs px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                Publish Event
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900/90 p-1 border border-zinc-200/80 dark:border-white/[0.08]">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "upcoming"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Past Events
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search events, topics, labs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.08] pl-9 pr-4 py-2 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-300 dark:focus:border-zinc-600 focus:outline-none"
            />
          </div>
        </div>

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
                    ? "bg-zinc-900 text-white border-zinc-900 font-semibold shadow-sm dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-white/[0.08] dark:hover:border-white/15 dark:hover:text-zinc-200"
                )}
              >
                {div.name}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500/70 mb-3" />
            <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">Loading upcoming events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/30 py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {activeTab === "upcoming" ? "No upcoming events scheduled" : "No past events found"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500 max-w-sm">
              {activeTab === "upcoming"
                ? "New workshops and bootcamps are announced on the CSEC Telegram channel before appearing here."
                : "Past events and conference archives will be listed here."}
            </p>
            {officer && activeTab === "upcoming" && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="mt-4 gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule First Event
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} isPast={activeTab === "past"} />
            ))}
          </div>
        )}

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
