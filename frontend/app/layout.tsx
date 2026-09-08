import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/frontend/components/theme-provider"
import { UserProvider } from "@/frontend/components/user-context"
import { Toaster } from "@/frontend/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "CSEC ASTU — Member Management",
  description:
    "Member management and accountability platform for the CSEC ASTU computer science club: points, tasks, and approvals.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>{children}</UserProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

