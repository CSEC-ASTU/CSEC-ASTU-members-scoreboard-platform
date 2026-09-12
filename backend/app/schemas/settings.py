from pydantic import BaseModel


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
