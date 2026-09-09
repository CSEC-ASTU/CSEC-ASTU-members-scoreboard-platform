// CSEC ASTU Member Management Platform — Data & State Layer
// Mirrors the FastAPI + PostgreSQL backend specification (/api/v1).
// Score is derived, never stored/edited directly.
// Base loss-aversion buffer: +50 pts each academic year.
// score_cap = 2,500 pts for current academic year cycle. Career score is lifetime & uncapped.

export type Role = "member" | "division_head" | "vice_president" | "president"

export const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  division_head: "Division Head",
  vice_president: "Vice President",
  president: "President",
}

export const OFFICER_ROLES: Role[] = ["division_head", "vice_president", "president"]

export type Division =
  | "Capacity Building"
  | "Development"
  | "Competitive Programming"
  | "Data Science"
  | "Cybersecurity"
  | "Cyber Security"
  | "Social Media"
  | "Blockchain team"

export const DIVISIONS: Division[] = [
  "Capacity Building",
  "Development",
  "Competitive Programming",
  "Data Science",
  "Cybersecurity",
  "Social Media",
  "Blockchain team",
]

export type TaskCategory =
  | "division_session"
  | "lab_cleaning"
  | "event_organizing"
  | "internal_bootcamp"
  | "external_activity"
  | "game_night"
  | "academic_support"
  | "social_media"

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  division_session: "Division Session Attendance",
  lab_cleaning: "Weekly Lab Cleaning Duty",
  event_organizing: "Event Organizing",
  internal_bootcamp: "Internal Bootcamps",
  external_activity: "External Member Activity",
  game_night: "Game Night",
  academic_support: "External Academic Lecture Support",
  social_media: "Social Media Division Work",
}

export type ClaimStatus = "pending" | "approved" | "rejected"
export type WarningLevel = "yellow" | "red"

export type EventType =
  | "claim"
  | "yellow_warning"
  | "red_warning"
  | "manual_adjustment"
  | "layoff"

export interface PlatformSettings {
  scoreCap: number
  initialBuffer: number
  currentAcademicYear: number
  autoApproveClaimMaxPoints: number // Improvement 03
  badgeTierMultipliers: {
    gold: number // 1.0x cap (2500)
    platinum: number // 1.5x cap (3750)
    diamond: number // 2.0x cap (5000)
  }
}

export const PLATFORM_SETTINGS: PlatformSettings = {
  scoreCap: 2500,
  initialBuffer: 50,
  currentAcademicYear: 2026,
  autoApproveClaimMaxPoints: 10,
  badgeTierMultipliers: {
    gold: 1.0,
    platinum: 1.5,
    diamond: 2.0,
  },
}

export type BadgeTier = "gold" | "platinum" | "diamond"

export interface Permission {
  id: string
  label: string
  permissionKey: "approve_task" | "manage_tasks" | "cbd_head" | "social_media_manager" | "cleaning_duty_coordinator"
  scopeCategory?: TaskCategory
  scopeDivision?: Division
  scopeValue?: string | null
  grantedBy: string // member id
  isEnabled: boolean
  grantedAt: string
  updatedAt: string
  expiresAt?: string
}

export interface PermissionGrantHistory {
  id: string
  memberPermissionId?: string
  memberId: string
  permissionKey: string
  scopeValue?: string | null
  action: "granted" | "enabled" | "disabled" | "revoked"
  actorId: string
  note?: string
  createdAt: string
}

export interface Member {
  id: string
  googleId?: string
  name: string
  email: string
  avatar?: string
  division: Division
  department: string
  joiningYear: number
  role: Role
  isActive: boolean
  onboarded: boolean
  telegramUsername?: string
  permissions: Permission[]
}

export interface TaskDef {
  id: string
  title: string
  category: TaskCategory
  points: number
  description: string
  active: boolean
  isPenalty?: boolean
  divisionId?: string
  division_id?: string | null
}

export interface PointEvent {
  id: string
  memberId: string
  taskId?: string
  taskTitle: string
  category: TaskCategory
  eventType: EventType
  delta: number // signed
  status: ClaimStatus
  reason: string
  decisionReason?: string | null // Improvement 05
  approverId?: string | null
  academicYear: number
  createdAt: string // ISO UTC
}

