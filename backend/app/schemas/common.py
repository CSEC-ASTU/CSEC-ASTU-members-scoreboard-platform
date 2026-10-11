from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class MessageOut(BaseModel):
    detail: str


class HealthOut(BaseModel):
    status: str
    database: str
    academic_year: int | None = None
    # Startup migration check (see app.db_migrations); None when it hasn't run.
    schema_ok: bool | None = None
    schema_revision: str | None = None
    schema_head: str | None = None
    schema_repaired: list[str] = []
    schema_issues: list[str] = []
