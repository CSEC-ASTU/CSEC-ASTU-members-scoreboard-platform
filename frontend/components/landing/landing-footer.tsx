import Link from "next/link"
import Image from "next/image"
import { CLUB } from "@/lib/club-content"

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-800/60 bg-[#07080a] px-5 py-12 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Image
              src="/csec_astu.svg"
              alt=""
              width={28}
              height={20}
              className="mt-0.5 h-5 w-auto invert opacity-70"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-300">{CLUB.name}</p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-600">
                {CLUB.fullName} · {CLUB.university} · {CLUB.city}
              </p>
              <p className="mt-2 text-[11px] font-medium tracking-wide text-zinc-500">
                {CLUB.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Explore
              </p>
              <div className="flex flex-col gap-2 text-xs text-zinc-500">
                <Link href="/#about" className="transition-colors hover:text-zinc-300">
                  About the club
                </Link>
                <Link href="/events/explore" className="transition-colors hover:text-zinc-300">
                  Public events
                </Link>
                <Link href="/login" className="transition-colors hover:text-zinc-300">
                  Member login
                </Link>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Community
              </p>
              <div className="flex flex-col gap-2 text-xs text-zinc-500">
                <a
                  href={CLUB.links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-zinc-300"
                >
                  Telegram
                </a>
                <a
                  href={CLUB.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-zinc-300"
                >
                  LinkedIn
                </a>
                <a
                  href={CLUB.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-zinc-300"
                >
                  GitHub
                </a>
                <a
                  href={CLUB.links.email}
                  className="transition-colors hover:text-zinc-300"
                >
                  {CLUB.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="border-t border-zinc-900 pt-6 text-[11px] text-zinc-700">
          Built for members and campus guests · CSEC ASTU
        </p>
      </div>
    </footer>
  )
}
