from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AttendanceSessionCreate(BaseModel):
    task_id: UUID
    division_id: UUID | None = None
    title: str | None = None
    duration_minutes: int = Field(default=90, ge=15, le=360)


class AttendanceSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    division_id: UUID | None
    title: str | None = None
    code: str
    created_by: UUID | None
    expires_at: datetime
    is_active: bool
    created_at: datetime
    task_title: str | None = None
    division_name: str | None = None
