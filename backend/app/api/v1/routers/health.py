from fastapi import APIRouter
from sqlalchemy import text

from app.dependencies import DbSession
from app.schemas import HealthOut
from app.services.settings import get_current_academic_year

router = APIRouter()


@router.get("/health", response_model=HealthOut)
async def health(db: DbSession) -> HealthOut:
    try:
        await db.execute(text("SELECT 1"))
        year = await get_current_academic_year(db)
        return HealthOut(status="ok", database="up", academic_year=year)
    except Exception:
        return HealthOut(status="degraded", database="down", academic_year=None)
