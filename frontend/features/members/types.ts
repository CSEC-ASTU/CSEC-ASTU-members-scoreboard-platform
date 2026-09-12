export interface MemberRowItem {
  id: string
  name: string
  email: string
  avatar?: string | null
  division: string
  secondaryDivision?: string | null
  divisionsText: string
  department?: string | null
  joiningYear?: number | null
  role: string
  isActive: boolean
  cycleScore: number
  displayScore: number
  careerScore: number
  badge?: string | null
  studentId?: string | null
  phoneNumber?: string | null
  githubUrl?: string | null
  telegramUsername?: string | null
}
