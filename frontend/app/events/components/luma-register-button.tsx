"use client"

import { useEffect } from "react"
import Script from "next/script"
import { ExternalLink, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"

const LUMA_CHECKOUT_SCRIPT = "https://embed.lu.ma/checkout-button.js"
const LUMA_SCRIPT_ID = "luma-checkout"

/** Extract evt-… or short slug from Luma URLs / raw IDs. */
export function extractLumaEventId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("evt-")) return trimmed

  const evtMatch = trimmed.match(/(evt-[a-zA-Z0-9_-]+)/i)
  if (evtMatch) return evtMatch[1]

  const shortMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:lu\.ma|luma\.com)\/(?:event\/)?([a-zA-Z0-9_-]+)\/?(?:\?.*)?$/i
  )
  if (shortMatch) return shortMatch[1]

  return trimmed
}

function resolveLumaHref(eventId: string | null, lumaUrl?: string | null): string {
  if (eventId?.startsWith("evt-")) {
    return `https://luma.com/event/${eventId}`
  }
  if (lumaUrl) return lumaUrl
  if (eventId) return `https://lu.ma/${eventId}`
  return "#"
}

interface LumaRegisterButtonProps {
  lumaEventId?: string | null
  lumaUrl?: string | null
  label?: string
  className?: string
  disabled?: boolean
}

/**
 * Luma embedded checkout CTA.
 * Uses the official checkout-button markup + script so Register opens Luma checkout
 * when an event is published on Luma.
 */
export function LumaRegisterButton({
  lumaEventId,
  lumaUrl,
  label = "Register for Event",
  className,
  disabled = false,
}: LumaRegisterButtonProps) {
  const resolvedId = extractLumaEventId(lumaEventId) || extractLumaEventId(lumaUrl)
  const href = resolveLumaHref(resolvedId, lumaUrl)
  const canCheckout = Boolean(resolvedId)

  useEffect(() => {
    if (disabled || !canCheckout) return
    // Re-scan after client navigation / dynamic cards mount.
    const w = window as Window & { lumaCheckout?: { refresh?: () => void } }
    w.lumaCheckout?.refresh?.()
  }, [canCheckout, disabled, resolvedId])

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 px-5 py-2.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700/40",
          className
        )}
      >
        <Ticket className="w-3.5 h-3.5" />
        {label}
      </button>
    )
  }

  // No Luma link at all — plain disabled-looking fallback
  if (!canCheckout && !lumaUrl) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 px-5 py-2.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700/40",
          className
        )}
      >
        <Ticket className="w-3.5 h-3.5" />
        Registration TBA
      </button>
    )
  }

  return (
    <>
      <Script id={LUMA_SCRIPT_ID} src={LUMA_CHECKOUT_SCRIPT} strategy="afterInteractive" />
      <a
        href={href}
        className={cn(
          "luma-checkout--button inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold shadow-md transition-all active:scale-[0.98] border border-primary/20 hover:shadow-primary/20",
          className
        )}
        data-luma-action="checkout"
        data-luma-event-id={resolvedId || undefined}
        {...(!resolvedId
          ? { target: "_blank" as const, rel: "noopener noreferrer" }
          : {})}
      >
        <Ticket className="w-3.5 h-3.5" />
        <span>{label}</span>
        {!resolvedId && <ExternalLink className="w-3 h-3 opacity-70" />}
      </a>
    </>
  )
}
