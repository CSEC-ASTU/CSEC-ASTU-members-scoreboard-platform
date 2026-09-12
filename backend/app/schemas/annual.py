from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


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
