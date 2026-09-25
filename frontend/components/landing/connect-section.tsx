import { Github, Linkedin, Mail, Send } from "lucide-react"
import { CLUB } from "@/lib/club-content"

const CHANNELS = [
  {
    label: "Telegram",
    href: CLUB.links.telegram,
    detail: "@CSEC_ASTU — announcements, sessions, and live community chat",
    icon: Send,
  },
  {
    label: "LinkedIn",
    href: CLUB.links.linkedin,
    detail: "Sunday Tech Talks, bootcamp calls, and division updates",
    icon: Linkedin,
  },
  {
    label: "GitHub",
    href: CLUB.links.github,
    detail: "Open projects and hackathon work from CSEC-ASTU",
    icon: Github,
  },
  {
    label: "Email",
    href: CLUB.links.email,
    detail: CLUB.email,
    icon: Mail,
  },
] as const

export function ConnectSection() {
  return (
    <section
      id="connect"
      className="relative border-t border-zinc-800/60 bg-[#09090b] px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 max-w-xl sm:mb-12">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500/80">
            Stay close
          </p>
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Follow the work. Join the conversation.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Thousands of students already follow along on Telegram and LinkedIn.
            Pick a channel — or email the club directly.
          </p>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon
            return (
              <li key={channel.label} className="bg-[#09090b]">
                <a
                  href={channel.href}
                  target={channel.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={channel.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  className="group flex items-start gap-4 px-5 py-6 transition-colors hover:bg-zinc-900/80 sm:px-6 sm:py-7"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors group-hover:border-emerald-500/30 group-hover:text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-[family-name:var(--font-landing-display)] text-base font-semibold text-zinc-100 group-hover:text-emerald-300">
                      {channel.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500 sm:text-sm">
                      {channel.detail}
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
