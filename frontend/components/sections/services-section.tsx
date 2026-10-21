"use client"

import Image from "next/image"
import { useReveal } from "@/hooks/use-reveal"

export function ServicesSection({ isActive }: { isActive?: boolean }) {
  const { ref, isVisible: revealVisible } = useReveal(0.15)
  const isVisible = isActive !== undefined ? isActive : revealVisible

  return (
    <section
      id="divisions"
      ref={ref}
      className="relative w-full border-t border-zinc-800/80 bg-[#0B0C0E] overflow-hidden px-6 py-24 md:px-12 lg:px-16"
    >
      {/* Authentic Student Collective Backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-35">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members and Technical Guild"
          fill
          className="object-cover object-[center_55%] grayscale-[20%]"
        />
        {/* Directional vignettes ensuring seamless transitions and high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C0E] via-[#0B0C0E]/45 to-[#0B0C0E]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/85 via-transparent to-[#0B0C0E]/85" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div
          className={`mb-14 max-w-3xl transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-2.5 text-xs font-mono font-medium text-violet-400">
            TECHNICAL GUILD &amp; ACADEMIC DIVISIONS
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
            Seven disciplines. One engineering collective.
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-zinc-400">
            From algorithmic problem-solving under extreme constraints to systems security and distributed ledgers,
            CSEC ASTU organizes members into focused technical tracks.
          </p>
        </div>

        {/* Editorial Division Index: Frosted Glass Cards letting the Student Photo shine through */}
        <div className="space-y-6">
          {/* Tier 1: Dual Flagship Anchors (2 Columns) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Competitive Programming */}
            <div
              className={`flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121316]/80 p-7 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#121316]/90 md:p-8 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
            >
              <div>
                <div className="text-[11px] font-mono font-medium text-violet-400 tracking-wider">
                  COLLEGIATE CONTEST DIVISION · ETCPC HOST
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-zinc-100">Competitive Programming</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  Algorithmic problem solving and data structures under strict time and memory limits.
                  We train ASTU&apos;s collegiate teams for regional and national ETCPC qualifiers through weekly contests and analysis.
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-800/80 pt-4 text-xs font-mono text-zinc-400">
                <span className="text-zinc-500">Core Focus:</span> Dynamic Programming · Graph Algorithms · C++20 · Codeforces
              </div>
            </div>

            {/* Development */}
            <div
              className={`flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121316]/80 p-7 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#121316]/90 md:p-8 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div>
                <div className="text-[11px] font-mono font-medium text-violet-400 tracking-wider">
                  PRODUCTION SYSTEMS &amp; PRODUCTS
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-zinc-100">Development</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  Architecting and shipping software for university operations, student platforms, and hackathons.
                  Emphasis on real product cycles, code reviews, API design, and peer mentoring.
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-800/80 pt-4 text-xs font-mono text-zinc-400">
                <span className="text-zinc-500">Core Focus:</span> Next.js · TypeScript · Go · PostgreSQL · Docker · APIs
              </div>
            </div>
          </div>

          {/* Tier 2: Specialized Research & Defense Labs (3 Columns) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Cyber Security */}
            <div
              className={`flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121316]/80 p-6 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#121316]/90 md:p-7 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "150ms" }}
            >
              <div>
                <div className="text-[11px] font-mono font-medium text-violet-400">
                  SECURITY RESEARCH &amp; LABS
                </div>
                <h3 className="mt-1.5 text-lg font-semibold text-zinc-100">Cyber Security</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-300">
                  Hands-on offensive and defensive labs: Active Directory attack paths, binary exploitation, network defense, and competitive CTF tournaments.
                </p>
              </div>
              <div className="mt-5 border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-500">
                CTF Drills · Active Directory · Reverse Engineering
              </div>
            </div>

            {/* Data Science & AI */}
            <div
              className={`flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121316]/80 p-6 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#121316]/90 md:p-7 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <div>
                <div className="text-[11px] font-mono font-medium text-violet-400">
                  APPLIED ML &amp; PIPELINES
                </div>
                <h3 className="mt-1.5 text-lg font-semibold text-zinc-100">Data Science &amp; AI</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-300">
                  Practical machine learning systems, vector embeddings, retrieval-augmented generation (RAG) architectures, and applied research.
                </p>
              </div>
              <div className="mt-5 border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-500">
                PyTorch · RAG Pipelines · NLP · Vector Databases
              </div>
            </div>

            {/* Blockchain Team */}
            <div
              className={`flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121316]/80 p-6 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#121316]/90 md:col-span-2 lg:col-span-1 md:p-7 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "250ms" }}
            >
              <div>
                <div className="text-[11px] font-mono font-medium text-violet-400">
                  DISTRIBUTED LEDGERS &amp; PROTOCOLS
                </div>
                <h3 className="mt-1.5 text-lg font-semibold text-zinc-100">Blockchain Team</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-300">
                  Smart contract development, decentralized protocol research, cryptographic consensus mechanisms, and multi-chain architecture.
                </p>
              </div>
              <div className="mt-5 border-t border-zinc-800/80 pt-3 text-[11px] font-mono text-zinc-500">
                Solidity · Rust · EVM · Cryptography
              </div>
            </div>
          </div>

          {/* Tier 3: Foundation & Campus Outreach (2 Columns) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Capacity Building */}
            <div
              className={`rounded-lg border border-zinc-800/80 bg-[#101114]/80 p-6 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#101114]/90 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <div className="text-[11px] font-mono font-medium text-violet-400">
                FRESHMAN ON-RAMP &amp; MENTORSHIP
              </div>
              <h3 className="mt-1.5 text-base font-semibold text-zinc-100">Capacity Building</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Zero-barrier semester bootcamps in Python, C++, and DSA fundamentals, helping students with no prior programming experience transition into active guild builders.
              </p>
              <div className="mt-3.5 text-[11px] font-mono text-zinc-500">
                Beginner Bootcamps · Peer Tutoring · DSA 101
              </div>
            </div>

            {/* Social Media & Media */}
            <div
              className={`rounded-lg border border-zinc-800/80 bg-[#101114]/80 p-6 backdrop-blur-md transition-all duration-500 hover:border-zinc-700 hover:bg-[#101114]/90 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "350ms" }}
            >
              <div className="text-[11px] font-mono font-medium text-violet-400">
                TECHNICAL JOURNALISM &amp; BROADCAST
              </div>
              <h3 className="mt-1.5 text-base font-semibold text-zinc-100">Social Media &amp; Media</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Documenting Sunday Tech Talks, recording contest victories, managing open calls, and broadcasting student engineering achievements across campus.
              </p>
              <div className="mt-3.5 text-[11px] font-mono text-zinc-500">
                Sunday Talks · Telegram @CSEC_ASTU · Campus Bulletins
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
