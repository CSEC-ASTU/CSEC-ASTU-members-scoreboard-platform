export interface SelectedCell {
  memberName: string
  dateDisplay: string
  taskTitle: string
  status: "present" | "late" | "absent"
  delayMinutes: number | null
  claimedAt: string | null
  points: number
}

export interface PersonalSessionItem {
  id: string
  sessionId: string
  title: string
  scope: string
  isClubWide: boolean
  date: string
  dateDisplay: string
  status: "present" | "late" | "absent"
  pointsAwarded: number
  delayMinutes: number | null
}

export interface PersonalStats {
  currentStreak: number
  turnoutRate: number
  onTimeRate: number
  totalPoints: number
  attended: number
  total: number
  onTime: number
}
