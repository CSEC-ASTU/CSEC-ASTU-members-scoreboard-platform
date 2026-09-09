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
import { useCurrentUser } from "@/components/user-context"
import { canIssueWarning, canManagePermissions } from "@/lib/permissions"
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
  History,
  AlertTriangle,
  Pencil,
  Loader2,
} from "lucide-react"

import { useMemberDetail, useMemberDetailEvents, useDivisions, useUpdateMemberRoleOrDeptMutation } from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"

const ROLES: Role[] = ["member", "division_head", "vice_president", "president"]

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>()
  const { currentUser } = useCurrentUser()
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
      .filter((e) => e.eventType === "yellow_warning" || e.eventType === "red_warning")
      .map((e) => ({
        id: e.id,
        memberId: e.memberId,
        level: (e.eventType === "yellow_warning" ? "yellow" : "red") as "yellow" | "red",
        reason: e.reason,
        issuedBy: e.approverId || "Officer",
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
  const ladderStage = redCount > 0 ? 2 : yellowCount > 0 ? 1 : 0

  const canEditMember = canManagePermissions(currentUser)

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
      <div className="space-y-6">
        {/* Identity card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <MemberAvatar name={member.name} size={64} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{member.name}</h1>
                  <Badge variant={member.role === "member" ? "secondary" : "default"}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {badge && <TierBadge tier={badge} />}
                  {!member.isActive && (
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                      Inactive / Laid off
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.email}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{primaryDivisionName}</span>
                  {secondaryDivisionName && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{secondaryDivisionName} (2nd)</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{member.department}</span>
                  <span>•</span>
                  <span>Joined {member.joiningYear}</span>
                </div>
              </div>
            </div>

            {/* Officer Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/profile/achievement">
                <Button variant="outline" size="sm">
                  <Award className="mr-1.5 h-4 w-4" /> Achievement Card
                </Button>
              </Link>

              {canEditMember && (
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit Role &amp; Divisions
                </Button>
              )}

              {officerCanWarn && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setWarningDialogOpen(true)}
                >
                  <AlertTriangle className="mr-1.5 h-4 w-4" /> Issue Warning / Adjustment
                </Button>
              )}
            </div>
          </div>

          {/* Scores Overview */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-amber-500" /> Current Cycle
              </div>
              <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {cycleScore} pts
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-500" /> Career Score
              </div>
              <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {careerScore} pts
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-zinc-500" /> Divisions
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate" title={secondaryDivisionName ? `${primaryDivisionName} & ${secondaryDivisionName}` : primaryDivisionName}>
                {primaryDivisionName}
                {secondaryDivisionName ? ` + ${secondaryDivisionName}` : ""}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-zinc-500" /> Joining Year
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {member.joiningYear}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ScoreCapProgress cycleScore={cycleScore} scoreCap={PLATFORM_SETTINGS.scoreCap} />
          </div>
        </div>

        {/* Warning ladder */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-zinc-500" />
              Loss-Aversion &amp; Accountability Ladder
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Base Buffer: +{PLATFORM_SETTINGS.initialBuffer} pts
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div
              className={`rounded-lg p-3 text-center text-xs font-medium border ${
                ladderStage >= 1
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50"
              }`}
            >
              <div className="font-semibold">Yellow Warning</div>
              <div className="text-[11px] opacity-80 mt-0.5">-25 pts (Buffer halved)</div>
            </div>

            <div
              className={`rounded-lg p-3 text-center text-xs font-medium border ${
                ladderStage >= 2
                  ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/30 dark:text-red-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50"
              }`}
            >
              <div className="font-semibold">Red Warning</div>
              <div className="text-[11px] opacity-80 mt-0.5">-50 pts (Last chance)</div>
            </div>

            <div
              className={`rounded-lg p-3 text-center text-xs font-medium border ${
                !member.isActive
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50"
              }`}
            >
              <div className="font-semibold">Presidential Layoff</div>
              <div className="text-[11px] opacity-80 mt-0.5">-100 pts (Inactivated)</div>
            </div>
          </div>
        </div>

        {/* History tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList>
            <TabsTrigger value="activity">Point Ledger ({events.length})</TabsTrigger>
            <TabsTrigger value="warnings">Warnings ({warnings.length})</TabsTrigger>
            {member.permissions.length > 0 && (
              <TabsTrigger value="permissions">Delegations ({member.permissions.length})</TabsTrigger>
            )}
            <TabsTrigger value="annual">Annual Snapshots ({annualSummaries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <List02 events={events} showMember={false} emptyLabel="No point events recorded for this member." />
          </TabsContent>

          <TabsContent value="warnings" className="mt-4 space-y-2">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
            <DialogDescription>
              Update member role, department, and division memberships (capped at 2 divisions).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMemberAdmin} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="member-name" className="text-xs">Member Name</Label>
              <Input id="member-name" value={member.name} disabled className="bg-zinc-50 dark:bg-zinc-800/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Platform Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Division</Label>
                <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select primary" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Secondary Division</Label>
                <Select value={editSecondaryDivisionId} onValueChange={setEditSecondaryDivisionId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None (1 division only)</SelectItem>
                    {divisions
                      .filter((d) => d.id !== editDivisionId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-dept" className="text-xs">Department</Label>
              <Input
                id="edit-dept"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                placeholder="e.g. Software Engineering"
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingEdit}>
                {savingEdit && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
