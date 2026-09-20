// API Data Transfer Objects (DTOs) matching the FastAPI Pydantic schemas (/api/v1)

export type Role = "member" | "division_head" | "vice_president" | "president"
export type ClaimStatus = "pending" | "approved" | "rejected"
export type WarningLevel = "normal" | "yellow" | "red"
export type EventType = "claim" | "normal_warning" | "yellow_warning" | "red_warning" | "manual_adjustment" | "layoff"
export type BadgeTier = "gold" | "platinum" | "diamond"
export type PermissionAction = "granted" | "enabled" | "disabled" | "revoked"

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// Auth & Member models
export interface MemberOut {
  id: string
  google_id?: string | null
  full_name: string
  email: string
  profile_image_url: string | null
  division_id: string | null
  secondary_division_id?: string | null
  division_name?: string | null
  secondary_division_name?: string | null
  role: Role
  department: string | null
  joining_year: number | null
  student_id?: string | null
  phone_number?: string | null
  github_url?: string | null
  telegram_username?: string | null
  is_active: boolean
  first_login_at?: string | null
  created_at?: string
  updated_at?: string
  cycle_score?: number | null
  display_score?: number | null
  career_score?: number | null
  badge?: BadgeTier | null
}

export interface MemberScoresOut {
  member_id: string
  academic_year: number
  cycle_score: number
  display_score: number
  career_score: number
  badge: BadgeTier | null
}

export interface MemberDetailOut extends MemberOut {
  scores?: MemberScoresOut
  division_name?: string | null
  secondary_division_name?: string | null
  permissions?: string[]
  joined_at?: string
  google_claimed?: boolean
}

export interface MemberSelfUpdateIn {
  department?: string
  full_name?: string
  phone_number?: string
  github_url?: string
  telegram_username?: string
  reason?: string
}

export type ProfileChangeStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface ProfileChangeRequestOut {
  id: string
  member_id: string
  member_full_name?: string | null
  member_email?: string | null
  member_role?: Role | null
  member_division_id?: string | null
  status: ProfileChangeStatus
  reason: string
  proposed_changes: Record<string, string | null>
  current_snapshot: Record<string, string | null>
  proposed_profile_image_url?: string | null
  current_profile_image_url?: string | null
  remove_profile_image: boolean
  reviewed_by?: string | null
  reviewer_full_name?: string | null
  reviewed_at?: string | null
  decision_reason?: string | null
  created_at: string
}

export interface ProfileSelfUpdateResult {
  member: MemberDetailOut
  pending_request: ProfileChangeRequestOut | null
  message: string
}

export interface ProfilePictureRequestResult {
  pending_request: ProfileChangeRequestOut
  message: string
}


export interface CurrentUserOut {
  id: string
  full_name: string
  email: string
  profile_image_url: string | null
  division_id: string | null
  division_name?: string | null
  secondary_division_id?: string | null
  secondary_division_name?: string | null
  role: Role
  department: string | null
  joining_year: number | null
  student_id?: string | null
  phone_number?: string | null
  github_url?: string | null
  telegram_username?: string | null
  telegram_connected?: boolean
  onboarded: boolean
  cycle_score: number
  display_score: number
  career_score: number
  badge?: BadgeTier | null
  permissions: string[]
}

export interface TelegramConnectOut {
  token: string
  link: string | null
}

export interface AchievementCardOut {
  member_id: string
  full_name: string
  division_name: string | null
  secondary_division_name?: string | null
  joining_year: number
  career_score: number
  current_cycle_score: number
  current_display_score: number
  current_badge: BadgeTier | null
  academic_year: number
  score_cap: number
}

