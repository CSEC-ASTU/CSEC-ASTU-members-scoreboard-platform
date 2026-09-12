"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { AchievementCard } from "@/components/csec/achievement-card"
import { useCurrentUser } from "@/components/user-context"
import { useMemberDetail, useDivisions } from "@/lib/hooks/use-queries"
import { type Member } from "@/lib/csec-data"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function AchievementContent() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get("id") || searchParams.get("memberId")
  const { currentUser } = useCurrentUser()

  const isViewingOther = Boolean(targetId && targetId !== currentUser?.id)

  const {
    data: memberData,
    isLoading: memberLoading,
    isError: memberError,
  } = useMemberDetail(isViewingOther ? (targetId as string) : undefined)

  const { data: divisions = [] } = useDivisions()

  const resolvedDivision = useMemo(() => {
    if (!memberData) return "General"
    if (memberData.division_name) return memberData.division_name
    const found = divisions.find((d) => d.id === memberData.division_id)
    return found ? found.name : "General"
  }, [memberData, divisions])

  const targetMember = useMemo<Member | null>(() => {
    if (!memberData) return null
    return {
      id: memberData.id,
      name: memberData.full_name,
      email: memberData.email,
      avatar: memberData.profile_image_url ?? undefined,
      profileImageUrl: memberData.profile_image_url ?? undefined,
      division: resolvedDivision as any,
      department: memberData.department || "Engineering",
      joiningYear: memberData.joining_year || 2024,
      role: memberData.role,
      isActive: memberData.is_active,
      onboarded: true,
      permissions: [],
      careerScore: memberData.scores?.career_score ?? memberData.career_score ?? 0,
      cycleScore: memberData.scores?.cycle_score ?? memberData.cycle_score ?? 0,
      badge: memberData.scores?.badge ?? memberData.badge ?? null,
    } as Member
  }, [memberData, resolvedDivision])

  if (isViewingOther && memberLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading achievement card...
        </div>
        <div className="h-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse bg-zinc-100 dark:bg-zinc-900/50" />
      </div>
    )
  }

  if (isViewingOther && (memberError || !targetMember)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Members
          </Link>
          <PageHeader
            title="Member Not Found"
            description="Unable to load this achievement card. The member may not exist or you might not have permission to view their profile."
          />
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Could not retrieve achievement data for ID: <span className="font-mono text-xs">{targetId}</span>
          </p>
          <Link href="/members">
            <Button variant="outline" size="sm">
              Return to Member Directory
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const memberToRender = isViewingOther ? targetMember! : currentUser
  const backHref = isViewingOther ? `/members/${targetId}` : "/profile"
  const backLabel = isViewingOther ? `Back to ${memberToRender.name}'s Profile` : "Back to Profile"
  const pageTitle = isViewingOther
    ? `${memberToRender.name}'s Achievement Card`
    : "Achievement & Standing Card"
  const pageDesc = isViewingOther
    ? `Official CSEC ASTU digital credentials and lifetime career score for ${memberToRender.name}.`
    : "Official CSEC ASTU digital credentials and lifetime career score ready for LinkedIn and your resume."

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <PageHeader
          title={pageTitle}
          description={pageDesc}
        />
      </div>

      <AchievementCard member={memberToRender} />
    </div>
  )
}

export default function AchievementPage() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <AchievementContent />
      </Suspense>
    </Layout>
  )
}
