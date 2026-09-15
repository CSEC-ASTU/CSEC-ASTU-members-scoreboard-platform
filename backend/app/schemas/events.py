from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    slug: str | None = Field(default=None, max_length=255)
    description: str = Field(min_length=3)
    cover_image_url: str | None = Field(default=None, max_length=512)
    luma_url: str | None = Field(default=None, max_length=512)
    luma_event_id: str | None = Field(default=None, max_length=128)
    event_type: str = Field(default="external", max_length=32)
    division_id: UUID | None = None
    points_reward: int = Field(default=20, ge=0, le=500)
    start_time: datetime
    end_time: datetime
    location_name: str = Field(default="ASTU Main Campus", max_length=255)
    certificate_template_id: str | None = Field(default=None, max_length=128)
    is_published: bool = True


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    slug: str | None = Field(default=None, max_length=255)
    description: str | None = None
    cover_image_url: str | None = None
    luma_url: str | None = None
    luma_event_id: str | None = None
    event_type: str | None = None
    division_id: UUID | None = None
    points_reward: int | None = Field(default=None, ge=0, le=500)
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = None
    certificate_template_id: str | None = None
    is_published: bool | None = None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    division_name: str | None = None
    created_by: UUID | None = None
    creator_name: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


class LumaCSVPreviewRequest(BaseModel):
    csv_text: str = Field(min_length=10)
    division_id: UUID | None = None


class LumaAttendeePreview(BaseModel):
    row_index: int
    name: str
    email: str | None = None
    is_member: bool = False
    member_id: UUID | None = None
    member_student_id: str | None = None
    member_division_name: str | None = None
    checked_in: bool = True
    custom_attributes: dict[str, Any] = Field(default_factory=dict)


class LumaPreviewResponse(BaseModel):
    total_rows: int
    checked_in_rows: int
    detected_members: int
    detected_externals: int
    detected_columns: list[str]
    mapped_columns: dict[str, str]
    attendees: list[LumaAttendeePreview]


class LumaIngestExecuteAttendee(BaseModel):
    name: str
    email: str | None = None
    is_member: bool = False
    member_id: UUID | None = None
    custom_attributes: dict[str, Any] = Field(default_factory=dict)


class LumaIngestExecuteRequest(BaseModel):
    certificate_title: str = Field(min_length=3, max_length=255)
    certificate_template_id: str | None = None
    certificate_type: str = Field(default="workshop", max_length=64)
    division_id: UUID | None = None
    academic_year: int | None = None
    award_points: bool = True
    points_reward: int = Field(default=20, ge=0, le=500)
    mint_certificates: bool = True
    attendees: list[LumaIngestExecuteAttendee] = Field(min_length=1)


class LumaIngestExecuteResponse(BaseModel):
    points_awarded_count: int
    certificates_minted_count: int
    members_awarded: list[str]
    certificate_codes: list[str]
