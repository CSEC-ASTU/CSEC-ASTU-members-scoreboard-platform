"use client"

import { useState } from "react"
import { toast } from "sonner"
import Layout from "@/frontend/components/kokonutui/layout"
import { PageHeader } from "@/frontend/components/csec/page-header"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Switch } from "@/frontend/components/ui/switch"
import { Badge } from "@/frontend/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog"
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
} from "@/frontend/components/ui/alert-dialog"
import { MemberAvatar } from "@/frontend/components/csec/ui-bits"
import { useCurrentUser } from "@/frontend/components/user-context"
import { canManagePermissions, canLayoff } from "@/lib/permissions"
import {
  MEMBERS,
  DIVISIONS,
  TASK_CATEGORY_LABELS,
  getMember,
  type Permission,
  type TaskCategory,
  type Division,
} from "@/lib/csec-data"
import { KeyRound, Plus, Trash2, Lock, ShieldAlert, CheckCircle2 } from "lucide-react"

interface GrantRow extends Permission {
  memberId: string
}

const CATEGORIES = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]

export default function PermissionsPage() {
  const { currentUser } = useCurrentUser()

  const [grants, setGrants] = useState<GrantRow[]>(
    MEMBERS.flatMap((m) => m.permissions.map((p) => ({ ...p, memberId: m.id }))),
  )
  const [laidOff, setLaidOff] = useState<Set<string>>(new Set())

  const [open, setOpen] = useState(false)
  const [memberId, setMemberId] = useState("")
  const [label, setLabel] = useState("")
  const [permissionKey, setPermissionKey] = useState<Permission["permissionKey"]>("approve_task")
  const [scopeCategory, setScopeCategory] = useState<string>("none")
  const [scopeDivision, setScopeDivision] = useState<string>("none")
  const [expiresAt, setExpiresAt] = useState("")

  const allowed = canManagePermissions(currentUser)

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

  function grant() {
    const p: GrantRow = {
      id: `local-grant-${Date.now()}`,
      memberId,
      label: label.trim(),
      permissionKey,
      scopeCategory: scopeCategory === "none" ? undefined : (scopeCategory as TaskCategory),
      scopeDivision: scopeDivision === "none" ? undefined : (scopeDivision as Division),
      grantedBy: currentUser.id,
      isEnabled: true,
      grantedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
    }
    setGrants((prev) => [p, ...prev])
    toast.success("Duty permission granted", {
      description: `"${label}" delegated to ${getMember(memberId)?.name}.`,
    })
    setOpen(false)
    setMemberId("")
    setLabel("")
    setScopeCategory("none")
    setScopeDivision("none")
    setExpiresAt("")
  }

  function toggleGrantEnabled(id: string, isEnabled: boolean) {
    setGrants((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, isEnabled, updatedAt: new Date().toISOString() }
          : g,
      ),
    )
    toast.success(`Permission ${isEnabled ? "enabled" : "disabled"}`)
  }

  function revoke(id: string) {
    setGrants((prev) => prev.filter((g) => g.id !== id))
    toast.success("Permission permanently revoked")
  }

  function layoff(id: string) {
    setLaidOff((prev) => new Set(prev).add(id))
    setGrants((prev) => prev.filter((g) => g.memberId !== id))
    toast.error(`${getMember(id)?.name} has been laid off`, {
      description: "Member set to inactive status (-100 pts logged).",
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Delegated Permissions &amp; Roles"
          description="Delegate approval and operational duties (e.g. Cleaning Coordinator, Social Media Manager) on top of base roles. Easily toggle grants on/off."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Grant Delegated Duty
            </Button>
          }
        />

        {/* Active delegated permissions */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Active Delegation Grants ({grants.length})
          </div>

          {grants.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No delegated permissions granted currently.
            </div>
          ) : (
            grants.map((g, i) => {
              const member = getMember(g.memberId)
              return (
                <div
                  key={g.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 ${
                    i !== 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar name={member?.name ?? "?"} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {member?.name}
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Scope: {g.scopeCategory ? TASK_CATEGORY_LABELS[g.scopeCategory] : "All Categories"}
                        {g.scopeDivision ? ` · ${g.scopeDivision}` : " · Club-wide"}
                        {g.expiresAt
                          ? ` · Expires ${new Date(g.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {g.isEnabled ? "Active" : "Disabled"}
                      </span>
                      <Switch
                        checked={g.isEnabled}
                        onCheckedChange={(checked) => toggleGrantEnabled(g.id, checked)}
                        aria-label={`Toggle ${g.label}`}
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
                            {member?.name} will lose the &quot;{g.label}&quot; operational duty immediately.
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
            <div className="flex flex-wrap gap-2">
              {MEMBERS.filter((m) => m.role === "member" && !laidOff.has(m.id)).map((m) => (
                <AlertDialog key={m.id}>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-rose-400 dark:border-rose-900/40 dark:bg-zinc-900 dark:text-zinc-200">
                      <MemberAvatar name={m.name} size={20} />
                      {m.name}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="h-5 w-5" /> Confirm Layoff of {m.name}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {m.name} will be removed from the active club roster and set to inactive (`is_active = false`). This action is final and recorded in the audit log.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => layoff(m.id)}
                        className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600"
                      >
                        Confirm Layoff
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grant Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Delegated Duty Permission</DialogTitle>
            <DialogDescription>
              Assign a granular capability without altering the member&apos;s base role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.division})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duty-label">Duty / Title Label</Label>
              <Input
                id="duty-label"
                placeholder="e.g. Cleaning Duty Coordinator"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category Scope</Label>
                <Select value={scopeCategory} onValueChange={setScopeCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {TASK_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Division Scope</Label>
                <Select value={scopeDivision} onValueChange={setScopeDivision}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Club-wide</SelectItem>
                    {DIVISIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiry Date (Optional)</Label>
              <Input id="expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={grant} disabled={!memberId || !label.trim()}>
              Grant Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
