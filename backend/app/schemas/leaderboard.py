from uuid import UUID
from pydantic import BaseModel, ConfigDict


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
    cycle_mode: str = "open"
