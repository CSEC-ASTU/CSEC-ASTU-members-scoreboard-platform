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
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react"
import { authService } from "@/lib/api"

export default function ProfilePage() {
  const { currentUser, liveUser, refetchUser } = useCurrentUser()
  const [department, setDepartment] = useState(currentUser.department)
  const [connectingTelegram, setConnectingTelegram] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [telegramConnectData, setTelegramConnectData] = useState<{ token: string; link: string | null } | null>(null)
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

  const isTelegramConnected = Boolean(
    currentUser.telegramConnected || (liveUser && liveUser.telegram_connected)
  )
  const currentTelegramUsername =
    liveUser?.telegram_username ?? currentUser.telegramUsername

  async function handleConnectTelegram() {
    try {
      setConnectingTelegram(true)
      const data = await authService.connectTelegram()
      setTelegramConnectData(data)
      if (data.link) {
        window.open(data.link, "_blank", "noopener,noreferrer")
        toast.info("Opening Telegram bot...", {
          description: "Click Start in the chat to complete linking your account.",
        })
      } else {
        toast.success("Handshake token generated!", {
          description: "Use the link below or send /start to the bot.",
        })
      }
    } catch (err) {
      toast.error("Failed to initiate Telegram connection", {
        description: err instanceof Error ? err.message : "Please try again later.",
      })
    } finally {
      setConnectingTelegram(false)
    }
  }

  async function handleCheckTelegramStatus() {
    try {
      setCheckingStatus(true)
      await refetchUser()
      toast.success("Account status refreshed")
    } catch {
      // ignore
    } finally {
      setCheckingStatus(false)
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

          {/* Telegram Settings & Handshake */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Telegram Bot Notifications
                </h3>
                {isTelegramConnected ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]">
                    Not Linked
                  </Badge>
                )}
              </div>
              <Send className="h-4 w-4 text-blue-500" />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Connect your Telegram account to receive real-time notifications when your point claims are approved, warning notices are issued, and club-wide digests are published.
            </p>

            {isTelegramConnected ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-medium">Telegram Handshake Active</p>
                    <p className="text-emerald-700 dark:text-emerald-400/90 text-[11px]">
                      Your Chat ID is mapped to your CSEC account{currentTelegramUsername ? ` (@${currentTelegramUsername})` : ""}. Notifications are being delivered directly to your Telegram chat.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleConnectTelegram}
                    disabled={connectingTelegram}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {connectingTelegram ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Re-link Account
                  </Button>
                  <Button
                    onClick={handleCheckTelegramStatus}
                    disabled={checkingStatus}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    {checkingStatus ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Check Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleConnectTelegram}
                  disabled={connectingTelegram}
                  className="w-full sm:w-auto text-xs"
                >
                  {connectingTelegram ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Connect Telegram Account
                </Button>
              </div>
            )}

            {/* Handshake link / token banner */}
            {telegramConnectData && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center justify-between">
                  <span>Handshake Link (Valid for 10 min)</span>
                  <Button
                    onClick={handleCheckTelegramStatus}
                    disabled={checkingStatus}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2"
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${checkingStatus ? "animate-spin" : ""}`} /> Check Status
                  </Button>
                </div>
                {telegramConnectData.link ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Click below to open Telegram and send <code>/start</code>:
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={telegramConnectData.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Telegram Bot
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          if (telegramConnectData.link) {
                            navigator.clipboard.writeText(telegramConnectData.link)
                            toast.success("Link copied to clipboard")
                          }
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy Link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <p>
                      Bot username is not configured on the backend yet. You can manually send this command in your chat with the bot:
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <code className="bg-white px-2 py-1 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 font-mono text-xs">
                        /start {telegramConnectData.token}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(`/start ${telegramConnectData.token}`)
                          toast.success("Command copied to clipboard")
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                )}
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
