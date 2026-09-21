import type { Metadata } from "next"
import { LandingHero } from "@/components/landing/landing-hero"
import { AboutSection } from "@/components/landing/about-section"
import { DivisionsSection } from "@/components/landing/divisions-section"
import { PulseSection } from "@/components/landing/pulse-section"
import { FeaturedEventsSection } from "@/components/landing/featured-events"
import { ConnectSection } from "@/components/landing/connect-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { fetchPublicEvents } from "@/lib/public-events"
import { landingFontClassName } from "@/lib/landing-fonts"
import { CLUB } from "@/lib/club-content"

export const metadata: Metadata = {
  title: "CSEC ASTU — Think · Create · Solve",
  description: `${CLUB.fullName} at ${CLUB.university}. Contests, bootcamps, Sunday Tech Talks, and open campus events — learn by doing.`,
  openGraph: {
    title: `${CLUB.name} — ${CLUB.tagline}`,
    description: `Student tech community at ${CLUB.university}: competitive programming, development, cybersecurity, data science, and more.`,
    siteName: CLUB.name,
  },
}

export default async function HomePage() {
  const data = await fetchPublicEvents({ filter: "upcoming", page_size: 4 })
  const featured = data.items.slice(0, 4)

  return (
    <div className={`dark ${landingFontClassName} min-h-screen bg-[#07080a] text-zinc-100 antialiased`}>
      <LandingHero />
      <AboutSection />
      <DivisionsSection />
      <PulseSection />
      <FeaturedEventsSection events={featured} total={data.total} />
      <ConnectSection />
      <LandingFooter />
    </div>
  )
}
