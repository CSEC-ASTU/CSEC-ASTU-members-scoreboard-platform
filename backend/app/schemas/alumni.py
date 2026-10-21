from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlumniBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    photo_url: str | None = Field(default=None, max_length=512)
    current_role: str = Field(min_length=2, max_length=255)
    division_id: UUID | None = None
    division_name: str | None = Field(default=None, max_length=128)
    graduation_year: int | None = Field(default=None, ge=2000, le=2100)
    description: str = Field(min_length=3)
    profile_url: str | None = Field(default=None, max_length=512)
    is_featured: bool = True
    is_active: bool = True
    sort_order: int = 0


class AlumniCreate(AlumniBase):
    pass


class AlumniUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    photo_url: str | None = None
    current_role: str | None = Field(default=None, min_length=2, max_length=255)
    division_id: UUID | None = None
    division_name: str | None = None
    graduation_year: int | None = Field(default=None, ge=2000, le=2100)
    description: str | None = None
    profile_url: str | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class AlumniOut(AlumniBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime | None = None
