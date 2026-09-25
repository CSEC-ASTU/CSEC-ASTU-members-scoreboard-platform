import { Syne, DM_Sans } from "next/font/google"

export const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["500", "600", "700", "800"],
})

export const landingBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
  weight: ["400", "500", "600", "700"],
})

export const landingFontClassName = `${landingDisplay.variable} ${landingBody.variable} font-[family-name:var(--font-landing-body)]`
