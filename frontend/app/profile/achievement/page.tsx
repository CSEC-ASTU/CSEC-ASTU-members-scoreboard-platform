"use client"

import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { AchievementCard } from "@/frontend/components/csec/achievement-card"
import { useCurrentUser } from "@/frontend/components/user-context"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AchievementPage() {
  const { currentUser } = useCurrentUser()

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
          </Link>
          <PageHeader
            title="Achievement &amp; Standing Card"
            description="Official CSEC ASTU digital credentials and lifetime career score ready for LinkedIn and your resume."
          />
        </div>

        <AchievementCard member={currentUser} />
      </div>
    </Layout>
  )
}
