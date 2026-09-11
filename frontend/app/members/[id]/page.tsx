"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import List02 from "@/components/kokonutui/list-02"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MemberAvatar, WarningPill, TierBadge, ScoreCapProgress } from "@/components/csec/ui-bits"
import { PageSkeletonWrapper, MemberDetailSkeleton } from "@/components/csec/skeletons"
import { IssueWarningDialog } from "@/components/csec/issue-warning-dialog"
import { SecurityCheckpoint } from "@/components/csec/security-checkpoint"
import { LaptopStickerDialog } from "@/components/csec/laptop-sticker-dialog"
import { useCurrentUser } from "@/components/user-context"
import { canIssueWarning, canManagePermissions, canModifyMemberRole, getAssignableRoles, isOfficer } from "@/lib/permissions"
import {
  ROLE_LABELS,
  PLATFORM_SETTINGS,
  type PointEvent,
  type Warning,
  type Member,
  type Role,
} from "@/lib/csec-data"
import {
  membersService,
  divisionsService,
  type MemberDetailOut,
  type DivisionOut,
  type PointEventOut,
} from "@/lib/api"
import {
  Send,
  Trophy,
  Building2,
  GraduationCap,
  CalendarDays,
  KeyRound,
  ShieldAlert,
  Award,
  Sparkles,
  AlertTriangle,
  Pencil,
  Loader2,
  Github,
  Phone,
  Mail,
  QrCode,
} from "lucide-react"

