import { FOCUS_AREAS } from "@/lib/club-content"

export function PulseSection() {
  return (
    <section
      id="life"
      className="relative overflow-hidden border-t border-zinc-800/60 bg-[#07080a] px-5 py-20 sm:px-8 sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 40% at 80% 20%, rgba(16,185,129,0.1), transparent 60%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
            Club life
          </p>
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Contests, talks, bootcamps — year-round.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
            From national programming contests on our campus to free beginner
            bootcamps and late-night hackathons, CSEC ASTU stays loud about
            learning in public.
          </p>
        </div>

        <ol className="space-y-0">
          {FOCUS_AREAS.map((item, i) => (
            <li
              key={item.title}
              className="grid gap-3 border-t border-zinc-800/80 py-8 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-10 sm:py-10"
            >
              <div className="flex items-start gap-3 sm:block">
                <span className="mt-1 font-mono text-[11px] text-emerald-500/70 sm:mb-2 sm:mt-0 sm:block">
                  0{i + 1}
                </span>
                <h3 className="font-[family-name:var(--font-landing-display)] text-lg font-semibold text-zinc-100 sm:text-xl">
                  {item.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-500 sm:pt-1 sm:text-[15px]">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
