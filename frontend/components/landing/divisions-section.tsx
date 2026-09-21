import { DIVISIONS } from "@/lib/club-content"

export function DivisionsSection() {
  return (
    <section
      id="divisions"
      className="relative border-t border-zinc-800/60 bg-[#09090b] px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
            Six divisions · one community
          </p>
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Specialize deeply. Grow together.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
            Members train inside focused divisions — and still share labs,
            talks, and campus-wide events. We also run a Blockchain team for
            practical distributed-systems exploration.
          </p>
        </div>

        <ul className="grid gap-0 sm:grid-cols-2">
          {DIVISIONS.map((div, index) => (
            <li
              key={div.name}
              className="group border-t border-zinc-800/80 py-6 pr-4 transition-colors hover:border-emerald-500/30 sm:odd:pr-10 sm:even:pl-10 sm:even:border-l sm:even:border-zinc-800/80"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[family-name:var(--font-landing-display)] text-lg font-semibold text-zinc-100 transition-colors group-hover:text-emerald-300 sm:text-xl">
                  {div.name}
                </h3>
              </div>
              <p className="mt-2 pl-8 text-sm leading-relaxed text-zinc-500 sm:pl-9">
                {div.blurb}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
