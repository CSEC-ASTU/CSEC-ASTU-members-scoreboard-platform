"use client"

import Link from "next/link"
import Image from "next/image"
import { EventsSection } from "@/components/sections/events-section"
import { ServicesSection } from "@/components/sections/services-section"
import { ContactSection } from "@/components/sections/contact-section"
import { TimelineSection } from "@/components/sections/timeline-section"
import { AlumniSection } from "@/components/sections/alumni-section"
import { useCurrentUser } from "@/components/user-context"
import { useState, useEffect } from "react"
import { ArrowRight, ArrowDown } from "lucide-react"

export default function Home() {
  const { isAuthenticated } = useCurrentUser()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <main className="relative min-h-screen w-full bg-[#0B0C0E] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200">
      {/* Fixed Authentic Student Photo Backdrop (Live Preview) */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-55">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members"
          fill
          priority
          className="object-cover object-[center_60%] grayscale-[10%]"
        />
        {/* Directional Vignettes: Deep on left for text contrast, open and light on right for student visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/70 via-[#0B0C0E]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/95 via-[#0B0C0E]/40 via-45% to-transparent" />
      </div>

      {/* Editorial Architectural Header */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
          isScrolled
            ? "border-zinc-800/80 bg-[#0B0C0E]/95 backdrop-blur-md shadow-sm shadow-black/40 py-3.5 px-6 md:px-12 lg:px-16"
            : "border-zinc-800/60 md:border-transparent bg-[#0B0C0E] md:bg-transparent py-4 md:py-5 px-6 md:px-12 lg:px-16"
        }`}
      >
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
              <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">Dept. of Computer Science &amp; Engineering</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#about" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              About
            </a>
            <a href="#timeline" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Heritage
            </a>
            <a href="#divisions" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Divisions
            </a>
            <a href="#events" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Events
            </a>
            <a href="#alumni" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Alumni
            </a>
            <a href="#community" className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Contact
            </a>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            <Link
              href="/events/explore"
              className="hidden sm:inline-flex rounded border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Lu.ma Events
            </Link>

            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="rounded bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
            >
              {isAuthenticated ? "Dashboard" : "Member Login"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section: Typography on Left, Authentic Photo Shining Through on Right */}
      <section id="about" className="relative z-10 w-full px-6 pt-16 pb-20 md:px-12 md:pt-24 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-mono font-medium text-violet-400">
              <span>ASTU · DEPT OF COMPUTER SCIENCE &amp; ENGINEERING</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">STUDENT GUILD</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl md:text-6xl lg:text-[4rem] leading-[1.08]">
              Where Ethiopia’s collegiate builders engineer, compete, and lead.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              The premier student engineering community at Adama Science and Technology University.
              An active collective operating technical tracks across competitive programming, software systems, cybersecurity defense,
              and applied machine learning.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#events"
                className="inline-flex items-center gap-2 rounded bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
              >
                Campus Events &amp; Channels
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#divisions"
                className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Specialized Divisions
                <ArrowDown className="h-3.5 w-3.5 text-zinc-400" />
              </a>
            </div>

            {/* Fast Credentials Row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-zinc-400 border-t border-zinc-800/80 pt-5">
              <span>ETCPC Host Institution</span>
              <span className="text-zinc-700">·</span>
              <span>Seven Disciplines + Blockchain</span>
              <span className="text-zinc-700">·</span>
              <span>Rotational Division Tech Talks</span>
            </div>
          </div>

          {/* Grounded Collegiate Facts Strip */}
          <div className="mt-16 grid grid-cols-1 gap-6 border-t border-zinc-800/80 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-mono text-zinc-500">COMPETITIVE STAGE</div>
              <h4 className="mt-1 text-base font-semibold text-zinc-100">ETCPC Host Campus</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                ASTU hosts collegiate algorithm competitors from universities across Ethiopia for national qualification.
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-500">CURRICULUM</div>
              <h4 className="mt-1 text-base font-semibold text-zinc-100">Specialized Disciplines</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Six academic divisions plus our Blockchain team, spanning algorithms, systems, AI, and distributed ledgers.
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-500">CONTINUOUS LEARNING</div>
              <h4 className="mt-1 text-base font-semibold text-zinc-100">Sunday Tech Talks</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Iterative weekly technical discussion posts published by rotating club divisions, exploring systems, security, and algorithms.
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-500">COMMUNITY CULTURE</div>
              <h4 className="mt-1 text-base font-semibold text-zinc-100">Student-Led &amp; Peer Taught</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Upper-division builders mentor freshmen through free bootcamps, real production code reviews, and project showcases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Community Heritage Timeline */}
      <TimelineSection />

      {/* Section 2: Specialized Engineering Divisions */}
      <ServicesSection />

      {/* Section 3: Campus Events & Broadcast Channels */}
      <EventsSection />

      {/* Section 4: Honorable Alumni Roster */}
      <AlumniSection />

      {/* Section 5: Community & Partnerships */}
      <ContactSection />

      {/* Collegiate Footer */}
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
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#timeline" className="hover:text-white transition-colors">Heritage</a>
            <a href="#divisions" className="hover:text-white transition-colors">Divisions</a>
            <a href="#events" className="hover:text-white transition-colors">Events</a>
            <a href="#alumni" className="hover:text-white transition-colors">Alumni</a>
            <a href="#community" className="hover:text-white transition-colors">Contact</a>
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
    </main>
  )
}
