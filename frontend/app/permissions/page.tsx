"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MemberAvatar } from "@/components/csec/ui-bits"
import { useCurrentUser } from "@/components/user-context"
import {
  canManagePermissions,
  canLayoff,
  canAssignRoles,
  getAssignableRoles,
  canModifyMemberRole,
} from "@/lib/permissions"
import { permissionsService } from "@/lib/api/services/permissions"
import { membersService } from "@/lib/api/services/members"
import { divisionsService } from "@/lib/api/services/divisions"
import {
  MemberPermissionOut,
  PermissionCatalogOut,
  MemberOut,
  DivisionOut,
} from "@/lib/api/types"
import {
  KeyRound,
  Plus,
  Trash2,
  Lock,
  ShieldAlert,
  Loader2,
  Crown,
  Shield,
  UserCheck,
  UserCog,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react"
import { PermissionsSkeleton } from "@/components/csec/skeletons"
import {
  useMemberPermissions,
  usePermissionCatalog,
  useMembers,
  useDivisions,
  useGrantPermissionMutation,
  useRevokePermissionMutation,
  useLayoffMemberMutation,
  useUpdateMemberRoleOrDeptMutation,
} from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"
import { ROLE_LABELS, type Role } from "@/lib/csec-data"

export default function PermissionsPage() {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const allowed = canManagePermissions(currentUser)
  const canAssign = canAssignRoles(currentUser)

  const { data: grantsData, isLoading: grantsLoading } = useMemberPermissions({ page_size: 100 })
  const { data: catalogData, isLoading: catalogLoading } = usePermissionCatalog()
  const { data: membersData, isLoading: membersLoading } = useMembers({ page_size: 100 })
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()

  const grantMutation = useGrantPermissionMutation()
  const revokeMutation = useRevokePermissionMutation()
  const layoffMutation = useLayoffMemberMutation()
  const updateRoleMutation = useUpdateMemberRoleOrDeptMutation()

  const grants = grantsData?.items || []
  const catalog = catalogData || []
  const members = membersData?.items || []
  const divisions = divisionsData || []
  const loading = grantsLoading || catalogLoading || membersLoading || divisionsLoading
  const isInitialLoading =
    (grantsLoading && !grantsData) ||
    (catalogLoading && !catalogData) ||
    (membersLoading && !membersData) ||
    (divisionsLoading && !divisionsData)

  // Grant dialog state
  const [open, setOpen] = useState(false)
  const [grantMode, setGrantMode] = useState<"permission" | "role">("permission")

  // Delegated permission form state
  const [targetMemberId, setTargetMemberId] = useState("")
  const [permissionKey, setPermissionKey] = useState("")
  const [scopeType, setScopeType] = useState<"club" | "division">("club")
  const [scopeDivisionId, setScopeDivisionId] = useState<string>("none")
  const [customScope, setCustomScope] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Base role assignment form state
  const [roleTargetMemberId, setRoleTargetMemberId] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role | "">("")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("none")
  const [roleSubmitting, setRoleSubmitting] = useState(false)

  // Layoff dialog state
  const [layoffTarget, setLayoffTarget] = useState<MemberOut | null>(null)
  const [layoffReason, setLayoffReason] = useState("")
  const [layingOff, setLayingOff] = useState(false)

  if (!allowed) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <Lock className="h-8 w-8 text-zinc-400" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Officers Only</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You do not hold governance authority to manage delegated duty permissions or club roles.
          </p>
        </div>
      </Layout>
    )
  }

  // Lookups
  const membersMap = new Map(members.map((m) => [m.id, m]))
  const divisionsMap = new Map(divisions.map((d) => [d.id, d.name]))
  const catalogMap = new Map(catalog.map((c) => [c.key, c]))

  const assignableRoleOptions = getAssignableRoles(currentUser)

  // Filter members eligible for role assignment
  const eligibleRoleMembers = members.filter((m) => {
    if (!m.is_active) return false
    if (currentUser.role === "vice_president") {
      return m.role !== "president" && m.role !== "vice_president"
    }
    return true
  })

  // Leadership groups for overview card
  const presidents = members.filter((m) => m.is_active && m.role === "president")
  const vicePresidents = members.filter((m) => m.is_active && m.role === "vice_president")
  const divisionHeads = members.filter((m) => m.is_active && m.role === "division_head")

  function openRoleAssignmentFor(member: MemberOut) {
    setGrantMode("role")
    setRoleTargetMemberId(member.id)
    setSelectedRole(member.role as Role)
    setSelectedDivisionId(member.division_id || "none")
    setOpen(true)
  }

  async function handleGrant() {
    if (!targetMemberId || !permissionKey) {
      toast.error("Please select a target member and permission key")
      return
    }

    try {
      setSubmitting(true)
      let scopeValue: string | null = null
      if (scopeType === "division" && scopeDivisionId !== "none") {
        scopeValue = scopeDivisionId
      } else if (customScope.trim()) {
        scopeValue = customScope.trim()
      }

      await grantMutation.mutateAsync({
        member_id: targetMemberId,
        permission_key: permissionKey,
        scope_value: scopeValue,
      })

      const targetName = membersMap.get(targetMemberId)?.full_name || "Member"
      toast.success("Permission granted successfully", {
        description: `Permission ${permissionKey} delegated to ${targetName}.`,
      })

      setOpen(false)
      setTargetMemberId("")
      setPermissionKey("")
      setScopeType("club")
      setScopeDivisionId("none")
      setCustomScope("")
    } catch (err) {
      toast.error("Failed to grant permission", {
        description: err instanceof Error ? err.message : "Ensure you have authority to delegate this scope.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignRole() {
    if (!roleTargetMemberId || !selectedRole) {
      toast.error("Please select a target member and role")
      return
    }

    if (selectedRole === "division_head" && (!selectedDivisionId || selectedDivisionId === "none")) {
      toast.error("Division Head role requires selecting a primary division")
      return
    }

    try {
      setRoleSubmitting(true)
      const targetMember = membersMap.get(roleTargetMemberId)
      const isPresidencyTransfer = selectedRole === "president" && targetMember?.id !== currentUser.id

      await updateRoleMutation.mutateAsync({
        id: roleTargetMemberId,
        data: {
          role: selectedRole as Role,
          division_id: selectedRole === "division_head" ? selectedDivisionId : undefined,
        },
      })

      if (isPresidencyTransfer) {
        toast.success("Presidency transferred successfully!", {
          description: `${targetMember?.full_name} is now President. Your account has stepped down to Vice President.`,
        })
      } else {
        toast.success("Role assigned successfully", {
          description: `${targetMember?.full_name} is now ${ROLE_LABELS[selectedRole as Role]}.`,
        })
      }

      setOpen(false)
      setRoleTargetMemberId("")
      setSelectedRole("")
      setSelectedDivisionId("none")
    } catch (err: any) {
      toast.error("Failed to assign role", {
        description: err instanceof Error ? err.message : "Unable to assign role.",
      })
    } finally {
      setRoleSubmitting(false)
    }
  }

  async function toggleGrantEnabled(id: string, isEnabled: boolean) {
    try {
      await permissionsService.togglePermission(id, isEnabled)
      queryClient.invalidateQueries({ queryKey: ["permissions"] })
      toast.success(`Permission ${isEnabled ? "enabled" : "disabled"}`)
    } catch (err) {
      toast.error("Failed to toggle permission", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  async function revoke(id: string) {
    try {
      await revokeMutation.mutateAsync(id)
      toast.success("Permission permanently revoked")
    } catch (err) {
      toast.error("Failed to revoke permission", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  async function executeLayoff() {
    if (!layoffTarget) return
    try {
      setLayingOff(true)
      const reason = layoffReason.trim() || "Executive layoff decision"
      await layoffMutation.mutateAsync({ id: layoffTarget.id, reason })

      toast.error(`${layoffTarget.full_name} has been laid off`, {
        description: "Member set to inactive status (-100 pts logged).",
      })
      setLayoffTarget(null)
      setLayoffReason("")
    } catch (err) {
      toast.error("Failed to execute layoff", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setLayingOff(false)
    }
  }

  // Filter delegable catalog items (exclude non-delegable ones like execute_layoff, assign_permission)
  const delegableCatalog = catalog.filter(
    (c) => c.key !== "execute_layoff" && c.key !== "assign_permission",
  )

  // Active members with role 'member' eligible for layoff
  const eligibleLayoffMembers = members.filter(
    (m) => m.role === "member" && m.is_active,
  )

  return (
    <Layout>
      {isInitialLoading ? (
        <PermissionsSkeleton />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Governance, Roles & Delegations"
            description="Manage club officer leadership, assign base roles, and delegate operational duties with granular authority."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {canAssign && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGrantMode("role")
                      setOpen(true)
                    }}
                    disabled={loading}
                    className="border-violet-300 dark:border-violet-700/60 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                  >
                    <UserCog className="mr-1.5 h-4 w-4" /> Assign Base Role
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setGrantMode("permission")
                    setOpen(true)
                  }}
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Grant Delegated Duty
                </Button>
              </div>
            }
          />

          {/* Leadership & Executive Overview */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                  Club Leadership & Officer Structure
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {presidents.length} President · {vicePresidents.length} Vice President · {divisionHeads.length} Division Heads
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {/* President Row */}
              {presidents.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-amber-50/20 dark:bg-amber-950/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <MemberAvatar name={p.full_name} size={40} />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                        <Crown className="h-2.5 w-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.full_name}</span>
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] gap-1">
                          <Crown className="h-3 w-3" /> President
                        </Badge>
                        {p.id === currentUser.id && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {p.email} · Executive Governance &amp; Administration
                      </div>
                    </div>
                  </div>

                  {currentUser.role === "president" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGrantMode("role")
                        setSelectedRole("president")
                        setOpen(true)
                      }}
                      className="text-xs border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 self-start sm:self-center"
                    >
                      <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Transfer Presidency
                    </Button>
                  )}
                </div>
              ))}

              {/* Vice Presidents */}
              {vicePresidents.map((vp) => (
                <div key={vp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <MemberAvatar name={vp.full_name} size={38} />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">
                        <Shield className="h-2.5 w-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{vp.full_name}</span>
                        <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] gap-1">
                          <Shield className="h-3 w-3" /> Vice President
                        </Badge>
                        {vp.id === currentUser.id && (
                          <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300 dark:border-indigo-700">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {vp.email} · Executive Officer
                      </div>
                    </div>
                  </div>

                  {canAssign && canModifyMemberRole(currentUser, vp) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRoleAssignmentFor(vp)}
                      className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 self-start sm:self-center"
                    >
                      <UserCog className="mr-1.5 h-3.5 w-3.5" /> Reassign Role
                    </Button>
                  )}
                </div>
              ))}

              {/* Division Heads */}
              {divisionHeads.map((head) => {
                const divisionName = head.division_id ? divisionsMap.get(head.division_id) : "Unassigned"
                return (
                  <div key={head.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={head.full_name} size={38} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{head.full_name}</span>
                          <Badge variant="outline" className="text-[10px] border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 gap-1">
                            <UserCheck className="h-3 w-3" /> Division Head
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {divisionName}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {head.email} · Leads {divisionName} Division
                        </div>
                      </div>
                    </div>

                    {canAssign && canModifyMemberRole(currentUser, head) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRoleAssignmentFor(head)}
                        className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 self-start sm:self-center"
                      >
                        <UserCog className="mr-1.5 h-3.5 w-3.5" /> Manage Role
                      </Button>
                    )}
                  </div>
                )
              })}

              {presidents.length === 0 && vicePresidents.length === 0 && divisionHeads.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No leadership officers found. Use &quot;Assign Base Role&quot; above to designate leaders.
                </div>
              )}
            </div>
          </div>

          {/* Active delegated permissions */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                  Active Delegated Duty Grants ({grants.length})
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Granular operational overrides
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
              </div>
            ) : grants.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No delegated duty permissions granted currently.
              </div>
            ) : (
              grants.map((g, i) => {
                const member = membersMap.get(g.member_id)
                const catalogItem = catalogMap.get(g.permission_key)
                const displayLabel = catalogItem?.description || g.permission_key
                const scopeText = g.scope_value
                  ? divisionsMap.get(g.scope_value)
                    ? `Division: ${divisionsMap.get(g.scope_value)}`
                    : `Scope: ${g.scope_value}`
                  : "Club-wide"

                return (
                  <div
                    key={g.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 ${
                      i !== 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={member?.full_name ?? "?"} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {displayLabel}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {member?.full_name ?? g.member_id.slice(0, 8)}
                          </Badge>
                          <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                            {g.permission_key}
                          </code>
                        </div>
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {scopeText}
                          {g.granted_at
                            ? ` · Granted ${new Date(g.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {g.is_enabled ? "Active" : "Disabled"}
                        </span>
                        <Switch
                          checked={g.is_enabled}
                          onCheckedChange={(checked) => toggleGrantEnabled(g.id, checked)}
                          aria-label={`Toggle ${g.permission_key}`}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Revoke permission">
                            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-rose-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke this permission permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member?.full_name ?? "This member"} will lose the &quot;{g.permission_key}&quot; operational duty immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revoke(g.id)}>Confirm Revocation</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Danger zone: Layoff (President Only) */}
          {canLayoff(currentUser) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="mb-1 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Presidential Layoff Execution
                </h2>
              </div>
              <p className="mb-4 text-xs text-rose-600/90 dark:text-rose-400/90">
                Solely executable by the President following officer deliberations. Inactivates member and writes a -100 pts ledger record.
              </p>
              {eligibleLayoffMembers.length === 0 ? (
                <p className="text-xs text-zinc-500">No active general members available for layoff.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eligibleLayoffMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setLayoffTarget(m)
                        setLayoffReason("")
                      }}
                      className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-rose-400 dark:border-rose-900/40 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <MemberAvatar name={m.full_name} size={20} />
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Layoff Confirmation Dialog */}
      <Dialog open={Boolean(layoffTarget)} onOpenChange={(open) => !open && setLayoffTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" /> Confirm Layoff of {layoffTarget?.full_name}
            </DialogTitle>
            <DialogDescription>
              {layoffTarget?.full_name} will be marked inactive and assigned a -100 pts ledger record. This action is final.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="layoff-reason">Reason for Layoff</Label>
            <Input
              id="layoff-reason"
              placeholder="e.g. Unresponsive across consecutive milestone cycles"
              value={layoffReason}
              onChange={(e) => setLayoffReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLayoffTarget(null)} disabled={layingOff}>
              Cancel
            </Button>
            <Button
              onClick={executeLayoff}
              disabled={layingOff}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {layingOff ? "Executing..." : "Confirm Layoff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combined Grant & Role Assignment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {grantMode === "role" ? (
                <>
                  <UserCog className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  Assign Official Base Role
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  Grant Delegated Duty Permission
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {grantMode === "role"
                ? "Assign official club base roles (Division Head, Vice President, or transfer Presidency)."
                : "Assign a granular operational duty capability to a member without altering their base role."}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher if user has role assignment authority */}
          {canAssign && (
            <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setGrantMode("permission")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  grantMode === "permission"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Delegated Duty Permission
              </button>
              <button
                type="button"
                onClick={() => setGrantMode("role")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  grantMode === "role"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Official Base Role Assignment
              </button>
            </div>
          )}

          {grantMode === "permission" ? (
            /* Delegated Permission Mode */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Target Member</Label>
                <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Permission Key</Label>
                <Select value={permissionKey} onValueChange={setPermissionKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a permission" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {delegableCatalog.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.key} - {c.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scope Type</Label>
                <Select
                  value={scopeType}
                  onValueChange={(val: "club" | "division") => setScopeType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="club">Club-wide</SelectItem>
                    <SelectItem value="division">Division Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scopeType === "division" && (
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select value={scopeDivisionId} onValueChange={setScopeDivisionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose a division...</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            /* Base Role Assignment Mode */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Target Member</Label>
                <Select
                  value={roleTargetMemberId}
                  onValueChange={(val) => {
                    setRoleTargetMemberId(val)
                    const target = membersMap.get(val)
                    if (target?.division_id) {
                      setSelectedDivisionId(target.division_id)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target member..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {eligibleRoleMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} ({ROLE_LABELS[m.role as Role] || m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign New Base Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val: Role) => setSelectedRole(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="py-0.5">
                          <div className="font-medium text-xs">{opt.label}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{opt.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Division selector when assigning division_head */}
              {selectedRole === "division_head" && (
                <div className="space-y-2">
                  <Label>
                    Primary Division <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary division..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Choose division...
                      </SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Division Heads manage submissions, approve scores, and organize sessions for their division.
                  </p>
                </div>
              )}

              {/* Presidential succession banner */}
              {selectedRole === "president" && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3.5 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Leadership Succession (Presidency Transfer)
                      </p>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Assigning this role will designate{" "}
                        <strong>{membersMap.get(roleTargetMemberId)?.full_name || "the selected member"}</strong> as the new President of CSEC-ASTU.
                        Your account will smoothly transition to <strong>Vice President</strong>.
                        This takes effect immediately without needing database reseeding!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting || roleSubmitting}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            {grantMode === "permission" ? (
              <Button
                onClick={handleGrant}
                disabled={submitting || !targetMemberId || !permissionKey}
                className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
              >
                {submitting ? "Granting..." : "Grant Permission"}
              </Button>
            ) : (
              <Button
                onClick={handleAssignRole}
                disabled={
                  roleSubmitting ||
                  !roleTargetMemberId ||
                  !selectedRole ||
                  (selectedRole === "division_head" && (!selectedDivisionId || selectedDivisionId === "none"))
                }
                className={
                  selectedRole === "president"
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
                }
              >
                {roleSubmitting ? (
                  "Updating..."
                ) : selectedRole === "president" ? (
                  <>
                    <Crown className="mr-1.5 h-4 w-4" /> Transfer Presidency
                  </>
                ) : (
                  "Assign Role"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
