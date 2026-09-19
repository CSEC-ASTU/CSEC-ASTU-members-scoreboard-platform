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
import { useDivisions, usePlatformSettings, useMemberSummaries, useUpdateMeMutation, useMyPendingProfileChange, useCancelProfileChangeMutation } from "@/lib/hooks/use-queries"
import { ProfileSkeleton } from "@/components/csec/skeletons"
import type { AnnualSummaryOut, BadgeTier, DivisionOut } from "@/lib/api/types"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getMemberBadge,
  ROLE_LABELS,
  PLATFORM_SETTINGS,
} from "@/lib/csec-data"
import { LaptopStickerDialog } from "@/components/csec/laptop-sticker-dialog"
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
  Trash2,
  QrCode,
} from "lucide-react"
import { authService } from "@/lib/api"

export default function ProfilePage() {
  const { currentUser, liveUser, refetchUser } = useCurrentUser()
  const [fullName, setFullName] = useState(currentUser.name ?? "")
  const [department, setDepartment] = useState(currentUser.department ?? "")
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber ?? "")
  const [githubUrl, setGithubUrl] = useState(currentUser.githubUrl ?? "")
  const [changeReason, setChangeReason] = useState("")
  const [connectingTelegram, setConnectingTelegram] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [telegramConnectData, setTelegramConnectData] = useState<{ token: string; link: string | null } | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stickerDialogOpen, setStickerDialogOpen] = useState(false)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [photoDialogMode, setPhotoDialogMode] = useState<"upload" | "remove">("upload")
  const [photoReason, setPhotoReason] = useState("")
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)

  const { data: divisionsData, isLoading: divsLoading } = useDivisions()
  const { data: settingsData, isLoading: settingsLoading } = usePlatformSettings()
  const { data: summariesData, isLoading: summariesLoading } = useMemberSummaries(currentUser.id)
  const updateMeMutation = useUpdateMeMutation()
  const { data: pendingChange, refetch: refetchPending } = useMyPendingProfileChange(Boolean(currentUser.id))
  const cancelPendingMutation = useCancelProfileChangeMutation()

  const divisions = divisionsData || []
  const annualSummaries = summariesData?.items || []
  const scoreCap = settingsData?.score_cap ?? PLATFORM_SETTINGS.scoreCap
  const isLoading = divsLoading || settingsLoading || summariesLoading

  useEffect(() => {
    setFullName(currentUser.name ?? "")
    setDepartment(currentUser.department ?? "")
    setPhoneNumber(currentUser.phoneNumber ?? "")
    setGithubUrl(currentUser.githubUrl ?? "")
  }, [currentUser.name, currentUser.department, currentUser.phoneNumber, currentUser.githubUrl])

  const sensitiveNameChanged = fullName.trim() !== (currentUser.name ?? "").trim()
  const sensitivePhoneChanged = (phoneNumber.trim() || "") !== (currentUser.phoneNumber ?? "").trim()
  const needsApprovalReason = sensitiveNameChanged || sensitivePhoneChanged

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
  const badge = (currentUser.badge as any) ?? getMemberBadge(cycleScore, scoreCap)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (needsApprovalReason && changeReason.trim().length < 3) {
      toast.error("Please explain why you are changing your name or phone number")
      return
    }
    if (pendingChange && needsApprovalReason) {
      toast.error("You already have a pending profile change request. Cancel it first or wait for a decision.")
      return
    }
    try {
      setSaving(true)
      const result = await updateMeMutation.mutateAsync({
        department: department.trim() || undefined,
        github_url: githubUrl.trim() || undefined,
        ...(sensitiveNameChanged ? { full_name: fullName.trim() } : {}),
        ...(sensitivePhoneChanged ? { phone_number: phoneNumber.trim() || undefined } : {}),
        ...(needsApprovalReason ? { reason: changeReason.trim() } : {}),
      })
      await refetchUser()
      await refetchPending()
      if (result.pending_request) {
        toast.success("Submitted for approval", {
          description: result.message,
        })
        setChangeReason("")
      } else {
        toast.success(result.message || "Profile updated successfully")
      }
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  function handleAvatarFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (pendingChange) {
      toast.error("You already have a pending profile change request.")
      return
    }
    setPendingPhotoFile(file)
    setPhotoDialogMode("upload")
    setPhotoReason("")
    setPhotoDialogOpen(true)
  }

  function handleDeleteAvatar() {
    if (pendingChange) {
      toast.error("You already have a pending profile change request.")
      return
    }
    setPendingPhotoFile(null)
    setPhotoDialogMode("remove")
    setPhotoReason("")
    setPhotoDialogOpen(true)
  }

  async function submitPhotoRequest() {
    if (photoReason.trim().length < 3) {
      toast.error("Please provide a reason for this photo change")
      return
    }
    try {
      setAvatarUploading(true)
      const result =
        photoDialogMode === "upload" && pendingPhotoFile
          ? await membersService.uploadProfilePicture(pendingPhotoFile, photoReason.trim())
          : await membersService.requestRemoveProfilePicture(photoReason.trim())
      await refetchPending()
      toast.success("Submitted for approval", { description: result.message })
      setPhotoDialogOpen(false)
      setPendingPhotoFile(null)
      setPhotoReason("")
    } catch (err) {
      toast.error("Failed to submit photo request", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleCancelPending() {
    if (!pendingChange) return
    try {
      await cancelPendingMutation.mutateAsync(pendingChange.id)
      await refetchPending()
      toast.success("Pending profile request cancelled")
    } catch (err) {
      toast.error("Failed to cancel request", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
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
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStickerDialogOpen(true)}
              >
                <QrCode className="mr-1.5 h-4 w-4 text-zinc-600 dark:text-zinc-300" /> Laptop Sticker QR
              </Button>
              <Link href="/profile/achievement">
                <Button size="sm">
                  <Award className="mr-1.5 h-4 w-4" /> Shareable Achievement Card
                </Button>
              </Link>
            </div>
          }
        />

        {pendingChange && (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Profile change pending approval
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  Your live profile stays unchanged until the President or Vice President approves.
                  Reason: <span className="italic">{pendingChange.reason}</span>
                </p>
                {pendingChange.proposed_profile_image_url && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Proposed photo:</span>
                    <MemberAvatar
                      name={currentUser.name}
                      imageUrl={pendingChange.proposed_profile_image_url}
                      size={40}
                    />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelPending}
                disabled={cancelPendingMutation.isPending}
              >
                Cancel request
              </Button>
            </div>
          </div>
        )}

        {/* Profile Card & Avatar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <MemberAvatar name={currentUser.name} imageUrl={currentUser.profileImageUrl || currentUser.avatar} size={68} />
                <label
                  title="Upload profile photo"
                  className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 transition-transform active:scale-95"
                >
                  {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarFilePick}
                    disabled={avatarUploading || Boolean(pendingChange)}
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
                  <span>{currentUser.department || "General"}</span>
                  {currentUser.profileImageUrl && (
                    <>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={avatarUploading}
                        className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Remove photo
                      </button>
                    </>
                  )}
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
                <Label htmlFor="full-name" className="text-xs">
                  Full Name <span className="text-amber-600">(requires approval)</span>
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={Boolean(pendingChange)}
                />
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
                  <Label htmlFor="studentId" className="text-xs">Student ID</Label>
                  <Input
                    id="studentId"
                    value={currentUser.studentId || "Not assigned"}
                    disabled
                    className="bg-zinc-50 dark:bg-zinc-800/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="joiningYear" className="text-xs">Joining Year</Label>
                  <Input
                    id="joiningYear"
                    value={String(currentUser.joiningYear || 2024)}
                    disabled
                    className="bg-zinc-50 dark:bg-zinc-800/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept" className="text-xs">Department</Label>
                <Input
                  id="dept"
                  value={department}
                  placeholder="e.g. Software Engineering"
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs">
                    Phone Number <span className="text-amber-600">(requires approval)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    placeholder="+251 9..."
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={Boolean(pendingChange)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="githubUrl" className="text-xs">GitHub Profile URL</Label>
                  <Input
                    id="githubUrl"
                    value={githubUrl}
                    placeholder="https://github.com/username"
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
              </div>

              {needsApprovalReason && (
                <div className="space-y-1.5">
                  <Label htmlFor="changeReason" className="text-xs">
                    Reason for sensitive change <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="changeReason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Explain why you need to update your name or phone number…"
                    rows={3}
                    disabled={Boolean(pendingChange)}
                  />
                  <p className="text-[11px] text-zinc-500">
                    Name and phone changes are reviewed by Division Heads and must be approved by the
                    President or Vice President before going live.
                  </p>
                </div>
              )}

              <Button type="submit" size="sm" disabled={saving || (needsApprovalReason && Boolean(pendingChange))}>
                {saving
                  ? "Saving..."
                  : needsApprovalReason
                    ? "Submit for Approval"
                    : "Save Changes"}
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

      {/* Laptop Sticker QR Dialog */}
      <LaptopStickerDialog
        open={stickerDialogOpen}
        onOpenChange={setStickerDialogOpen}
        member={{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          division: primaryDivisionName,
          secondaryDivision: secondaryDivisionName,
          joiningYear: currentUser.joiningYear || 2024,
          role: currentUser.role,
          profileImageUrl: currentUser.profileImageUrl,
        }}
      />

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {photoDialogMode === "upload" ? "Request photo change" : "Request photo removal"}
            </DialogTitle>
            <DialogDescription>
              Profile photos require President or Vice President approval. Division Heads will be
              notified and can review the before/after images.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="photoReason" className="text-xs">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="photoReason"
              value={photoReason}
              onChange={(e) => setPhotoReason(e.target.value)}
              placeholder="Why are you changing your profile photo?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPhotoRequest} disabled={avatarUploading || photoReason.trim().length < 3}>
              {avatarUploading ? "Submitting…" : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
