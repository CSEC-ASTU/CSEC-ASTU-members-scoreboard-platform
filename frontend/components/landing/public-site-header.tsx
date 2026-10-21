"use client"

import Link from "next/link"
import Image from "next/image"
import { useCurrentUser } from "@/components/user-context"
import { cn } from "@/lib/utils"
import { motion, smoothSpring } from "@/lib/motion"

interface PublicSiteHeaderProps {
  className?: string
  active?: "home" | "events"
}

export function PublicSiteHeader({ className, active }: PublicSiteHeaderProps) {
  const { isAuthenticated } = useCurrentUser()

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...smoothSpring, delay: 0.1 }}
      className={cn(
        "relative z-20 flex w-full items-center justify-between gap-4",
        className
      )}
    >
      <Link href="/" className="group flex items-center gap-3">
        <Image
          src="/csec_astu.svg"
          alt="CSEC ASTU"
          width={40}
          height={28}
          className="h-7 w-auto invert opacity-95 transition-opacity group-hover:opacity-100"
          priority
        />
        <span className="font-[family-name:var(--font-landing-display)] text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
          CSEC ASTU
        </span>
      </Link>

      <nav className="flex items-center gap-0.5 sm:gap-1">
        {active === "home" && (
          <a
            href="#about"
            className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100 sm:inline-block sm:text-sm"
          >
            About
          </a>
        )}
        <Link
          href="/events/explore"
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
            active === "events"
              ? "text-emerald-300"
              : "text-zinc-400 hover:text-zinc-100"
          )}
        >
          Events
        </Link>
        {active === "home" && (
          <a
            href="#connect"
            className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100 md:inline-block md:text-sm"
          >
            Connect
          </a>
        )}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={smoothSpring}>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="ml-1 rounded-lg bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white sm:text-sm"
          >
            {isAuthenticated ? "Dashboard" : "Member Login"}
          </Link>
        </motion.div>
      </nav>
    </motion.header>
  )
}