export interface Warning {
  id: string
  memberId: string
  level: WarningLevel
  reason: string
  issuedBy: string
  academicYear: number
  createdAt: string
}

export interface AnnualSummary {
  id: string
  memberId: string
  academicYear: number
  finalScore: number
  finalRank: number
  badgesEarned?: BadgeTier | null
  createdAt: string
}

export interface LoginAttemptFailure {
  id: string
  email: string
  googleId: string | null
  reason: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Seed Data: Members
// ---------------------------------------------------------------------------

export const MEMBERS: Member[] = [
  {
    id: "m1",
    googleId: "google-101",
    name: "Abenezer Tesfaye",
    email: "abenezer.t@astu.edu.et",
    division: "Development",
    department: "Software Engineering",
    joiningYear: 2022,
    role: "president",
    isActive: true,
    onboarded: true,
    telegramUsername: "@abeni_dev",
    permissions: [],
  },
  {
    id: "m2",
    googleId: "google-102",
    name: "Sara Bekele",
    email: "sara.b@astu.edu.et",
    division: "Competitive Programming",
    department: "Computer Science",
    joiningYear: 2022,
    role: "vice_president",
    isActive: true,
    onboarded: true,
    telegramUsername: "@sara_cp",
    permissions: [],
  },
  {
    id: "m3",
    googleId: "google-103",
    name: "Yohannes Girma",
    email: "yohannes.g@astu.edu.et",
    division: "Cyber Security",
    department: "Computer Science",
    joiningYear: 2023,
    role: "division_head",
    isActive: true,
    onboarded: true,
    telegramUsername: "@yoni_sec",
    permissions: [],
  },
  {
    id: "m4",
    googleId: "google-104",
    name: "Hanna Mekonnen",
    email: "hanna.m@astu.edu.et",
    division: "Data Science",
    department: "Computer Science",
    joiningYear: 2023,
    role: "division_head",
    isActive: true,
    onboarded: true,
    permissions: [],
  },
  {
    id: "m5",
    googleId: "google-105",
    name: "Nahom Alemu",
    email: "nahom.a@astu.edu.et",
    division: "Development",
    department: "Software Engineering",
    joiningYear: 2024,
    role: "member",
    isActive: true,
    onboarded: true,
    telegramUsername: "@nahom_a",
    permissions: [
      {
        id: "p1",
        label: "Cleaning Duty Coordinator",
        permissionKey: "cleaning_duty_coordinator",
        scopeCategory: "lab_cleaning",
        scopeDivision: "Development",
        grantedBy: "m1",
        isEnabled: true,
        grantedAt: "2026-02-01T10:00:00Z",
        updatedAt: "2026-02-01T10:00:00Z",
      },
    ],
  },
  {
    id: "m6",
    googleId: "google-106",
    name: "Mahlet Assefa",
    email: "mahlet.a@astu.edu.et",
    division: "Capacity Building",
    department: "Electrical Engineering",
    joiningYear: 2024,
    role: "member",
    isActive: true,
    onboarded: true,
    permissions: [
      {
        id: "p2",
        label: "Social Media Manager",
        permissionKey: "social_media_manager",
        scopeCategory: "social_media",
        grantedBy: "m2",
        isEnabled: true,
        grantedAt: "2026-01-15T09:00:00Z",
        updatedAt: "2026-01-15T09:00:00Z",
        expiresAt: "2026-12-31",
      },
    ],
  },
  {
    id: "m7",
    googleId: "google-107",
    name: "Dawit Haile",
    email: "dawit.h@astu.edu.et",
    division: "Competitive Programming",
    department: "Computer Science",
    joiningYear: 2024,
    role: "member",
    isActive: true,
    onboarded: true,
    telegramUsername: "@dave_cp",
    permissions: [],
  },
  {
    id: "m8",
    googleId: "google-108",
    name: "Bethlehem Tadesse",
    email: "bethlehem.t@astu.edu.et",
    division: "Data Science",
    department: "Applied Mathematics",
    joiningYear: 2025,
    role: "member",
    isActive: true,
    onboarded: true,
    permissions: [],
  },
  {
    id: "m9",
    googleId: "google-109",
    name: "Kaleb Solomon",
    email: "kaleb.s@astu.edu.et",
    division: "Cyber Security",
    department: "Computer Science",
    joiningYear: 2025,
    role: "member",
    isActive: true,
    onboarded: true,
    telegramUsername: "@kaleb_s",
    permissions: [],
  },
  {
    id: "m10",
    googleId: "google-110",
    name: "Rediet Fikru",
    email: "rediet.f@astu.edu.et",
    division: "Development",
    department: "Software Engineering",
    joiningYear: 2023,
    role: "member",
    isActive: true,
    onboarded: true,
    permissions: [],
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Task Catalog
// ---------------------------------------------------------------------------

export const TASKS: TaskDef[] = [
  {
    id: "t1",
    title: "Attend Weekly Division Session",
    category: "division_session",
    points: 10,
    description: "Attend your division's scheduled weekly technical session.",
    active: true,
  },
  {
    id: "t2",
    title: "Weekly Lab Cleaning Duty",
    category: "lab_cleaning",
    points: 15,
    description: "Complete assigned lab cleaning duty for the week (confirmed).",
    active: true,
  },
  {
    id: "t3",
    title: "Lead Organizer, Club-Wide Event",
    category: "event_organizing",
    points: 125,
    description: "Lead club-wide seminar or hackathon as assigned by VP/President.",
    active: true,
  },
  {
    id: "t4",
    title: "Lead Organizer, Division Event",
    category: "event_organizing",
    points: 75,
    description: "Lead division-specific technical workshop or seminar.",
    active: true,
  },
  {
    id: "t5",
    title: "Event Co-Organizer / Support",
    category: "event_organizing",
    points: 50,
    description: "Support logistics, registration, and operations during events.",
    active: true,
  },
  {
    id: "t6",
    title: "Deliver Bootcamp Lecture",
    category: "internal_bootcamp",
    points: 75,
    description: "Prepare and deliver an internal technical lecture or workshop.",
    active: true,
  },
  {
    id: "t7",
    title: "Prepare Bootcamp Material",
    category: "internal_bootcamp",
    points: 40,
    description: "Create exercises, slides, or starter repos for internal bootcamps.",
    active: true,
  },
  {
    id: "t8",
    title: "Attend Bootcamp Session",
    category: "internal_bootcamp",
    points: 10,
    description: "Participate actively as a learner in an internal bootcamp.",
    active: true,
  },
  {
    id: "t9",
    title: "External Event Representation",
    category: "external_activity",
    points: 75,
    description: "Represent CSEC ASTU at an external hackathon, ICPC, or CTF.",
    active: true,
  },
  {
    id: "t10",
    title: "Game Night Attendance",
    category: "game_night",
    points: 25,
    description: "Attend bi-weekly community bonding and game night.",
    active: true,
  },
  {
    id: "t11",
    title: "Game Night 3x Streak Bonus",
    category: "game_night",
    points: 25,
    description: "Bonus for attending 3 consecutive game nights.",
    active: true,
  },
  {
    id: "t12",
    title: "Organize Game Night",
    category: "game_night",
    points: 60,
    description: "Plan, prepare games, and host the bi-weekly game night.",
    active: true,
  },
  {
    id: "t13",
    title: "Deliver External Academic Lecture Support",
    category: "academic_support",
    points: 75,
    description: "Deliver tutorial or lecture support assigned by CBD.",
    active: true,
  },
  {
    id: "t14",
    title: "Social Media Design Asset",
    category: "social_media",
    points: 25,
    description: "Create promotional poster, motion graphic, or UI visual.",
    active: true,
  },
  {
    id: "t15",
    title: "Social Media Video Edit",
    category: "social_media",
    points: 40,
    description: "Edit highlight reel, session recap, or promotional video.",
    active: true,
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Point Events Ledger (Append-Only)
// ---------------------------------------------------------------------------

export const POINT_EVENTS: PointEvent[] = [
  {
    id: "e1",
    memberId: "m1",
    taskId: "t3",
    taskTitle: "Lead Organizer, Club-Wide Event",
    category: "event_organizing",
    eventType: "claim",
    delta: 125,
    status: "approved",
    reason: "Led ASTU Hackathon 2026 planning and execution.",
    decisionReason: null,
    approverId: "m2",
    academicYear: 2026,
    createdAt: "2026-06-10T10:00:00Z",
  },
  {
    id: "e2",
    memberId: "m1",
    taskId: "t6",
    taskTitle: "Deliver Bootcamp Lecture",
    category: "internal_bootcamp",
    eventType: "claim",
    delta: 75,
    status: "approved",
    reason: "Delivered Full-Stack Architecture session.",
    decisionReason: null,
    approverId: "m2",
    academicYear: 2026,
    createdAt: "2026-06-25T14:00:00Z",
  },
  {
    id: "e3",
    memberId: "m1",
    taskId: "t1",
    taskTitle: "Attend Weekly Division Session",
    category: "division_session",
    eventType: "claim",
    delta: 10,
    status: "approved",
    reason: "Attended Development weekly sync.",
    decisionReason: "auto-approved (low-stakes claim)",
    approverId: null,
    academicYear: 2026,
    createdAt: "2026-07-01T18:00:00Z",
  },
  {
    id: "e4",
    memberId: "m2",
    taskId: "t3",
    taskTitle: "Lead Organizer, Club-Wide Event",
    category: "event_organizing",
    eventType: "claim",
    delta: 125,
    status: "approved",
    reason: "Co-led ASTU ICPC Qualifier competition.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-06-15T11:00:00Z",
  },
  {
    id: "e5",
    memberId: "m2",
    taskId: "t6",
    taskTitle: "Deliver Bootcamp Lecture",
    category: "internal_bootcamp",
    eventType: "claim",
    delta: 75,
    status: "approved",
    reason: "Delivered Graph Algorithms masterclass.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-07-05T14:00:00Z",
  },
  {
    id: "e6",
    memberId: "m3",
    taskId: "t4",
    taskTitle: "Lead Organizer, Division Event",
    category: "event_organizing",
    eventType: "claim",
    delta: 75,
    status: "approved",
    reason: "Organized internal Cyber Security CTF round.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-07-12T10:00:00Z",
  },
  {
    id: "e7",
    memberId: "m4",
    taskId: "t6",
    taskTitle: "Deliver Bootcamp Lecture",
    category: "internal_bootcamp",
    eventType: "claim",
    delta: 75,
    status: "approved",
    reason: "Delivered Intro to ML & Pandas tutorial.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-07-15T15:00:00Z",
  },
  {
    id: "e8",
    memberId: "m5",
    taskId: "t2",
    taskTitle: "Weekly Lab Cleaning Duty",
    category: "lab_cleaning",
    eventType: "claim",
    delta: 15,
    status: "approved",
    reason: "Completed Week 6 cleaning rotation.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-07-28T09:00:00Z",
  },
  {
    id: "e9",
    memberId: "m5",
    taskId: "t6",
    taskTitle: "Deliver Bootcamp Lecture",
    category: "internal_bootcamp",
    eventType: "claim",
    delta: 75,
    status: "approved",
    reason: "Delivered React 19 fundamentals lecture.",
    decisionReason: null,
    approverId: "m1",
    academicYear: 2026,
    createdAt: "2026-07-22T15:00:00Z",
  },
  {
    id: "e10",
    memberId: "m6",
    taskId: "t14",
    taskTitle: "Social Media Design Asset",
    category: "social_media",
    eventType: "claim",
    delta: 25,
    status: "pending",
    reason: "Designed launch poster for ASTU Hackathon 2026.",
    decisionReason: null,
    academicYear: 2026,
    createdAt: "2026-08-01T08:30:00Z",
  },
  {
    id: "e11",
    memberId: "m7",
    taskId: "t1",
    taskTitle: "Attend Weekly Division Session",
    category: "division_session",
    eventType: "claim",
    delta: 10,
    status: "approved",
    reason: "Present at CP division practice session.",
    decisionReason: "auto-approved (low-stakes claim)",
    approverId: null,
    academicYear: 2026,
    createdAt: "2026-07-29T14:00:00Z",
  },
  {
    id: "e12",
    memberId: "m8",
    taskId: "t2",
    taskTitle: "Weekly Lab Cleaning Duty",
    category: "lab_cleaning",
    eventType: "yellow_warning",
    delta: -25,
    status: "approved",
    reason: "Repeated unexcused absence from assigned cleaning duties.",
    decisionReason: "Officer disciplinary warning issued.",
    approverId: "m4",
    academicYear: 2026,
    createdAt: "2026-07-30T11:00:00Z",
  },
  {
    id: "e13",
    memberId: "m8",
    taskId: "t10",
    taskTitle: "Game Night Attendance",
    category: "game_night",
    eventType: "claim",
    delta: 25,
    status: "rejected",
    reason: "Attended game night session.",
    decisionReason: "No attendance record found on the check-in list.",
    approverId: "m4",
    academicYear: 2026,
    createdAt: "2026-07-25T18:00:00Z",
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Warnings
// ---------------------------------------------------------------------------

export const WARNINGS: Warning[] = [
  {
    id: "w1",
    memberId: "m8",
    level: "yellow",
    reason: "Repeated missed lab cleaning duty without offsetting contributions.",
    issuedBy: "m4",
    academicYear: 2026,
    createdAt: "2026-07-30T11:00:00Z",
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Annual Summaries
// ---------------------------------------------------------------------------

export const ANNUAL_SUMMARIES: AnnualSummary[] = [
  {
    id: "as-1",
    memberId: "m1",
    academicYear: 2025,
    finalScore: 2650,
    finalRank: 1,
    badgesEarned: "gold",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "as-2",
    memberId: "m2",
    academicYear: 2025,
    finalScore: 2380,
    finalRank: 2,
    badgesEarned: null,
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "as-3",
    memberId: "m3",
    academicYear: 2025,
    finalScore: 1940,
    finalRank: 3,
    badgesEarned: null,
    createdAt: "2025-09-01T00:00:00Z",
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Login Attempt Failures (Improvement 01 & 08)
// ---------------------------------------------------------------------------

export const LOGIN_ATTEMPT_FAILURES: LoginAttemptFailure[] = [
  {
    id: "laf-1",
    email: "dawit.unknown@gmail.com",
    googleId: "google-failed-001",
    reason: "not_registered",
    createdAt: "2026-08-01T10:15:00Z",
  },
  {
    id: "laf-2",
    email: "selamawit.k@gmail.com",
    googleId: "google-failed-002",
    reason: "not_registered",
    createdAt: "2026-08-03T14:22:00Z",
  },
]

// ---------------------------------------------------------------------------
// Seed Data: Permission Grant History (Improvement 02)
// ---------------------------------------------------------------------------

export const PERMISSION_GRANT_HISTORY: PermissionGrantHistory[] = [
  {
    id: "pgh-1",
    memberPermissionId: "p1",
    memberId: "m5",
    permissionKey: "cleaning_duty_coordinator",
    scopeValue: "lab_cleaning:Development",
    action: "granted",
    actorId: "m1",
    note: "Assigned semester cleaning duty coordination for Dev track.",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "pgh-2",
    memberPermissionId: "p2",
    memberId: "m6",
    permissionKey: "social_media_manager",
    scopeValue: "social_media",
    action: "granted",
    actorId: "m2",
    note: "Assigned club-wide social media content management.",
    createdAt: "2026-01-15T09:00:00Z",
  },
]

// ---------------------------------------------------------------------------
// Derived Helpers & Scoring Calculations
// ---------------------------------------------------------------------------

export function getMemberCycleScore(
  memberId: string,
  events: PointEvent[] = POINT_EVENTS,
  year: number = PLATFORM_SETTINGS.currentAcademicYear,
): number {
  const approvedDelta = events
    .filter((e) => e.memberId === memberId && e.status === "approved" && e.academicYear === year)
    .reduce((sum, e) => sum + e.delta, 0)

  return PLATFORM_SETTINGS.initialBuffer + approvedDelta
}

export function getMemberDisplayScore(
  memberId: string,
  events: PointEvent[] = POINT_EVENTS,
  year: number = PLATFORM_SETTINGS.currentAcademicYear,
  cap: number = PLATFORM_SETTINGS.scoreCap,
): number {
  const cycleScore = getMemberCycleScore(memberId, events, year)
  return Math.min(cycleScore, cap)
}

export function getMemberCareerScore(
  memberId: string,
  events: PointEvent[] = POINT_EVENTS,
  summaries: AnnualSummary[] = ANNUAL_SUMMARIES,
): number {
  const pastTotal = summaries
    .filter((s) => s.memberId === memberId)
    .reduce((sum, s) => sum + s.finalScore, 0)

  const currentCycle = getMemberCycleScore(memberId, events)
  return pastTotal + currentCycle
}

export function getMemberBadge(
  cycleScore: number,
  scoreCap: number = PLATFORM_SETTINGS.scoreCap,
): BadgeTier | null {
  if (cycleScore >= scoreCap * 2.0) return "diamond"
  if (cycleScore >= scoreCap * 1.5) return "platinum"
  if (cycleScore >= scoreCap * 1.0) return "gold"
  return null
}

export function getMember(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id)
}

export function getMemberEvents(memberId: string, events: PointEvent[] = POINT_EVENTS): PointEvent[] {
  return events
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getMemberWarnings(memberId: string, warnings: Warning[] = WARNINGS): Warning[] {
  return warnings
    .filter((w) => w.memberId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getMemberAnnualSummaries(
  memberId: string,
  summaries: AnnualSummary[] = ANNUAL_SUMMARIES,
): AnnualSummary[] {
  return summaries
    .filter((s) => s.memberId === memberId)
    .sort((a, b) => b.academicYear - a.academicYear)
}

export interface LeaderboardRow extends Member {
  cycleScore: number
  displayScore: number
  careerScore: number
  badge: BadgeTier | null
}

export function getLeaderboard(
  division?: Division,
  academicYear: number = PLATFORM_SETTINGS.currentAcademicYear,
  events: PointEvent[] = POINT_EVENTS,
): LeaderboardRow[] {
  return MEMBERS.filter((m) => m.isActive && (!division || m.division === division))
    .map((m) => {
      const cycleScore = getMemberCycleScore(m.id, events, academicYear)
      const displayScore = Math.min(cycleScore, PLATFORM_SETTINGS.scoreCap)
      const careerScore = getMemberCareerScore(m.id, events)
      const badge = getMemberBadge(cycleScore, PLATFORM_SETTINGS.scoreCap)
      return {
        ...m,
        cycleScore,
        displayScore,
        careerScore,
        badge,
      }
    })
    .sort((a, b) => b.displayScore - a.displayScore || b.careerScore - a.careerScore)
}

export function getHistoricalLeaderboard(
  academicYear: number,
  division?: Division,
  summaries: AnnualSummary[] = ANNUAL_SUMMARIES,
): (AnnualSummary & { member?: Member })[] {
  return summaries
    .filter((s) => s.academicYear === academicYear)
    .map((s) => ({
      ...s,
      member: getMember(s.memberId),
    }))
    .filter((s) => !division || s.member?.division === division)
    .sort((a, b) => b.finalScore - a.finalScore)
}

export function getPointsTrend(
  division?: Division,
  events: PointEvent[] = POINT_EVENTS,
): { week: string; points: number }[] {
  const activeMemberIds = new Set(
    MEMBERS.filter((m) => !division || m.division === division).map((m) => m.id),
  )
  const buckets: Record<string, number> = {}

  events
    .filter((e) => e.status === "approved" && activeMemberIds.has(e.memberId))
    .forEach((e) => {
      const d = new Date(e.createdAt)
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      buckets[label] = (buckets[label] ?? 0) + e.delta
    })

  return Object.entries(buckets)
    .map(([week, points]) => ({ week, points }))
    .sort((a, b) => new Date(a.week + ", 2026").getTime() - new Date(b.week + ", 2026").getTime())
}
