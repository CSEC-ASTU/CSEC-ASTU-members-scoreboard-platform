"use client"

import { useState, useEffect, useCallback } from "react"
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
import { canManagePermissions, canLayoff } from "@/lib/permissions"
import { permissionsService } from "@/lib/api/services/permissions"
import { membersService } from "@/lib/api/services/members"
import { divisionsService } from "@/lib/api/services/divisions"
import {
  MemberPermissionOut,
  PermissionCatalogOut,
  MemberOut,
  DivisionOut,
} from "@/lib/api/types"
import { KeyRound, Plus, Trash2, Lock, ShieldAlert, Loader2 } from "lucide-react"
import { PermissionsSkeleton } from "@/components/csec/skeletons"
import {
  useMemberPermissions,
  usePermissionCatalog,
  useMembers,
  useDivisions,
  useGrantPermissionMutation,
  useRevokePermissionMutation,
  useLayoffMemberMutation,
} from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"

export default function PermissionsPage() {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const allowed = canManagePermissions(currentUser)

  const { data: grantsData, isLoading: grantsLoading } = useMemberPermissions({ page_size: 100 })
  const { data: catalogData, isLoading: catalogLoading } = usePermissionCatalog()
  const { data: membersData, isLoading: membersLoading } = useMembers({ page_size: 100 })
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions()

  const grantMutation = useGrantPermissionMutation()
  const revokeMutation = useRevokePermissionMutation()
  const layoffMutation = useLayoffMemberMutation()

  const grants = grantsData?.items || []
  const catalog = catalogData || []
  const members = membersData?.items || []
  const divisions = divisionsData || []
  const loading = grantsLoading || catalogLoading || membersLoading || divisionsLoading

  // Grant dialog state
  const [open, setOpen] = useState(false)
  const [targetMemberId, setTargetMemberId] = useState("")
  const [permissionKey, setPermissionKey] = useState("")
  const [scopeType, setScopeType] = useState<"club" | "division">("club")
  const [scopeDivisionId, setScopeDivisionId] = useState<string>("none")
  const [customScope, setCustomScope] = useState("")
  const [submitting, setSubmitting] = useState(false)

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
            You do not hold governance authority to manage delegated duty permissions.
          </p>
        </div>
      </Layout>
    )
  }

  // Member lookup helper
  const membersMap = new Map(members.map((m) => [m.id, m]))
  const divisionsMap = new Map(divisions.map((d) => [d.id, d.name]))
  const catalogMap = new Map(catalog.map((c) => [c.key, c]))

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
      {loading && grants.length === 0 ? (
        <PermissionsSkeleton />
      ) : (
        <div className="space-y-6">
        <PageHeader
          title="Delegated Permissions & Roles"
          description="Delegate approval and operational duties on top of base roles. Easily toggle grants on/off."
          action={
            <Button onClick={() => setOpen(true)} disabled={loading}>
              <Plus className="mr-1.5 h-4 w-4" /> Grant Delegated Duty
            </Button>
          }
        />

        {/* Active delegated permissions */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Active Delegation Grants ({grants.length})
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
            </div>
          ) : grants.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No delegated permissions granted currently.
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 ${
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

      {/* Grant Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">Grant Delegated Duty Permission</DialogTitle>
            <DialogDescription>
              Assign a granular capability to a member without altering their base role.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting} className="text-zinc-400 hover:text-zinc-200">
              Cancel
            </Button>
            <Button
              onClick={handleGrant}
              disabled={submitting || !targetMemberId || !permissionKey}
              className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
            >
              {submitting ? "Granting..." : "Grant Permission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

