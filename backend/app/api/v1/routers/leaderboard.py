from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.dependencies import DbSession, RequireUser
from app.schemas import LeaderboardItem, LeaderboardOut
from app.services.settings import (
    badge_for_score,
    get_badge_multipliers,
    get_current_academic_year,
    get_initial_buffer,
    get_score_cap,
)

router = APIRouter()


@router.get("", response_model=LeaderboardOut)
async def leaderboard(
    db: DbSession,
    user: RequireUser,
    division_id: UUID | None = None,
) -> LeaderboardOut:
    year = await get_current_academic_year(db)
    cap = await get_score_cap(db)
    buffer = await get_initial_buffer(db)
    multipliers = await get_badge_multipliers(db)

    params: dict = {"year": year, "buffer": buffer, "cap": cap}
    division_clause = ""
    if division_id is not None:
        division_clause = "AND (m.division_id = :division_id OR m.secondary_division_id = :division_id)"
        params["division_id"] = str(division_id)

    rows = await db.execute(
        text(
            f"""
            SELECT m.id AS member_id, m.full_name, m.division_id,
                   :buffer + COALESCE(SUM(pe.points_delta), 0) AS cycle_score,
                   LEAST(:buffer + COALESCE(SUM(pe.points_delta), 0), :cap) AS display_score
            FROM members m
            LEFT JOIN point_events pe
              ON pe.member_id = m.id
             AND pe.status = 'approved'
             AND pe.academic_year = :year
            WHERE m.is_active = true AND m.google_id IS NOT NULL
            {division_clause}
            GROUP BY m.id, m.full_name, m.division_id
            ORDER BY display_score DESC, cycle_score DESC, m.full_name
            """
        ),
        params,
    )

    # Career = past annual finals + current cycle
    career_rows = await db.execute(
        text(
            """
            SELECT member_id, COALESCE(SUM(final_score), 0) AS past
            FROM annual_summaries
            GROUP BY member_id
            """
        )
    )
    past_map = {str(r.member_id): int(r.past) for r in career_rows}

    items: list[LeaderboardItem] = []
    current_rank = 1
    last_score_key: tuple[int, int] | None = None

    for idx, row in enumerate(rows, start=1):
        cycle = int(row.cycle_score)
        display = int(row.display_score)
        score_key = (display, cycle)

        if score_key != last_score_key:
            current_rank = idx
            last_score_key = score_key

        past = past_map.get(str(row.member_id), 0)
        items.append(
            LeaderboardItem(
                rank=current_rank,
                member_id=row.member_id,
                full_name=row.full_name,
                division_id=row.division_id,
                display_score=display,
                career_score=past + cycle,
                badge=badge_for_score(cycle, cap, multipliers),
            )
        )
    return LeaderboardOut(academic_year=year, score_cap=cap, items=items)


@router.get("/history", response_model=LeaderboardOut)
async def leaderboard_history(
    db: DbSession,
    user: RequireUser,
    academic_year: int,
    division_id: UUID | None = None,
) -> LeaderboardOut:
    cap = await get_score_cap(db)
    params: dict = {"year": academic_year}
    division_clause = ""
    if division_id is not None:
        division_clause = "AND m.division_id = :division_id"
        params["division_id"] = str(division_id)

    rows = await db.execute(
        text(
            f"""
            SELECT a.member_id, m.full_name, m.division_id,
                   a.final_score, a.final_rank, a.badges_earned
            FROM annual_summaries a
            JOIN members m ON m.id = a.member_id
            WHERE a.academic_year = :year
            {division_clause}
            ORDER BY a.final_rank
            """
        ),
        params,
    )
    items = []
    for row in rows:
        badges = row.badges_earned or []
        items.append(
            LeaderboardItem(
                rank=int(row.final_rank),
                member_id=row.member_id,
                full_name=row.full_name,
                division_id=row.division_id,
                display_score=int(row.final_score),
                career_score=int(row.final_score),
                badge=badges[0] if badges else None,
            )
        )
    if not items:
        raise HTTPException(status_code=404, detail="No summaries for that year")
    return LeaderboardOut(academic_year=academic_year, score_cap=cap, items=items)
