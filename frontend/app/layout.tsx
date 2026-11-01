import { Inter } from "next/font/google"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"

const inter = Inter({ subsets: ["latin"], display: "swap", preload: true })

const SITE_URL = "https://csec-community.vercel.app"
const APP_NAME = "CSEC ASTU"
const APP_TITLE = "CSEC ASTU — Computer Science Club & Member Scoreboard"
const APP_DESCRIPTION =
  "Official member management, leaderboard, event discovery, and extracurricular achievement platform for the CSEC ASTU computer science club."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  referrer: "origin-when-cross-origin",
  title: {
    default: APP_TITLE,
    template: "%s · CSEC ASTU",
  },
  description: APP_DESCRIPTION,
  keywords: [
    "CSEC ASTU",
    "CSEC",
    "ASTU",
    "Computer Science Club",
    "Adama Science and Technology University",
    "Student Developers Ethiopia",
    "Tech Community Ethiopia",
    "Member Scoreboard",
    "Student Achievements",
    "Tech Events ASTU",
  ],
  authors: [{ name: "CSEC ASTU", url: SITE_URL }],
  creator: "CSEC ASTU",
  publisher: "CSEC ASTU",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "CSEC ASTU Community Platform",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CSEC ASTU — Computer Science Club & Member Scoreboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    site: "@csec_astu",
    creator: "@csec_astu",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background scroll-smooth">
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
