from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MemberRole, ProfileChangeStatus
from app.schemas.members import MemberDetail


class ProfileChangeRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    member_full_name: str | None = None
    member_email: str | None = None
    member_role: MemberRole | None = None
    member_division_id: UUID | None = None
    status: ProfileChangeStatus
    reason: str
    proposed_changes: dict
    current_snapshot: dict
    proposed_profile_image_url: str | None = None
    current_profile_image_url: str | None = None
    remove_profile_image: bool = False
    reviewed_by: UUID | None = None
    reviewer_full_name: str | None = None
    reviewed_at: datetime | None = None
    decision_reason: str | None = None
    created_at: datetime


class ProfileChangeRejectIn(BaseModel):
    decision_reason: str = Field(min_length=1, max_length=1000)


class ProfileSelfUpdateResult(BaseModel):
    """Returned from PATCH /members/me when changes may be split immediate vs pending."""

    member: MemberDetail
    pending_request: ProfileChangeRequestOut | None = None
    message: str


class ProfilePictureRequestResult(BaseModel):
    pending_request: ProfileChangeRequestOut
    message: str


class ProfilePictureRemoveIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
