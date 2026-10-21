"use client"

import { History, Milestone } from "lucide-react"
import { useReveal } from "@/hooks/use-reveal"
import { TIMELINE_MILESTONES } from "@/lib/timeline-data"

export function TimelineSection() {
  const { ref, isVisible } = useReveal(0.1)

  return (
    <section
      id="timeline"
      ref={ref}
      className="relative w-full border-t border-zinc-800/80 bg-[#0A0B0D] px-6 py-24 md:px-12 md:py-28 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div
          className={`mb-16 max-w-3xl transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-2.5 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
            <History className="h-3.5 w-3.5" />
            <span>COMMUNITY GENESIS &amp; MILESTONES</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
            Our history and division origins.
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-zinc-400 md:text-lg">
            How a student-led study initiative evolved into ASTU&apos;s flagship collegiate engineering guild.
          </p>
        </div>

        {/* Architectural Timeline Sequence */}
        <div className="relative border-l border-zinc-800/80 ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-12">
          {TIMELINE_MILESTONES.map((item, index) => (
            <div
              key={index}
              className="relative group transition-all duration-300"
            >
              {/* Spine Node Marker */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0A0B0D] border-2 border-zinc-700 group-hover:border-violet-400 group-hover:scale-110 transition-all">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 opacity-60 group-hover:opacity-100" />
              </div>

              {/* Year Stamp & Tag */}
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-sm font-mono font-bold text-violet-400">
                  {item.year}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
                  {item.tag}
                </span>
              </div>

              {/* Milestone Content */}
              <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-400 max-w-2xl">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
