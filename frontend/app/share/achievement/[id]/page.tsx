import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Award, ShieldCheck, ArrowLeft, Globe } from "lucide-react"
import { PublicAchievementClient } from "./public-achievement-client"

interface Props {
  params: Promise<{ id: string }>
}

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000"

async function fetchPublicCard(id: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/members/${id}/achievement-card`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const card = await fetchPublicCard(id)

  if (!card) {
    return {
      title: "Member Achievement | CSEC-ASTU",
      description: "Official extracurricular achievement credential from CSEC-ASTU.",
    }
  }

  const title = `${card.full_name} · Official CSEC-ASTU Credential`
  const description = `${card.full_name} has achieved ${card.career_score} lifetime career points and holds the ${card.badges?.[0] || "Active"} tier in CSEC-ASTU.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "CSEC ASTU Accountability & Scoreboard Platform",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function PublicAchievementPage({ params }: Props) {
  const { id } = await params
  const card = await fetchPublicCard(id)

  if (!card) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-8">
      {/* Top Brand Bar */}
      <header className="w-full max-w-2xl flex items-center justify-between py-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/20">
            🏛️
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">CSEC ASTU</h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Verified Extracurricular Credential</p>
          </div>
        </div>
        <Link
          href="/login"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <span>Member Login</span>
        </Link>
      </header>

      {/* Main Card Viewport */}
      <div className="w-full max-w-xl my-auto py-8">
        <PublicAchievementClient card={card} memberId={id} />
      </div>

      {/* Footer Credential Verification */}
      <footer className="w-full max-w-2xl text-center py-6 border-t border-zinc-200/80 dark:border-white/[0.08] text-xs text-zinc-500 space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Cryptographically Verified against the CSEC Immutable Points Ledger</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Computer Science & Engineering Club · Adama Science and Technology University
        </p>
      </footer>
    </main>
  )
}
