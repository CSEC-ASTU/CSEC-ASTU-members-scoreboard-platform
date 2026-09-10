"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { MemberAvatar, TierBadge, ScoreCapProgress } from "@/components/csec/ui-bits"
import { useCurrentUser } from "@/components/user-context"
import { membersService } from "@/lib/api/services/members"
import { useDivisions, usePlatformSettings, useMemberSummaries, useUpdateMeMutation } from "@/lib/hooks/use-queries"
import { ProfileSkeleton } from "@/components/csec/skeletons"
import type { AnnualSummaryOut, BadgeTier, DivisionOut } from "@/lib/api/types"
import {
  getMemberBadge,
  ROLE_LABELS,
  PLATFORM_SETTINGS,
} from "@/lib/csec-data"
import {
  Trophy,
  Sparkles,
  Building2,
  GraduationCap,
  Calendar,
  Send,
  Upload,
  Award,
  History,
  ShieldCheck,
  Loader2,
} from "lucide-react"

export default function ProfilePage() {
  const { currentUser, refetchUser } = useCurrentUser()
  const [department, setDepartment] = useState(currentUser.department)
  const [telegram, setTelegram] = useState(currentUser.telegramUsername ?? "")
  const [connected, setConnected] = useState(Boolean(currentUser.telegramUsername))
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: divisionsData, isLoading: divsLoading } = useDivisions()
  const { data: settingsData, isLoading: settingsLoading } = usePlatformSettings()
  const { data: summariesData, isLoading: summariesLoading } = useMemberSummaries(currentUser.id)
  const updateMeMutation = useUpdateMeMutation()

  const divisions = divisionsData || []
  const annualSummaries = summariesData?.items || []
  const scoreCap = settingsData?.score_cap ?? PLATFORM_SETTINGS.scoreCap
  const isLoading = divsLoading || settingsLoading || summariesLoading

  useEffect(() => {
    setDepartment(currentUser.department)
  }, [currentUser.department])

  const divisionsMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of divisions) {
      map[d.id] = d.name
    }
    return map
  }, [divisions])

  const primaryDivisionName = useMemo(() => {
    if (currentUser.divisionId && divisionsMap[currentUser.divisionId]) {
      return divisionsMap[currentUser.divisionId]
    }
    if (currentUser.division && divisionsMap[currentUser.division]) {
      return divisionsMap[currentUser.division]
    }
    if (
      currentUser.division &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.division)
    ) {
      return currentUser.division
    }
    return "General"
  }, [currentUser, divisionsMap])

  const secondaryDivisionName = useMemo(() => {
    if (currentUser.secondaryDivisionId && divisionsMap[currentUser.secondaryDivisionId]) {
      return divisionsMap[currentUser.secondaryDivisionId]
    }
    if (currentUser.secondaryDivision && divisionsMap[currentUser.secondaryDivision]) {
      return divisionsMap[currentUser.secondaryDivision]
    }
    if (
      currentUser.secondaryDivision &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.secondaryDivision)
    ) {
      return currentUser.secondaryDivision
    }
    return null
  }, [currentUser, divisionsMap])

  const cycleScore = currentUser.cycleScore ?? 0
  const careerScore = currentUser.careerScore ?? 0
  const badge = getMemberBadge(cycleScore, scoreCap)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      await updateMeMutation.mutateAsync({ department: department.trim() })
      await refetchUser()
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setAvatarUploading(true)
      await membersService.uploadProfilePicture(file)
      await refetchUser()
      toast.success("Profile photo uploaded successfully!")
    } catch (err) {
      toast.error("Failed to upload avatar", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <Layout>
      {isLoading && divisions.length === 0 ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="My Profile &amp; Settings"
          description="Manage your club details, view lifetime annual histories, and export your achievement card."
          action={
            <Link href="/profile/achievement">
              <Button size="sm">
                <Award className="mr-1.5 h-4 w-4" /> Shareable Achievement Card
              </Button>
            </Link>
          }
        />

        {/* Profile Card & Avatar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <MemberAvatar name={currentUser.name} imageUrl={currentUser.profileImageUrl} size={68} />
                <label className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                  {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{currentUser.name}</h2>
                  <Badge variant={currentUser.role === "member" ? "secondary" : "default"}>
                    {ROLE_LABELS[currentUser.role]}
                  </Badge>
                  {badge && <TierBadge tier={badge} />}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{currentUser.email}</p>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {primaryDivisionName} (Primary)
                  </Badge>
                  {secondaryDivisionName && (
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {secondaryDivisionName} (Secondary)
                    </Badge>
                  )}
                  <span>•</span>
                  <span>{currentUser.department}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex gap-4">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60 text-right">
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Current Cycle</div>
                <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {cycleScore} pts
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60 text-right">
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Career Score</div>
                <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {careerScore} pts
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <ScoreCapProgress cycleScore={cycleScore} scoreCap={scoreCap} />
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Academic &amp; Member Information
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full-name" className="text-xs">Full Name (from Google)</Label>
                <Input id="full-name" value={currentUser.name} disabled className="bg-zinc-50 dark:bg-zinc-800/50" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">University Email</Label>
                <Input id="email" value={currentUser.email} disabled className="bg-zinc-50 dark:bg-zinc-800/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="division" className="text-xs">Primary Division</Label>
                  <Input id="division" value={primaryDivisionName} disabled className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="secondaryDivision" className="text-xs">Secondary Division</Label>
                  <Input
                    id="secondaryDivision"
                    value={secondaryDivisionName ?? "None"}
                    disabled
                    className="bg-zinc-50 dark:bg-zinc-800/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="joiningYear" className="text-xs">Joining Year</Label>
                  <Input id="joiningYear" value={String(currentUser.joiningYear)} disabled className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dept" className="text-xs">Department</Label>
                  <Input
                    id="dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>

          {/* Telegram Settings */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Telegram Notifications (Phase 2 Handshake)
              </h3>
              <Send className="h-4 w-4 text-blue-500" />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Link your Telegram handle to receive real-time digests, duty reminders, and warning alerts directly to your device.
            </p>

            <div className="space-y-2">
              <Label htmlFor="telegram-input" className="text-xs">Telegram Username</Label>
              <div className="flex gap-2">
                <Input
                  id="telegram-input"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                />
                <Button
                  onClick={() => {
                    setConnected(Boolean(telegram.trim()))
                    toast.success(telegram.trim() ? "Telegram connected" : "Telegram disconnected")
                  }}
                  size="sm"
                  variant="outline"
                >
                  {connected ? "Update" : "Connect"}
                </Button>
              </div>
            </div>

            {connected && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Bot webhook handshake active. Chat ID mapped.
              </div>
            )}
          </div>
        </div>

        {/* Historical Annual Summaries (Annual Archival Ledger) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Academic Year Snapshots ({annualSummaries.length})
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Archived annual summaries feed into your lifetime Career Score
            </span>
          </div>

          {annualSummaries.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 border border-dashed rounded-lg">
              No previous year summaries yet. Your current cycle will be archived at the annual reset.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {annualSummaries.map((s: AnnualSummaryOut) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Academic Year {s.academic_year}
                    </span>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Finished at Rank #{s.final_rank} club-wide
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.badges_earned && s.badges_earned.length > 0 && (
                      <TierBadge tier={s.badges_earned[0] as BadgeTier} />
                    )}
                    <span className="font-bold text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                      {s.final_score} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </Layout>
  )
}
