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


async def fetch_batch_member_scores(db: AsyncSession, member_ids: list[UUID]) -> dict[UUID, dict[str, int]]:
    """Compute scores for multiple members in batch, eliminating N+1 query storms."""
    if not member_ids:
        return {}

    year = await get_current_academic_year(db)
    cap = await get_score_cap(db)
    buffer = await get_initial_buffer(db)

    str_ids = [str(m) for m in member_ids]

    cycle_stmt = text(
        """
        SELECT member_id, COALESCE(SUM(points_delta), 0) AS cycle_points
        FROM point_events
        WHERE member_id = ANY(:member_ids)
          AND status = 'approved'
          AND academic_year = :year
        GROUP BY member_id
        """
    )
    cycle_res = await db.execute(cycle_stmt, {"member_ids": str_ids, "year": year})
    cycle_map = {str(row.member_id): int(row.cycle_points) for row in cycle_res}

    past_stmt = text(
        """
        SELECT member_id, 
               COALESCE(SUM(final_score), 0) AS past_total,
               COUNT(*) AS past_years_count
        FROM annual_summaries
        WHERE member_id = ANY(:member_ids)
        GROUP BY member_id
        """
    )
    past_res = await db.execute(past_stmt, {"member_ids": str_ids})
    past_map = {str(row.member_id): (int(row.past_total), int(row.past_years_count)) for row in past_res}

    results: dict[UUID, dict[str, int]] = {}
    for mid in member_ids:
        mid_str = str(mid)
        cycle_pts = cycle_map.get(mid_str, 0)
        cycle_score = buffer + cycle_pts
        display_score = min(cycle_score, cap)

        past_total, past_count = past_map.get(mid_str, (0, 0))
        past_net_points = max(0, past_total - (past_count * buffer))
        career_score = buffer + past_net_points + cycle_pts

        results[mid] = {
            "cycle_score": cycle_score,
            "display_score": display_score,
            "career_score": career_score,
        }

    return results


async def fetch_member_scores(db: AsyncSession, member_id) -> dict[str, int]:
    """Compute scores for a single member using batch engine."""
    res = await fetch_batch_member_scores(db, [member_id])
    return res.get(member_id, {"cycle_score": 0, "display_score": 0, "career_score": 0})