// Division
export interface DivisionOut {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface DivisionCreateIn {
  name: string
  description?: string | null
}

export interface DivisionUpdateIn {
  name?: string | null
  description?: string | null
}

// Tasks
export interface TaskOut {
  id: string
  title: string
  description: string | null
  division_id: string | null
  category: string
  base_points: number
  is_repeatable: boolean
  is_penalty: boolean
  active: boolean
  created_at: string
}

export interface TaskCreateIn {
  title: string
  description?: string | null
  division_id?: string | null
  category: string
  base_points: number
  is_repeatable?: boolean
  is_penalty?: boolean
  active?: boolean
}

export interface TaskUpdateIn {
  title?: string | null
  description?: string | null
  division_id?: string | null
  category?: string | null
  base_points?: number | null
  is_repeatable?: boolean | null
  is_penalty?: boolean | null
  active?: boolean | null
}

// Point Events
export interface PointEventOut {
  id: string
  member_id: string
  task_id: string | null
  division_id?: string | null
  points_delta: number
  reason: string
  decision_reason: string | null
  approved_by: string | null
  status: ClaimStatus
  event_type: EventType
  academic_year: number
  decided_at: string | null
  created_at: string
  task_title?: string | null
  member_name?: string | null
  member_role?: Role | string | null
  approver_name?: string | null
}

export interface ClaimCreateIn {
  task_id: string
  reason?: string | null
  division_id?: string | null
  verification_code?: string | null
}

export interface AttendanceSessionOut {
  id: string
  task_id: string
  division_id: string | null
  title?: string | null
  code: string
  created_by: string | null
  expires_at: string
  is_active: boolean
  created_at: string
  task_title?: string | null
  division_name?: string | null
}

export interface AttendanceSessionCreateIn {
  task_id: string
  division_id?: string | null
  title?: string | null
  duration_minutes?: number
}

export interface CertificateOut {
  id: string
  cert_code: string
  member_id: string | null
  recipient_name: string
  recipient_email: string | null
  recipient_identity: string | null
  is_external: boolean
  custom_attributes?: Record<string, any> | null
  division_id: string | null
  division_name: string | null
  title: string
  description: string | null
  certificate_type: string
  academic_year: number
  issued_by_id: string | null
  issuer_name: string | null
  issued_at: string
  signature_hash: string
  drive_file_id: string | null
  drive_view_link: string | null
  is_revoked: boolean
  revoked_reason: string | null
  revoked_at: string | null
  member_name: string | null
  member_student_id: string | null
  member_department: string | null
}

export interface CertificatePublicVerify {
  cert_code: string
  title: string
  description: string | null
  certificate_type: string
  academic_year: number
  issued_at: string
  recipient_name: string
  recipient_student_id: string | null
  recipient_department: string | null
  is_external: boolean
  recipient_organization: string | null
  custom_attributes?: Record<string, any> | null
  division_name: string | null
  issuer_name: string | null
  drive_view_link: string | null
  is_valid: boolean
  is_revoked: boolean
  revoked_reason: string | null
  revoked_at: string | null
  signature_verified: boolean
  verify_url: string
}

export interface ExternalRecipientIn {
  name: string
  email?: string | null
  organization?: string | null
  custom_attributes?: Record<string, any>
}

export interface CertificateCreateIn {
  template_id?: string | null
  member_ids?: string[]
  external_recipients?: ExternalRecipientIn[]
  event_variables?: Record<string, any>
  division_id?: string | null
  title: string
  description?: string | null
  certificate_type?: string
  academic_year?: number | null
  send_email_notifications?: boolean
}

export interface AttendanceSessionStatus {
  status: "present" | "late" | "absent"
  delay_minutes: number | null
  claimed_at: string | null
  points_awarded: number
}

export interface AttendanceMatrixColumn {
  id: string
  date: string
  date_display: string
  task_title: string
  division_name: string
  is_active: boolean
}

export interface AttendanceMemberStats {
  attended_count: number
  total_sessions: number
  late_count: number
  on_time_count: number
  attendance_rate: number
}

export interface AttendanceMatrixRow {
  member_id: string
  full_name: string
  email: string
  profile_image_url: string | null
  division_id: string | null
  division_name: string
  role: Role | string
  stats: AttendanceMemberStats
  sessions: Record<string, AttendanceSessionStatus>
}

export interface AttendanceMatrixKPI {
  total_sessions: number
  total_members: number
  average_turnout_rate: number
  on_time_rate: number
  total_checkins: number
  total_late_checkins: number
}

export interface AttendanceMatrixOut {
  division_id: string | null
  days: number
  start_date: string
  end_date: string
  kpi: AttendanceMatrixKPI
  columns: AttendanceMatrixColumn[]
  rows: AttendanceMatrixRow[]
}



export interface OfficerAdjustmentIn {
  member_id: string
  event_type: EventType
  points_delta: number
  reason: string
  task_id?: string | null
  division_id?: string | null
}

export interface BatchOfficerEventCreateIn {
  member_ids: string[]
  event_type: EventType
  points_delta: number
  reason: string
  task_id?: string | null
  division_id?: string | null
}

export interface RejectIn {
  reason: string
}

export interface BulkApproveIn {
  event_ids: string[]
}

export interface BulkRejectIn {
  event_ids: string[]
  reason: string
}

export interface BulkResult {
  succeeded: string[]
  failed: { event_id?: string; member_id?: string; detail: string }[]
}

// Permissions & Delegations
export interface PermissionCatalogOut {
  key: string
  description: string
  scope_type: "club" | "division" | "task_category"
}

export interface MemberPermissionOut {
  id: string
  member_id: string
  permission_key: string
  scope_value: string | null
  granted_by: string
  is_enabled: boolean
  granted_at?: string
  created_at?: string
  updated_at: string
}

export interface MemberPermissionCreateIn {
  member_id: string
  permission_key: string
  scope_value?: string | null
}

export interface PermissionGrantHistoryOut {
  id: string
  member_permission_id: string | null
  member_id: string
  permission_key: string
  scope_value: string | null
  action: PermissionAction
  actor_id: string
  note: string | null
  created_at: string
  member_name?: string | null
  actor_name?: string | null
}

// Leaderboard
export interface LeaderboardItemOut {
  rank: number
  member_id: string
  full_name: string
  division_id: string | null
  division_name: string | null
  cycle_score: number
  display_score: number
  career_score: number
  badge: BadgeTier | null
}

export interface LeaderboardOut {
  academic_year: number
  score_cap: number
  items: LeaderboardItemOut[]
}

// Platform Settings
export interface PlatformSettingsOut {
  score_cap: number
  initial_buffer: number
  current_academic_year: number
  badge_tier_multipliers: {
    gold: number
    platinum: number
    diamond: number
  }
}

// Admin / Import / Reset / Login Failures
export interface ImportErrorRow {
  row: number
  email: string
  issue: string
}

export interface ImportUnmatchedDivision {
  row: number
  email: string
  division_name: string
}

export interface ImportResult {
  created: number
  updated: number
  errors: ImportErrorRow[]
  unmatched_divisions?: ImportUnmatchedDivision[]
  skipped?: number
}

export interface LoginFailureOut {
  id: string
  email: string
  google_id: string | null
  reason: string
  created_at: string
}

export interface AnnualResetPreview {
  current_academic_year: number
  next_academic_year: number
  member_count: number
  preview: {
    member_id: string
    full_name: string
    division_name: string | null
    final_score: number
    final_rank: number
    badges_earned: string | null
  }[]
}

export interface AnnualResetResult {
  closed_academic_year: number
  new_academic_year: number
  summaries_created: number
  events_archived: number
}

export interface AnnualSummaryOut {
  id: string
  member_id: string
  academic_year: number
  final_score: number
  final_rank: number
  badges_earned: string[]
}

/** Club workshop/event (distinct from point-event EventType). */
export interface ClubEventOut {
  id: string
  title: string
  slug: string
  description: string
  cover_image_url?: string | null
  luma_url?: string | null
  luma_event_id?: string | null
  event_type: string
  division_id?: string | null
  division_name?: string | null
  points_reward: number
  start_time: string
  end_time: string
  location_name: string
  certificate_template_id?: string | null
  is_published: boolean
  created_by?: string | null
  creator_name?: string | null
  created_at?: string
  updated_at?: string | null
}

export interface ClubEventCreateIn {
  title: string
  slug?: string | null
  description: string
  cover_image_url?: string | null
  luma_url?: string | null
  luma_event_id?: string | null
  event_type?: string
  division_id?: string | null
  points_reward?: number
  start_time: string
  end_time: string
  location_name?: string
  certificate_template_id?: string | null
  is_published?: boolean
}

export interface LumaAttendeePreview {
  row_index: number
  name: string
  email: string | null
  is_member: boolean
  member_id: string | null
  member_student_id: string | null
  member_division_name: string | null
  checked_in: boolean
  custom_attributes: Record<string, unknown>
}

export interface LumaPreviewOut {
  total_rows: number
  checked_in_rows: number
  detected_members: number
  detected_externals: number
  detected_columns: string[]
  mapped_columns: Record<string, string>
  attendees: LumaAttendeePreview[]
}

export interface LumaIngestExecuteAttendee {
  name: string
  email?: string | null
  is_member?: boolean
  member_id?: string | null
  custom_attributes?: Record<string, unknown>
}

export interface LumaIngestExecuteIn {
  certificate_title: string
  certificate_template_id?: string | null
  certificate_type?: string
  division_id?: string | null
  academic_year?: number | null
  award_points?: boolean
  points_reward?: number
  mint_certificates?: boolean
  attendees: LumaIngestExecuteAttendee[]
}

export interface LumaIngestExecuteOut {
  points_awarded_count: number
  certificates_minted_count: number
  members_awarded: string[]
  certificate_codes: string[]
}

