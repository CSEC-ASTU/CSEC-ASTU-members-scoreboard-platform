"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { useCurrentUser } from "@/components/user-context"
import { CLUB } from "@/lib/club-content"
import { PublicSiteHeader } from "./public-site-header"

export function LandingHero() {
  const { isAuthenticated, isLoading } = useCurrentUser()

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#07080a]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 80%, rgba(6,182,212,0.12), transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
        <div className="pointer-events-none absolute -right-[8%] top-[18%] hidden w-[55vw] max-w-3xl opacity-[0.07] lg:block">
          <Image
            src="/csec_astu.svg"
            alt=""
            width={800}
            height={580}
            className="h-auto w-full invert"
            priority
          />
        </div>
      </div>

      <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <PublicSiteHeader active="home" />

        <div className="flex flex-1 flex-col justify-center py-16 sm:py-20">
          <p
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/80 animate-in fade-in duration-700"
            style={{ animationFillMode: "both" }}
          >
            {CLUB.tagline}
          </p>

          <h1
            className="mb-5 max-w-xl font-[family-name:var(--font-landing-display)] text-[clamp(2.75rem,8vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-zinc-50 animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationFillMode: "both" }}
          >
            CSEC ASTU
          </h1>

          <p
            className="max-w-xl text-lg font-medium leading-snug text-zinc-300 sm:text-xl animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            The student tech family at {CLUB.university} — building, competing, and teaching in public.
          </p>

          <p
            className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500 sm:text-base animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            From ETCPC on our campus to free bootcamps and Sunday Tech Talks — join an open event, or sign in if you are a member.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <Link
              href="/events/explore"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              Browse events
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!isLoading && (
              <Link
                href={isAuthenticated ? "/dashboard" : "#about"}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/40 px-5 py-3 text-sm font-medium text-zinc-200 backdrop-blur-sm transition-colors hover:border-zinc-500 hover:bg-zinc-900/70"
              >
                {isAuthenticated ? "Open dashboard" : "Meet the club"}
              </Link>
            )}
          </div>
        </div>

        <a
          href="#about"
          className="mx-auto inline-flex flex-col items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-400 animate-in fade-in duration-1000"
          style={{ animationDelay: "600ms", animationFillMode: "both" }}
        >
          Discover
          <span className="h-8 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </a>
      </div>
    </section>
  )
}
