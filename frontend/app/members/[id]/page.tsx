"use client"

import { useMemo, useState } from "react"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import Layout from "@/frontend/components/kokonutui/layout"
import List02 from "@/frontend/components/kokonutui/list-02"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { MemberAvatar, WarningPill, TierBadge, ScoreCapProgress } from "@/frontend/components/csec/ui-bits"
import { IssueWarningDialog } from "@/frontend/components/csec/issue-warning-dialog"
import { useCurrentUser } from "@/frontend/components/user-context"
import { canIssueWarning } from "@/lib/permissions"
import {
  getMember,
  getMemberCycleScore,
  getMemberCareerScore,
  getMemberBadge,
  getMemberEvents,
  getMemberWarnings,
  getMemberAnnualSummaries,
  ROLE_LABELS,
  PLATFORM_SETTINGS,
  type PointEvent,
  type Warning,
} from "@/lib/csec-data"
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
} from "lucide-react"

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>()
  const { currentUser } = useCurrentUser()
  const member = getMember(params.id)

  const [localEvents, setLocalEvents] = useState<PointEvent[]>([])
  const [localWarnings, setLocalWarnings] = useState<Warning[]>([])
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [telegram, setTelegram] = useState(member?.telegramUsername ?? "")
  const [connected, setConnected] = useState(Boolean(member?.telegramUsername))

  if (!member) return notFound()

  const events = useMemo(
    () => [...localEvents, ...getMemberEvents(member.id)],
    [localEvents, member.id],
  )
  const warnings = useMemo(
    () => [...localWarnings, ...getMemberWarnings(member.id)],
    [localWarnings, member.id],
  )
  const annualSummaries = useMemo(() => getMemberAnnualSummaries(member.id), [member.id])

  const cycleScore = getMemberCycleScore(member.id, events)
  const careerScore = getMemberCareerScore(member.id, events)
  const badge = getMemberBadge(cycleScore, PLATFORM_SETTINGS.scoreCap)

  const isSelf = currentUser.id === member.id
  const officerCanWarn = canIssueWarning(currentUser, member)

  const redCount = warnings.filter((w) => w.level === "red").length
  const yellowCount = warnings.filter((w) => w.level === "yellow").length
  const ladderStage = redCount > 0 ? 2 : yellowCount > 0 ? 1 : 0

  function handleWarningSuccess(newEvent: PointEvent, newWarning?: Warning) {
    setLocalEvents((prev) => [newEvent, ...prev])
    if (newWarning) {
      setLocalWarnings((prev) => [newWarning, ...prev])
    }
  }

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
                  <span>{member.division}</span>
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
                <Building2 className="h-3 w-3 text-zinc-500" /> Division
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                {member.division}
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
                      Issued by {getMember(w.issuedBy)?.name ?? "Officer"} · Academic Year {w.academicYear}
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
                      Granted by {getMember(p.grantedBy)?.name ?? "Officer"}
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
    </Layout>
  )
}
