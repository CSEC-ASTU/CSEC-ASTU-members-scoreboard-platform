import { CLUB } from "@/lib/club-content"

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative border-t border-zinc-800/60 bg-[#07080a] px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:items-end">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
            Who we are
          </p>
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Not just a club — a family that builds with technology.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Founded under the {CLUB.department} at {CLUB.university},{" "}
            {CLUB.name} brings students together to learn by doing: ship
            software, explore AI, harden systems, and solve hard problems —
            together.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            Whether you are writing your first line of Python or preparing for a
            national programming contest, there is a seat here. We grow through
            collaboration, shared purpose, and a bias for building.
          </p>
        </div>

        <blockquote className="border-l-2 border-emerald-500/50 pl-5 sm:pl-6">
          <p className="font-[family-name:var(--font-landing-display)] text-xl font-semibold leading-snug text-zinc-200 sm:text-2xl">
            “{CLUB.quote}”
          </p>
          <footer className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
            {CLUB.tagline} · {CLUB.city}
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
