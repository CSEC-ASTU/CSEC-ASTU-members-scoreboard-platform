from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import MemberRole, PermissionScopeType, PointEventStatus, PointEventType

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class MessageOut(BaseModel):
    detail: str


# ---- Auth / Me ----


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr
    profile_image_url: str | None
    division_id: UUID | None
    division_name: str | None = None
    secondary_division_id: UUID | None = None
    secondary_division_name: str | None = None
    role: MemberRole
    department: str | None
    joining_year: int | None
    student_id: str | None = None
    phone_number: str | None = None
    github_url: str | None = None
    telegram_username: str | None = None
    telegram_connected: bool = False
    onboarded: bool
    cycle_score: int
    display_score: int
    career_score: int
    permissions: list[str]


class TelegramConnectOut(BaseModel):
    token: str
    link: str | None = None


# ---- Members ----


class MemberListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr
    profile_image_url: str | None
    division_id: UUID | None
    secondary_division_id: UUID | None = None
    role: MemberRole
    department: str | None
    joining_year: int | None
    student_id: str | None = None
    phone_number: str | None = None
    github_url: str | None = None
    telegram_username: str | None = None
    is_active: bool
    cycle_score: int | None = None
    display_score: int | None = None
    career_score: int | None = None


class MemberDetail(MemberListItem):
    first_login_at: datetime | None
    joined_at: datetime
    google_claimed: bool = False


class MemberSelfUpdate(BaseModel):
    department: str | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone_number: str | None = None
    github_url: str | None = None
    telegram_username: str | None = None


class MemberAdminUpdate(BaseModel):
    role: MemberRole | None = None
    division_id: UUID | None = None
    secondary_division_id: UUID | None = None
    department: str | None = None
    student_id: str | None = None
    phone_number: str | None = None
    github_url: str | None = None
    telegram_username: str | None = None


class LayoffRequest(BaseModel):
    reason: str = Field(min_length=1)


class ImportErrorRow(BaseModel):
    row: int
    email: str
    issue: str


class ImportUnmatchedDivision(BaseModel):
    row: int
    email: str
    division_name: str


class ImportResult(BaseModel):
    created: int
    updated: int
    errors: list[ImportErrorRow]
    unmatched_divisions: list[ImportUnmatchedDivision]


class AchievementCardOut(BaseModel):
    full_name: str
    joining_year: int | None
    division_id: UUID | None
    division_name: str | None
    secondary_division_id: UUID | None = None
    secondary_division_name: str | None = None
    career_score: int
    cycle_score: int
    display_score: int
    badges: list[str]
    profile_image_url: str | None


# ---- Divisions ----


class DivisionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class DivisionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class DivisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


# ---- Leaderboard ----


class LeaderboardItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    member_id: UUID
    full_name: str
    division_id: UUID | None
    division_name: str | None
    cycle_score: int
    display_score: int
    career_score: int
    badge: str | None


class LeaderboardOut(BaseModel):
    items: list[LeaderboardItemOut]
    score_cap: int
    current_academic_year: int
    cycle_mode: str = "open"


# ---- Tasks ----


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    division_id: UUID | None = None
    category: str = Field(min_length=1, max_length=100)
    base_points: int
    is_repeatable: bool = True
    is_penalty: bool = False
    active: bool = True


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    division_id: UUID | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    base_points: int | None = None
    is_repeatable: bool | None = None
    is_penalty: bool | None = None
    active: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    division_id: UUID | None
    category: str
    base_points: int
    is_repeatable: bool
    is_penalty: bool
    active: bool
    created_at: datetime
    updated_at: datetime


# ---- Point events ----


class ClaimCreate(BaseModel):
    task_id: UUID
    reason: str | None = None
    division_id: UUID | None = None
    verification_code: str | None = None


class OfficerPointEventCreate(BaseModel):
    member_id: UUID
    event_type: PointEventType
    points_delta: int
    reason: str = Field(min_length=1)
    task_id: UUID | None = None
    division_id: UUID | None = None


class BatchOfficerEventCreate(BaseModel):
    member_ids: list[UUID] = Field(min_length=1)
    event_type: PointEventType
    points_delta: int
    reason: str = Field(min_length=1)
    task_id: UUID | None = None
    division_id: UUID | None = None


class PointEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    task_id: UUID | None
    division_id: UUID | None = None
    attendance_session_id: UUID | None = None
    event_type: PointEventType
    points_delta: int
    reason: str
    status: PointEventStatus
    approved_by: UUID | None
    academic_year: int
    created_at: datetime
    decided_at: datetime | None
    decision_reason: str | None = None
    task_title: str | None = None
    member_name: str | None = None
    approver_name: str | None = None


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1)


class BulkApproveRequest(BaseModel):
    event_ids: list[UUID] = Field(min_length=1)


# ---- Attendance Sessions ----


class AttendanceSessionCreate(BaseModel):
    task_id: UUID
    division_id: UUID | None = None
    duration_minutes: int = Field(default=90, ge=15, le=360)


class AttendanceSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    division_id: UUID | None
    code: str
    created_by: UUID | None
    expires_at: datetime
    is_active: bool
    created_at: datetime
    task_title: str | None = None
    division_name: str | None = None


class BulkRejectRequest(BaseModel):
    event_ids: list[UUID] = Field(min_length=1)
    reason: str = Field(min_length=1)


class BulkResult(BaseModel):
    succeeded: list[UUID]
    failed: list[dict]


# ---- Permissions ----


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    description: str
    scope_type: PermissionScopeType


class MemberPermissionCreate(BaseModel):
    member_id: UUID
    permission_key: str
    scope_value: str | None = None


class MemberPermissionUpdate(BaseModel):
    is_enabled: bool


class MemberPermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    permission_key: str
    scope_value: str | None
    granted_by: UUID
    granted_at: datetime
    is_enabled: bool
    updated_at: datetime


# ---- Annual / settings ----


class AnnualSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    academic_year: int
    final_score: int
    final_rank: int
    badges_earned: list
    created_at: datetime


class AnnualResetPreview(BaseModel):
    academic_year: int
    members_to_snapshot: int
    next_academic_year: int
    sample: list[dict]


class AnnualResetResult(BaseModel):
    academic_year: int
    snapshots_written: int
    next_academic_year: int


class SettingsOut(BaseModel):
    score_cap: int
    initial_buffer: int
    current_academic_year: int
    badge_tier_multipliers: dict


class SettingsUpdate(BaseModel):
    score_cap: int | None = None
    initial_buffer: int | None = None
    current_academic_year: int | None = None
    badge_tier_multipliers: dict | None = None


class HealthOut(BaseModel):
    status: str
    database: str
    academic_year: int | None = None


# ---- Leaderboard ----


class LeaderboardItem(BaseModel):
    rank: int
    member_id: UUID
    full_name: str
    division_id: UUID | None = None
    display_score: int
    career_score: int
    badge: str | None = None


class LeaderboardOut(BaseModel):
    academic_year: int
    score_cap: int
    items: list[LeaderboardItem]

