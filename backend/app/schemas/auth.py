from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.enums import MemberRole


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
    badge: str | None = None
    permissions: list[str]


class TelegramConnectOut(BaseModel):
    token: str
    link: str | None = None
