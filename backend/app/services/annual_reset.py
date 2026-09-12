"""Annual reset: snapshot cycle scores into annual_summaries and advance year."""

from __future__ import annotations

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnnualSummary, Member
from app.services.settings import (
    badge_for_score,
    get_badge_multipliers,
    get_current_academic_year,
    get_initial_buffer,
    get_score_cap,
    upsert_setting,
)


async def preview_annual_reset(db: AsyncSession) -> dict:
    year = await get_current_academic_year(db)
    cap = await get_score_cap(db)
    buffer = await get_initial_buffer(db)
    multipliers = await get_badge_multipliers(db)

    rows = await db.execute(
        text(
            """
            SELECT m.id, m.full_name,
                   :buffer + COALESCE(SUM(pe.points_delta), 0) AS cycle_score
            FROM members m
            LEFT JOIN point_events pe
              ON pe.member_id = m.id
             AND pe.status = 'approved'
             AND pe.academic_year = :year
            WHERE m.is_active = true AND m.google_id IS NOT NULL
            GROUP BY m.id, m.full_name
            ORDER BY cycle_score DESC, m.full_name
            """
        ),
        {"year": year, "buffer": buffer},
    )
    members = []
    current_rank = 1
    last_score: int | None = None
    for idx, row in enumerate(rows, start=1):
        cycle = int(row.cycle_score)
        if cycle != last_score:
            current_rank = idx
            last_score = cycle
        members.append(
            {
                "rank": current_rank,
                "member_id": str(row.id),
                "full_name": row.full_name,
                "final_score": cycle,
                "badge": badge_for_score(cycle, cap, multipliers),
            }
        )

    return {
        "academic_year": year,
        "members_to_snapshot": len(members),
        "next_academic_year": year + 1,
        "sample": members[:10],
    }


async def execute_annual_reset(db: AsyncSession) -> dict:
    preview = await preview_annual_reset(db)
    year = preview["academic_year"]
    cap = await get_score_cap(db)
    multipliers = await get_badge_multipliers(db)
    buffer = await get_initial_buffer(db)

    # Full ranked list
    rows = await db.execute(
        text(
            """
            SELECT m.id,
                   :buffer + COALESCE(SUM(pe.points_delta), 0) AS cycle_score
            FROM members m
            LEFT JOIN point_events pe
              ON pe.member_id = m.id
             AND pe.status = 'approved'
             AND pe.academic_year = :year
            WHERE m.is_active = true AND m.google_id IS NOT NULL
            GROUP BY m.id
            ORDER BY cycle_score DESC, m.id ASC
            """
        ),
        {"year": year, "buffer": buffer},
    )

    written = 0
    current_rank = 1
    last_score = None
    for idx, row in enumerate(rows, start=1):
        cycle = int(row.cycle_score)
        if cycle != last_score:
            current_rank = idx
            last_score = cycle

        badge = badge_for_score(cycle, cap, multipliers)
        # Upsert-safe: skip if already snapshotted
        existing = await db.execute(
            select(AnnualSummary).where(
                AnnualSummary.member_id == row.id,
                AnnualSummary.academic_year == year,
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(
            AnnualSummary(
                member_id=row.id,
                academic_year=year,
                final_score=cycle,
                final_rank=current_rank,
                badges_earned=[badge] if badge else [],
            )
        )
        written += 1

    next_year = year + 1
    await upsert_setting(db, "current_academic_year", next_year)
    await db.flush()

    return {
        "academic_year": year,
        "snapshots_written": written,
        "next_academic_year": next_year,
    }