import { useMemberDetail, useMemberDetailEvents, useDivisions, useUpdateMemberRoleOrDeptMutation } from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>()
  const { currentUser, isAuthenticated, isLoading: authLoading } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: memberData, isLoading: memberLoading, isError: memberError } = useMemberDetail(params.id)
  const { data: evtsData, isLoading: evtsLoading } = useMemberDetailEvents(params.id)
  const { data: divisionsData, isLoading: divsLoading } = useDivisions()
  const updateMemberMutation = useUpdateMemberRoleOrDeptMutation()

  const divisions = divisionsData || []
  const isLoading = memberLoading || evtsLoading || divsLoading
  const hasError = memberError

  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [stickerDialogOpen, setStickerDialogOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role>("member")
  const [editDivisionId, setEditDivisionId] = useState<string>("")
  const [editSecondaryDivisionId, setEditSecondaryDivisionId] = useState<string>("none")
  const [editDept, setEditDept] = useState<string>("")
  const [savingEdit, setSavingEdit] = useState(false)

  // Initialize edit form when memberData loads
  useEffect(() => {
    if (memberData) {
      setEditRole(memberData.role)
      setEditDivisionId(memberData.division_id || "")
      setEditSecondaryDivisionId(memberData.secondary_division_id || "none")
      setEditDept(memberData.department || "")
    }
  }, [memberData])

  const events: PointEvent[] = useMemo(() => {
    return (evtsData?.items || []).map((e: PointEventOut) => ({
      id: e.id,
      memberId: e.member_id,
      taskTitle: e.task_title || e.reason,
      category: "division_session" as any,
      eventType: e.event_type as any,
      delta: e.points_delta,
      status: e.status as any,
      reason: e.reason,
      decisionReason: e.decision_reason,
      approverId: e.approved_by,
      academicYear: e.academic_year,
      createdAt: e.created_at,
    }))
  }, [evtsData])

  const primaryDivisionName = useMemo(() => {
    if (!memberData) return "General"
    if (memberData.division_name) return memberData.division_name
    const found = divisions.find((d) => d.id === memberData.division_id)
    return found ? found.name : "General"
  }, [memberData, divisions])

  const secondaryDivisionName = useMemo(() => {
    if (!memberData?.secondary_division_id) return null
    const found = divisions.find((d) => d.id === memberData.secondary_division_id)
    return found ? found.name : null
  }, [memberData, divisions])

  const adaptedMember = useMemo<Member | null>(() => {
    if (!memberData) return null
    return {
      id: memberData.id,
      name: memberData.full_name,
      email: memberData.email,
      avatar: memberData.profile_image_url ?? undefined,
      division: primaryDivisionName as any,
      department: memberData.department || "Engineering",
      joiningYear: memberData.joining_year || 2024,
      role: memberData.role,
      isActive: memberData.is_active,
      onboarded: true,
      permissions: [],
    }
  }, [memberData, primaryDivisionName])

  const warnings = useMemo(() => {
    return events
      .filter(
        (e) =>
          e.eventType === "normal_warning" ||
          e.eventType === "yellow_warning" ||
          e.eventType === "red_warning",
      )
      .map((e) => ({
        id: e.id,
        memberId: e.memberId,
        level: (e.eventType === "normal_warning"
          ? "normal"
          : e.eventType === "yellow_warning"
            ? "yellow"
            : "red") as "normal" | "yellow" | "red",
        reason: e.reason,
        issuedBy: e.approverName || e.approverId || "Officer",
        academicYear: e.academicYear,
        createdAt: e.createdAt,
      }))
  }, [events])

  const cycleScore = memberData?.scores?.cycle_score ?? memberData?.cycle_score ?? 50
  const careerScore = memberData?.scores?.career_score ?? memberData?.career_score ?? 50
  const badge = memberData?.scores?.badge ?? memberData?.badge ?? null
  const annualSummaries: any[] = []

  const isSelf = currentUser.id === memberData?.id
  const officerCanWarn = adaptedMember ? canIssueWarning(currentUser, adaptedMember) : false

  const redCount = warnings.filter((w) => w.level === "red").length
  const yellowCount = warnings.filter((w) => w.level === "yellow").length
  const normalCount = warnings.filter((w) => w.level === "normal").length
  const ladderStage = redCount > 0 ? 2 : yellowCount > 0 ? 1 : 0

  const canEditMember = adaptedMember ? canModifyMemberRole(currentUser, adaptedMember) : false
  const assignableRoles = getAssignableRoles(currentUser)

  function openEditDialog() {
    if (!memberData) return
    setEditRole(memberData.role)
    setEditDivisionId(memberData.division_id || (divisions[0]?.id ?? ""))
    setEditSecondaryDivisionId(memberData.secondary_division_id || "none")
    setEditDept(memberData.department || "")
    setEditDialogOpen(true)
  }

  async function handleSaveMemberAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!memberData) return
    if (!editDivisionId) {
      toast.error("Primary division is required.")
      return
    }
    if (editSecondaryDivisionId !== "none" && editSecondaryDivisionId === editDivisionId) {
      toast.error("Secondary division cannot be the same as primary division.")
      return
    }
    setSavingEdit(true)
    try {
      await updateMemberMutation.mutateAsync({
        id: memberData.id,
        data: {
          role: editRole,
          division_id: editDivisionId,
          secondary_division_id: editSecondaryDivisionId === "none" ? null : editSecondaryDivisionId,
          department: editDept.trim() || undefined,
        },
      })
      toast.success("Member details updated successfully")
      setEditDialogOpen(false)
    } catch (err: any) {
      toast.error("Failed to update member", { description: err.message })
    } finally {
      setSavingEdit(false)
    }
  }

  function handleWarningSuccess() {
    queryClient.invalidateQueries({ queryKey: ["member", params.id] })
    queryClient.invalidateQueries({ queryKey: ["member-events", params.id] })
  }

  // If auth is still resolving, show skeleton
  if (authLoading) {
    return (
      <Layout>
        <MemberDetailSkeleton />
      </Layout>
    )
  }

  // Physical Security Checkpoint Gatekeeper:
  // When an unauthenticated person scans a laptop QR sticker in the lab,
  // require them to authenticate as a member before showing identity data.
  if (!isAuthenticated) {
    return <SecurityCheckpoint memberId={params.id} />
  }

  if (isLoading && !adaptedMember) {
    return (
      <Layout>
        <MemberDetailSkeleton />
      </Layout>
    )
  }

  if (hasError || !memberData || !adaptedMember) {
    return notFound()
  }

  const member = adaptedMember

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-10">
        {/* Full-Page Profile Header */}
        <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 pt-2">
          {/* Big Prominent Photo */}
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <MemberAvatar
              name={member.name}
              imageUrl={memberData.profile_image_url}
              size={144}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
            />
            <span
              className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-950 ${
                member.isActive ? "bg-emerald-500" : "bg-rose-500"
              }`}
              title={member.isActive ? "Active Member" : "Inactive / Revoked"}
            />
          </div>

          {/* Member Info & Controls */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {member.name}
                  </h1>
                  <Badge variant={member.role === "member" ? "secondary" : "default"} className="font-medium">
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {badge && <TierBadge tier={badge} />}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {member.isActive ? "Active Member" : "Inactive"}
                  </span>
                </div>

                {/* Division and Department */}
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-600 dark:text-zinc-300 flex-wrap">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{primaryDivisionName}</span>
                  {secondaryDivisionName && (
                    <>
                      <span>·</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{secondaryDivisionName} (2nd)</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{member.department}</span>
                  <span>·</span>
                  <span>Class of {member.joiningYear}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStickerDialogOpen(true)}
                  className="h-9 text-xs"
                >
                  <QrCode className="mr-1.5 h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" /> Laptop Sticker QR
                </Button>

                <Link href="/profile/achievement">
                  <Button variant="outline" size="sm" className="h-9 text-xs">
                    <Award className="mr-1.5 h-3.5 w-3.5" /> Achievement Card
                  </Button>
                </Link>

                {canEditMember && (
                  <Button variant="outline" size="sm" onClick={openEditDialog} className="h-9 text-xs">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Role
                  </Button>
                )}

                {officerCanWarn && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setWarningDialogOpen(true)}
                    className="h-9 text-xs"
                  >
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Issue Warning
                  </Button>
                )}
              </div>
            </div>

            {/* Contact & Links */}
            <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap pt-1 text-xs text-zinc-600 dark:text-zinc-300">
              <a
                href={`mailto:${member.email}`}
                className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                <span>{member.email}</span>
              </a>

              {memberData.github_url && (
                <a
                  href={
                    memberData.github_url.startsWith("http")
                      ? memberData.github_url
                      : `https://github.com/${memberData.github_url.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <Github className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{memberData.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, "@")}</span>
                </a>
              )}

              {/* Officer / Self Contact Records */}
              {(isOfficer(currentUser) || isSelf) && (
                <>
                  {memberData.phone_number && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{memberData.phone_number}</span>
                    </span>
                  )}
                  {memberData.telegram_username && (
                    <span className="inline-flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-zinc-500" />
                      <span>@{memberData.telegram_username.replace(/^@+/, "")}</span>
                    </span>
                  )}
                  {memberData.student_id && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-zinc-500" />
                      <span>ID: {memberData.student_id}</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Stats Row */}
        <div className="border-y border-zinc-200 dark:border-zinc-800/80 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-300 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-zinc-500" /> Current Cycle
              </div>
              <div className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 mt-1">
                {cycleScore} pts
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-zinc-500" /> Career Score
              </div>
              <div className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 mt-1">
                {careerScore} pts
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-300 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-zinc-500" /> Primary Division
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5 truncate">
                {primaryDivisionName}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-300 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-zinc-500" /> Standing &amp; Buffer
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5">
                {warnings.length === 0 ? "Good Standing" : `${warnings.length} warning(s)`}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
            <ScoreCapProgress cycleScore={cycleScore} scoreCap={PLATFORM_SETTINGS.scoreCap} />
          </div>
        </div>

        {/* History & Activity Tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="bg-transparent border-b border-zinc-200 dark:border-zinc-800 rounded-none w-full justify-start p-0 h-auto gap-6">
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent pb-3 px-1 text-sm font-medium"
            >
              Point Ledger ({events.length})
            </TabsTrigger>
            <TabsTrigger
              value="warnings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent pb-3 px-1 text-sm font-medium"
            >
              Warnings ({warnings.length})
            </TabsTrigger>
            {member.permissions.length > 0 && (
              <TabsTrigger
                value="permissions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent pb-3 px-1 text-sm font-medium"
              >
                Delegations ({member.permissions.length})
              </TabsTrigger>
            )}
            <TabsTrigger
              value="annual"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent pb-3 px-1 text-sm font-medium"
            >
              Annual Snapshots ({annualSummaries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <List02 events={events} showMember={false} emptyLabel="No point events recorded for this member." />
          </TabsContent>

          <TabsContent value="warnings" className="mt-6 space-y-4">
            {/* Subtle accountability ladder indicator inside warnings tab */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`rounded-lg p-3 text-center text-xs font-medium border ${
                  ladderStage >= 1
                    ? "border-zinc-900/40 bg-zinc-100 text-zinc-900 dark:border-white/20 dark:bg-white/[0.08] dark:text-zinc-100 font-semibold"
                    : "border-zinc-200/80 bg-zinc-50/50 text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-900/20 dark:text-zinc-500"
                }`}
              >
                <div>Yellow Warning</div>
                <div className="text-[11px] opacity-70 mt-0.5">-25 pts</div>
              </div>

              <div
                className={`rounded-lg p-3 text-center text-xs font-medium border ${
                  ladderStage >= 2
                    ? "border-zinc-900/40 bg-zinc-100 text-zinc-900 dark:border-white/20 dark:bg-white/[0.08] dark:text-zinc-100 font-semibold"
                    : "border-zinc-200/80 bg-zinc-50/50 text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-900/20 dark:text-zinc-500"
                }`}
              >
                <div>Red Warning</div>
                <div className="text-[11px] opacity-70 mt-0.5">-50 pts</div>
              </div>

              <div
                className={`rounded-lg p-3 text-center text-xs font-medium border ${
                  !member.isActive
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "border-zinc-200/80 bg-zinc-50/50 text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-900/20 dark:text-zinc-500"
                }`}
              >
                <div>Layoff</div>
                <div className="text-[11px] opacity-70 mt-0.5">-100 pts</div>
              </div>
            </div>

            {warnings.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                No warnings on record. Member is in good standing.
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div>
                    <WarningPill level={w.level} />
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{w.reason}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Academic Year {w.academicYear}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-zinc-400">
                    {new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </TabsContent>

          {member.permissions.length > 0 && (
            <TabsContent value="permissions" className="mt-4 space-y-2">
              {member.permissions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                    <KeyRound className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.label}</span>
                      <Badge variant={p.isEnabled ? "default" : "secondary"} className="text-[10px]">
                        {p.isEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Granted by {p.grantedBy ?? "Officer"}
                      {p.expiresAt && ` · expires ${new Date(p.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          )}

          <TabsContent value="annual" className="mt-4 space-y-2">
            {annualSummaries.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                No past academic summaries recorded for this member.
              </div>
            ) : (
              annualSummaries.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Academic Year {s.academicYear}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Final Standing: #{s.finalRank} club-wide
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.badgesEarned && <TierBadge tier={s.badgesEarned} />}
                    <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {s.finalScore} pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Officer Issue Warning Dialog */}
      <IssueWarningDialog
        member={member}
        officer={currentUser}
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        onSuccess={handleWarningSuccess}
      />

      {/* Edit Member Admin Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">Edit Member Profile</DialogTitle>
            <DialogDescription>
              Update member role, department, and division memberships (capped at 2 divisions).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMemberAdmin} className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="member-name" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Member Name</Label>
              <Input id="member-name" value={member.name} disabled className="bg-zinc-100 dark:bg-zinc-900/60" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Platform Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Primary Division</Label>
                <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Secondary Division</Label>
                <Select value={editSecondaryDivisionId} onValueChange={setEditSecondaryDivisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (1 division only)</SelectItem>
                    {divisions
                      .filter((d) => d.id !== editDivisionId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-dept" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Department</Label>
              <Input
                id="edit-dept"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                placeholder="e.g. Software Engineering"
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
              >
                {savingEdit && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Laptop Sticker QR Dialog */}
      <LaptopStickerDialog
        open={stickerDialogOpen}
        onOpenChange={setStickerDialogOpen}
        member={{
          id: member.id,
          name: member.name,
          email: member.email,
          division: primaryDivisionName,
          secondaryDivision: secondaryDivisionName,
          joiningYear: member.joiningYear,
          role: member.role,
          profileImageUrl: memberData.profile_image_url,
        }}
      />
    </Layout>
  )
}
