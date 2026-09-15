"use client"

import Script from "next/script"
import { ExternalLink, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"

interface LumaRegisterButtonProps {
  lumaEventId?: string | null
  lumaUrl?: string | null
  label?: string
  className?: string
  disabled?: boolean
}

export function LumaRegisterButton({
  lumaEventId,
  lumaUrl,
  label = "Register for Event",
  className,
  disabled = false,
}: LumaRegisterButtonProps) {
  if (disabled) {
    return (
      <button
        disabled
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-800/60 px-5 py-2.5 text-xs font-semibold text-neutral-500 cursor-not-allowed border border-neutral-700/40",
          className
        )}
      >
        <Ticket className="w-3.5 h-3.5" />
        {label}
      </button>
    )
  }

  const resolvedUrl = lumaUrl || (lumaEventId ? `https://lu.ma/event/${lumaEventId}` : "#")

  return (
    <>
      <Script
        src="https://embed.lu.ma/checkout-button.js"
        strategy="lazyOnload"
      />
      <a
        href={resolvedUrl}
        className={cn(
          "luma-checkout--button inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold shadow-md transition-all active:scale-[0.98] border border-primary/20 hover:shadow-primary/20",
          className
        )}
        data-luma-action="checkout"
        data-luma-event-id={lumaEventId || undefined}
        target={!lumaEventId ? "_blank" : undefined}
        rel={!lumaEventId ? "noopener noreferrer" : undefined}
      >
        <Ticket className="w-3.5 h-3.5" />
        <span>{label}</span>
        {!lumaEventId && <ExternalLink className="w-3 h-3 opacity-70" />}
      </a>
    </>
  )
}
