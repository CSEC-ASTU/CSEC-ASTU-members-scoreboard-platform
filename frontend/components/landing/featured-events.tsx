import Link from "next/link"
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react"
import type { ClubEventOut } from "@/lib/api/types"
import { LumaRegisterButton } from "@/app/events/components/luma-register-button"

function formatEventDate(iso: string) {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { day: "2-digit" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  }
}

function FeaturedEventRow({ event }: { event: ClubEventOut }) {
  const { month, day, weekday, time } = formatEventDate(event.start_time)

  return (
    <article
      id={event.slug}
      className="group grid gap-4 border-b border-zinc-800/80 py-6 first:pt-0 last:border-b-0 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center sm:gap-6 sm:py-7"
    >
      <div className="flex items-baseline gap-3 sm:flex-col sm:items-start sm:gap-0.5">
        <span className="text-[11px] font-semibold tracking-wider text-emerald-400/90">{month}</span>
        <span className="font-[family-name:var(--font-landing-display)] text-3xl font-bold leading-none text-zinc-50 sm:text-4xl">
          {day}
        </span>
        <span className="text-xs text-zinc-500 sm:mt-1">{weekday}</span>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {event.division_name && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {event.division_name}
            </span>
          )}
        </div>
        <h3 className="font-[family-name:var(--font-landing-display)] text-lg font-semibold tracking-tight text-zinc-50 transition-colors group-hover:text-emerald-300 sm:text-xl">
          <Link href={`/events/explore#${event.slug}`} className="focus:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-zinc-500">{event.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-600" />
            {time} EAT
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-600" />
            <span className="truncate">{event.location_name}</span>
          </span>
        </div>
      </div>

      <div className="sm:justify-self-end">
        <LumaRegisterButton
          lumaEventId={event.luma_event_id}
          lumaUrl={event.luma_url}
          label="Register"
          className="!rounded-xl !bg-zinc-100 !px-4 !py-2.5 !text-xs !font-semibold !text-zinc-950 hover:!bg-white"
        />
      </div>
    </article>
  )
}

interface FeaturedEventsSectionProps {
  events: ClubEventOut[]
  total: number
}

export function FeaturedEventsSection({ events, total }: FeaturedEventsSectionProps) {
  return (
    <section
      id="upcoming-events"
      className="relative border-t border-zinc-800/60 bg-[#09090b] px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
              Open to everyone
            </p>
            <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Upcoming events
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Public workshops and sessions you can join without a club account.
            </p>
          </div>
          {total > 0 && (
            <Link
              href="/events/explore"
              className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-emerald-300"
            >
              View all events
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 py-16 text-center">
            <CalendarDays className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">No public events scheduled yet</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-600">
              Check back soon — new campus workshops are posted here when they go live.
            </p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <FeaturedEventRow key={event.id} event={event} />
            ))}
          </div>
        )}

        {total > events.length && (
          <div className="mt-10 text-center">
            <Link
              href="/events/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900/50"
            >
              See all {total} events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
