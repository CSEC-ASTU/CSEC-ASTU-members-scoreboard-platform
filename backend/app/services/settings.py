from __future__ import annotations

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PlatformSetting


async def get_setting_value(db: AsyncSession, key: str) -> object:
    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        raise KeyError(key)
    return row.value


async def get_int_setting(db: AsyncSession, key: str) -> int:
    value = await get_setting_value(db, key)
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return int(value)
    # JSONB numeric or wrapped
    return int(value)  # type: ignore[arg-type]


async def get_current_academic_year(db: AsyncSession) -> int:
    return await get_int_setting(db, "current_academic_year")


async def get_score_cap(db: AsyncSession) -> int:
    return await get_int_setting(db, "score_cap")


async def get_initial_buffer(db: AsyncSession) -> int:
    return await get_int_setting(db, "initial_buffer")


async def get_badge_multipliers(db: AsyncSession) -> dict:
    value = await get_setting_value(db, "badge_tier_multipliers")
    if isinstance(value, dict):
        return value
    return {"gold": 1.0, "platinum": 1.5}


async def upsert_setting(db: AsyncSession, key: str, value: object) -> PlatformSetting:
    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        row = PlatformSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    await db.flush()
    return row


async def get_all_settings(db: AsyncSession) -> dict:
    return {
        "score_cap": await get_score_cap(db),
        "initial_buffer": await get_initial_buffer(db),
        "current_academic_year": await get_current_academic_year(db),
        "badge_tier_multipliers": await get_badge_multipliers(db),
    }


def badge_for_score(cycle_score: int, score_cap: int, multipliers: dict) -> str | None:
    if cycle_score < score_cap:
        return None
    platinum = float(multipliers.get("platinum", 1.5))
    if cycle_score >= int(score_cap * platinum):
        return "platinum"
    return "gold"


async def fetch_member_scores(db: AsyncSession, member_id) -> dict[str, int]:
    """Compute scores from ledger + annual summaries (same logic as member_scores view)."""
    year = await get_current_academic_year(db)
    cap = await get_score_cap(db)
    buffer = await get_initial_buffer(db)

    cycle_q = await db.execute(
        text(
            """
            SELECT COALESCE(SUM(points_delta), 0) AS cycle_points
            FROM point_events
            WHERE member_id = :member_id
              AND status = 'approved'
              AND academic_year = :year
            """
        ),
        {"member_id": str(member_id), "year": year},
    )
    cycle_points = int(cycle_q.scalar() or 0)
    cycle_score = buffer + cycle_points

    past_q = await db.execute(
        text(
            """
            SELECT COALESCE(SUM(final_score), 0)
            FROM annual_summaries
            WHERE member_id = :member_id
            """
        ),
        {"member_id": str(member_id)},
    )
    past = int(past_q.scalar() or 0)
    career = past + cycle_score
    display = min(cycle_score, cap)
    return {
        "cycle_score": cycle_score,
        "display_score": display,
        "career_score": career,
    }
