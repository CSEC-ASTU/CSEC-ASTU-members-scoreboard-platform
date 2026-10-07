import { Syne, DM_Sans } from "next/font/google"

/**
 * Landing typography. Keep font options minimal so `next/font` can resolve
 * Google Fonts reliably during Vercel/CI builds.
 */
export const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
  preload: true,
})

export const landingBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
  display: "swap",
  preload: true,
})

export const landingFontClassName = `${landingDisplay.variable} ${landingBody.variable} font-[family-name:var(--font-landing-body)]`
