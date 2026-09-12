from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import PointEventStatus, PointEventType


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


class BulkRejectRequest(BaseModel):
    event_ids: list[UUID] = Field(min_length=1)
    reason: str = Field(min_length=1)


class BulkResult(BaseModel):
    succeeded: list[UUID]
    failed: list[dict]
