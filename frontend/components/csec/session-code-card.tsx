"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useActiveAttendanceSessions,
  useCreateAttendanceSessionMutation,
  useEndAttendanceSessionMutation,
} from "@/lib/hooks/use-queries"
import type { TaskOut, DivisionOut } from "@/lib/api"
import { toast } from "sonner"
import {
  QrCode,
  Clock,
  CheckCircle2,
  StopCircle,
  Copy,
  Sparkles,
  ShieldCheck,
  Radio,
  Globe,
} from "lucide-react"

interface SessionCodeCardProps {
  currentUser: {
    id: string
    role: string
    divisionId?: string | null
    secondaryDivisionId?: string | null
  }
  tasks: TaskOut[]
  divisions: DivisionOut[]
}

export function SessionCodeCard({ currentUser, tasks, divisions }: SessionCodeCardProps) {
  const isExecutive =
    currentUser.role === "president" || currentUser.role === "vice_president"
  const isDivisionHead = currentUser.role === "division_head"
  const isOfficer = isExecutive || isDivisionHead

  const [selectedScope, setSelectedScope] = useState<string>(
    isExecutive ? "club_wide" : (currentUser.divisionId || "club_wide")
  )
  const [customTitle, setCustomTitle] = useState<string>("")
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [durationMinutes, setDurationMinutes] = useState<string>("90")
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const { data: activeSessions = [], isLoading } = useActiveAttendanceSessions(
    isDivisionHead ? (currentUser.divisionId || undefined) : undefined
  )

  const createSessionMutation = useCreateAttendanceSessionMutation()
  const endSessionMutation = useEndAttendanceSessionMutation()

  // Eligible attendance tasks
  const eligibleTasks = tasks.filter((t) => t.category === "division_session" && t.active)

  // Filter tasks based on selected scope
  const displayTasks = eligibleTasks.filter((t) => {
    if (selectedScope === "club_wide") {
      return t.division_id === null
    }
    return t.division_id === selectedScope
  })

  // Fallback to all eligible tasks if empty for chosen scope
  const availableTasks = displayTasks.length > 0 ? displayTasks : eligibleTasks

  // Automatically adjust selected task when scope or available tasks change
  useEffect(() => {
    if (availableTasks.length > 0) {
      const match = availableTasks.find((t) => t.id === selectedTaskId)
      if (!match) {
        setSelectedTaskId(availableTasks[0].id)
      }
    }
  }, [selectedScope, availableTasks, selectedTaskId])

  // Active session for this officer's scope
  const activeSession = activeSessions.find((s) => {
    if (!s.is_active) return false
    if (isDivisionHead) {
      return s.division_id === currentUser.divisionId
    }
    return true
  })

  // Real-time countdown timer
  useEffect(() => {
    if (!activeSession) {
      setTimeLeft("")
      return
    }

    function updateTimer() {
      const exp = new Date(activeSession!.expires_at).getTime()
      const now = Date.now()
      const diff = exp - now

      if (diff <= 0) {
        setTimeLeft("Expired")
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  if (!isOfficer) {
    return null
  }

  async function handleStartSession() {
    if (!selectedTaskId) {
      toast.error("Please select an attendance task")
      return
    }

    const targetDivisionId = selectedScope === "club_wide" ? null : selectedScope

    try {
      await createSessionMutation.mutateAsync({
        task_id: selectedTaskId,
        division_id: targetDivisionId,
        title: customTitle.trim() || undefined,
        duration_minutes: parseInt(durationMinutes, 10),
      })
      toast.success("Attendance session started! Write the code on the whiteboard.")
      setCustomTitle("")
    } catch (err: any) {
      toast.error("Failed to start session", { description: err.message })
    }
  }

  async function handleEndSession() {
    if (!activeSession) return
    try {
      await endSessionMutation.mutateAsync(activeSession.id)
      toast.success("Attendance session ended. Whiteboard code deactivated.")
    } catch (err: any) {
      toast.error("Failed to end session", { description: err.message })
    }
  }

  function handleCopyCode() {
    if (!activeSession) return
    navigator.clipboard.writeText(activeSession.code)
    setCopied(true)
    toast.success("Code copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="relative overflow-hidden border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Whiteboard Attendance Session
                {activeSession ? (
                  <Badge variant="outline" className="border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 font-mono text-xs flex items-center gap-1">
                    <Radio className="h-3 w-3 animate-pulse text-zinc-900 dark:text-zinc-100" /> LIVE NOW
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Officer Controls
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate dynamic 6-digit codes per session to write on the lab board. Codes auto-expire to prevent leaks.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        {activeSession ? (
          /* Live Active Session View */
          <div className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white/80 p-4 dark:bg-zinc-900/80 backdrop-blur-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Session:</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {activeSession.task_title || "Session Attendance"}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal flex items-center gap-1">
                    {(!activeSession.division_id || activeSession.division_name === "Club-wide") && (
                      <Globe className="w-3 h-3 text-purple-500" />
                    )}
                    {activeSession.division_name || "Club-wide"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    Expires in: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{timeLeft || "calculating..."}</strong>
                  </span>
                </div>
              </div>

              {/* 6-Digit Code Display */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 px-4 py-2">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                    {activeSession.code.slice(0, 3)} {activeSession.code.slice(3)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    onClick={handleCopyCode}
                    title="Copy code"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndSession}
                  disabled={endSessionMutation.isPending}
                  className="shrink-0"
                >
                  <StopCircle className="mr-1.5 h-4 w-4" /> End Session
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-zinc-400" />
              <span>
                <strong>Whiteboard Notice:</strong> Write <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{activeSession.code}</code> on the lab board. Members enter this PIN when claiming. Each member can only claim this code <strong>once</strong>.
              </span>
            </div>
          </div>
        ) : (
          /* Start New Session Form */
          <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            {/* Top Row: Scope & Custom Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <span>Scope / Audience</span>
                </label>
                <Select value={selectedScope} onValueChange={setSelectedScope}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-800 text-xs">
                    <SelectValue placeholder="Select session scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {isExecutive && (
                      <SelectItem value="club_wide" className="text-xs font-medium">
                        🌐 Club-wide (All Members)
                      </SelectItem>
                    )}
                    {divisions.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        disabled={isDivisionHead && currentUser.divisionId !== d.id && currentUser.secondaryDivisionId !== d.id}
                        className="text-xs"
                      >
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Custom Session Title <span className="text-[11px] text-zinc-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Week 4: Dynamic Programming & Graph BFS"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
            </div>

            {/* Bottom Row: Task, Duration & Start Button */}
            <div className="flex flex-col md:flex-row md:items-end gap-3 pt-1">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Attendance Task
                </label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-800 text-xs">
                    <SelectValue placeholder="Select attendance task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.title} (+{t.base_points} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-36 space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Duration
                </label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30" className="text-xs">30 minutes</SelectItem>
                    <SelectItem value="60" className="text-xs">1 hour</SelectItem>
                    <SelectItem value="90" className="text-xs">1.5 hours</SelectItem>
                    <SelectItem value="120" className="text-xs">2 hours</SelectItem>
                    <SelectItem value="180" className="text-xs">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleStartSession}
                disabled={createSessionMutation.isPending || !selectedTaskId}
                className="w-full md:w-auto bg-violet-600 hover:bg-violet-500 text-white text-xs shrink-0 h-9"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Start Session &amp; Generate Code
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
