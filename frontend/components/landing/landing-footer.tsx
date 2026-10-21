"use client"

import Link from "next/link"
import Image from "next/image"
import { CLUB } from "@/lib/club-content"
import { motion, fadeUp, staggerContainer, defaultViewport } from "@/lib/motion"

export function LandingFooter() {
  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={staggerContainer}
      className="border-t border-zinc-800/60 bg-[#07080a] px-5 py-14 sm:px-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <motion.div variants={fadeUp} className="flex items-start gap-3">
            <Image
              src="/csec_astu.svg"
              alt=""
              width={28}
              height={20}
              className="mt-0.5 h-5 w-auto invert opacity-70"
            />
            <div>
              <p className="font-[family-name:var(--font-landing-display)] text-sm font-bold text-zinc-100">
                {CLUB.name}
              </p>
              <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-300">
                {CLUB.fullName} · {CLUB.university} · {CLUB.city}
              </p>
              <p className="mt-2.5 font-[family-name:var(--font-landing-mono)] text-[11px] font-medium tracking-[0.14em] text-zinc-400">
                {CLUB.tagline}
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-14">
            <motion.div variants={fadeUp}>
              <p className="mb-3 font-[family-name:var(--font-landing-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                Explore
              </p>
              <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
                <Link href="/#about" className="transition-colors hover:text-white">
                  About the club
                </Link>
                <Link href="/events/explore" className="transition-colors hover:text-white">
                  Public events
                </Link>
                <Link href="/login" className="transition-colors hover:text-white">
                  Member login
                </Link>
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <p className="mb-3 font-[family-name:var(--font-landing-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                Community
              </p>
              <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
                <a
                  href={CLUB.links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Telegram
                </a>
                <a
                  href={CLUB.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  LinkedIn
                </a>
                <a
                  href={CLUB.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  GitHub
                </a>
                <a
                  href={CLUB.links.email}
                  className="transition-colors hover:text-white"
                >
                  {CLUB.email}
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div variants={fadeUp} className="border-t border-zinc-800/80 pt-7">
          <p className="text-[11px] text-zinc-400">
            Built for members and campus guests · CSEC ASTU
          </p>
        </motion.div>
      </div>
    </motion.footer>
  )
}
