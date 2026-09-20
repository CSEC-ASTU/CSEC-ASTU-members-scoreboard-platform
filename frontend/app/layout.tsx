import { Inter } from "next/font/google"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { PwaSyncProvider } from "@/components/providers/pwa-sync-provider"
import { UserProvider } from "@/components/user-context"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

const APP_NAME = "CSEC ASTU"
const APP_TITLE = "CSEC ASTU — Member Management"
const APP_DESCRIPTION =
  "Member management and accountability platform for the CSEC ASTU computer science club: points, tasks, and approvals."

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: "%s · CSEC ASTU",
  },
  description: APP_DESCRIPTION,
  generator: "v0.app",
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
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <UserProvider>
              <PwaSyncProvider>
                {children}
              </PwaSyncProvider>
            </UserProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
