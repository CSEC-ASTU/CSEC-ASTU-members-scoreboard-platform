from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


def points_sign_error(base_points: int, is_penalty: bool) -> str | None:
    """Claims add base_points to the member's score, so the sign must match the task kind."""
    if is_penalty and base_points >= 0:
        return "Penalty tasks must have negative points"
    if not is_penalty and base_points <= 0:
        return "Points must be greater than 0 (use a penalty task or a warning to deduct points)"
    return None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    division_id: UUID | None = None
    category: str = Field(min_length=1, max_length=100)
    base_points: int
    is_repeatable: bool = True
    is_penalty: bool = False
    active: bool = True

    @model_validator(mode="after")
    def check_points_sign(self) -> "TaskCreate":
        error = points_sign_error(self.base_points, self.is_penalty)
        if error:
            raise ValueError(error)
        return self


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    division_id: UUID | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    base_points: int | None = None
    is_repeatable: bool | None = None
    is_penalty: bool | None = None
    active: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    division_id: UUID | None
    category: str
    base_points: int
    is_repeatable: bool
    is_penalty: bool
    active: bool
    created_at: datetime
    updated_at: datetime
