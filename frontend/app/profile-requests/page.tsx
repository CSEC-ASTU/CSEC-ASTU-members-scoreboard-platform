"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import Layout from "@/components/kokonutui/layout"
import { PageHeader } from "@/components/csec/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Empty } from "@/components/ui/empty"
import { MemberAvatar } from "@/components/csec/ui-bits"
import { useCurrentUser } from "@/components/user-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useProfileChangeRequests,
  useApproveProfileChangeMutation,
  useRejectProfileChangeMutation,
} from "@/lib/hooks/use-queries"
import { isOfficer } from "@/lib/permissions"
import type { ProfileChangeRequestOut } from "@/lib/api"
import { ArrowRight, Check, Clock, Shield, UserRound, X } from "lucide-react"
import { cn } from "@/lib/utils"

function FieldDiff({
  label,
  before,
  after,
}: {
  label: string
  before?: string | null
  after?: string | null
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 dark:border-white/10 p-3 space-y-1.5">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-zinc-500 line-through decoration-zinc-400/60">{before || "—"}</span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{after || "—"}</span>
      </div>
    </div>
  )
}

function PhotoDiff({ req }: { req: ProfileChangeRequestOut }) {
  if (!req.remove_profile_image && !req.proposed_profile_image_url) return null
  return (
    <div className="rounded-lg border border-zinc-200/80 dark:border-white/10 p-3 space-y-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">Profile Photo</div>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="text-center space-y-1.5">
          <div className="text-[11px] text-zinc-500">Current</div>
          <MemberAvatar
            name={req.member_full_name || "Member"}
            imageUrl={req.current_profile_image_url || undefined}
            size={72}
          />
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400" />
        <div className="text-center space-y-1.5">
          <div className="text-[11px] text-zinc-500">Proposed</div>
          {req.remove_profile_image ? (
            <div className="h-[72px] w-[72px] rounded-full border border-dashed border-red-300/60 flex items-center justify-center text-[11px] text-red-500">
              Remove
            </div>
          ) : (
            <MemberAvatar
              name={req.member_full_name || "Member"}
              imageUrl={req.proposed_profile_image_url || undefined}
              size={72}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileRequestsPage() {
  const { currentUser, isAuthenticated } = useCurrentUser()
  const officer =
    isOfficer(currentUser) &&
    (currentUser.role === "division_head" ||
      currentUser.role === "vice_president" ||
      currentUser.role === "president")
  const canDecide =
    currentUser.role === "president" || currentUser.role === "vice_president"

  const { data, isLoading } = useProfileChangeRequests(isAuthenticated && officer, "pending")
  const approveMutation = useApproveProfileChangeMutation()
  const rejectMutation = useRejectProfileChangeMutation()

  const items = useMemo(() => data?.items || [], [data])
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<ProfileChangeRequestOut | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    if (isAuthenticated && !officer) {
      toast.error("Access restricted to club officers")
    }
  }, [isAuthenticated, officer])

  async function handleApprove(req: ProfileChangeRequestOut) {
    try {
      await approveMutation.mutateAsync(req.id)
      toast.success(`Approved profile change for ${req.member_full_name}`)
    } catch (err) {
      toast.error("Failed to approve", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  async function handleReject() {
    if (!rejectTarget || rejectReason.trim().length < 1) {
      toast.error("Please provide a rejection reason")
      return
    }
    try {
      await rejectMutation.mutateAsync({
        id: rejectTarget.id,
        decision_reason: rejectReason.trim(),
      })
      toast.success(`Rejected profile change for ${rejectTarget.member_full_name}`)
      setRejectOpen(false)
      setRejectTarget(null)
      setRejectReason("")
    } catch (err) {
      toast.error("Failed to reject", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  if (!officer) {
    return (
      <Layout>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Access Restricted</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Only Division Heads, the Vice President, and the President can review profile change
                requests.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Profile Change Requests"
          description="Review sensitive profile updates. Division Heads can inspect before/after; only the President or Vice President can approve or reject."
        />

        {!canDecide && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
            You can review requests and notify executives. Final approval is reserved for the
            President and Vice President.
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-zinc-500">Loading requests…</div>
        ) : items.length === 0 ? (
          <Empty className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                <UserRound className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No pending profile requests
              </p>
              <p className="text-xs text-zinc-500 max-w-sm">
                When members change their name, phone, or photo, requests will appear here for review.
              </p>
            </div>
          </Empty>
        ) : (
          <div className="space-y-4">
            {items.map((req) => {
              const changeKeys = Object.keys(req.proposed_changes || {})
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/40 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        name={req.member_full_name || "Member"}
                        imageUrl={req.current_profile_image_url || undefined}
                        size={44}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {req.member_full_name}
                          </h3>
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500">{req.member_email}</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 dark:bg-white/[0.03] p-3 text-sm">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                      Member reason
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200">{req.reason}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {changeKeys.map((key) => (
                      <FieldDiff
                        key={key}
                        label={key.replace(/_/g, " ")}
                        before={req.current_snapshot?.[key]}
                        after={req.proposed_changes?.[key]}
                      />
                    ))}
                    <div className={cn(changeKeys.length === 0 && "sm:col-span-2")}>
                      <PhotoDiff req={req} />
                    </div>
                  </div>

                  {canDecide && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40"
                        onClick={() => {
                          setRejectTarget(req)
                          setRejectReason("")
                          setRejectOpen(true)
                        }}
                      >
                        <X className="h-4 w-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject profile change</DialogTitle>
            <DialogDescription>
              Explain why this request for {rejectTarget?.member_full_name} is being rejected. The
              member will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || rejectReason.trim().length < 1}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
