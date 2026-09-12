from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    division_id: UUID | None = None
    category: str = Field(min_length=1, max_length=100)
    base_points: int
    is_repeatable: bool = True
    is_penalty: bool = False
    active: bool = True


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
