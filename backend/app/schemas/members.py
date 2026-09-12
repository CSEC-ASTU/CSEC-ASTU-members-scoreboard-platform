from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import MemberRole


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
