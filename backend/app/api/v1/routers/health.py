from fastapi import APIRouter
from sqlalchemy import text

from app.db_migrations import schema_status
from app.dependencies import DbSession
from app.schemas import HealthOut
from app.services.settings import get_current_academic_year

router = APIRouter()


def _schema_fields() -> dict:
    if not schema_status.checked:
        return {}
    return {
        "schema_ok": schema_status.ok,
        "schema_revision": schema_status.revision,
        "schema_head": schema_status.head,
        "schema_repaired": schema_status.repaired,
        "schema_issues": schema_status.remaining_drift
        + ([f"upgrade error: {schema_status.upgrade_error}"] if schema_status.upgrade_error else []),
    }


@router.get("/health", response_model=HealthOut)
async def health(db: DbSession) -> HealthOut:
    try:
        await db.execute(text("SELECT 1"))
        year = await get_current_academic_year(db)
        return HealthOut(status="ok", database="up", academic_year=year, **_schema_fields())
    except Exception:
        return HealthOut(status="degraded", database="down", academic_year=None, **_schema_fields())
