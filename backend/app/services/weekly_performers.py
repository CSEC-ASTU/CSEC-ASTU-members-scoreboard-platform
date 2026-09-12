"""Weekly top performers aggregation service.

Calculates the highest point earners across the entire club and within
each division for a given rolling window (e.g. 7 days / weekly cycle),
and generates Telegram-formatted digest messages for administrators.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import html
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Division, Member, PointEvent
from app.models.enums import PointEventStatus


async def get_weekly_top_performers(
    db: AsyncSession,
    *,
    days: int = 7,
) -> dict[str, Any]:
    """Extract top point earners for the last `days` days.

    Returns:
        {
            "start_date": datetime,
            "end_date": datetime,
            "club_wide_top": list[dict],      # Top 3 overall
            "division_top": dict[str, dict],   # Top 1 per division
        }
    """
    now = datetime.now(UTC)
    start_date = now - timedelta(days=days)

    # Query approved points gained within the time window, grouped by member
    stmt = (
        select(
            Member.id.label("member_id"),
            Member.full_name,
            Member.telegram_username,
            Member.division_id,
            Division.name.label("division_name"),
            func.coalesce(func.sum(PointEvent.points_delta), 0).label("weekly_points"),
        )
        .join(PointEvent, PointEvent.member_id == Member.id)
        .outerjoin(Division, Member.division_id == Division.id)
        .where(
            PointEvent.status == PointEventStatus.APPROVED,
            PointEvent.created_at >= start_date,
            Member.is_active.is_(True),
        )
        .group_by(
            Member.id,
            Member.full_name,
            Member.telegram_username,
            Member.division_id,
            Division.name,
        )
        .having(func.sum(PointEvent.points_delta) > 0)
        .order_by(func.sum(PointEvent.points_delta).desc())
    )

    rows = (await db.execute(stmt)).all()

    ranked_members = [
        {
            "member_id": str(r.member_id),
            "full_name": r.full_name,
            "telegram_username": r.telegram_username,
            "division_id": str(r.division_id) if r.division_id else None,
            "division_name": r.division_name or "General / Unassigned",
            "weekly_points": int(r.weekly_points),
        }
        for r in rows
    ]

    # Club-wide top 3 performers
    club_wide_top = ranked_members[:3]

    # Best performer per division (first seen in descending order)
    division_top: dict[str, dict] = {}
    for m in ranked_members:
        div = m["division_name"]
        if div not in division_top:
            division_top[div] = m

    return {
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_active_earners": len(ranked_members),
        "club_wide_top": club_wide_top,
        "division_top": division_top,
    }


def format_weekly_digest_message(data: dict[str, Any]) -> str:
    """Format the weekly performance data into a rich Telegram HTML message."""
    club_top = data.get("club_wide_top", [])
    div_top = data.get("division_top", {})

    now_str = datetime.now(UTC).strftime("%b %d")

    if not club_top:
        return (
            "📊 <b>CSEC ASTU — Weekly Performance Digest</b>\n\n"
            f"📅 <i>Week ending {now_str}</i>\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            "No points were recorded or approved this week.\n"
            "━━━━━━━━━━━━━━━━━━━━━"
        )

    lines = [
        "🏆 <b>CSEC ASTU — Weekly Top Performers Digest</b>",
        f"📅 <i>Week ending {now_str}</i>",
        "━━━━━━━━━━━━━━━━━━━━━",
    ]

    # Club-wide MVP
    mvp = club_top[0]
    mvp_name = html.escape(mvp["full_name"])
    mvp_div = html.escape(mvp["division_name"])
    lines.append("🌟 <b>Club-Wide MVP of the Week:</b>")
    lines.append(f"🥇 <b>{mvp_name}</b> (+{mvp['weekly_points']} pts) — <i>{mvp_div}</i>\n")

    # If there are runners-up in club-wide top 3
    if len(club_top) > 1:
        medals = ["🥈", "🥉"]
        for idx, runner in enumerate(club_top[1:3]):
            r_name = html.escape(runner["full_name"])
            r_div = html.escape(runner["division_name"])
            lines.append(f"{medals[idx]} {r_name} (+{runner['weekly_points']} pts) — <i>{r_div}</i>")
        lines.append("")

    # Top Performer per Division
    lines.append("🎖️ <b>Top Performers by Division:</b>")
    for div_name, leader in sorted(div_top.items()):
        l_name = html.escape(leader["full_name"])
        lines.append(f"• <b>{html.escape(div_name)}:</b> {l_name} (+{leader['weekly_points']} pts)")

    lines.append("━━━━━━━━━━━━━━━━━━━━━")
    lines.append("<i>Keep building, hacking, and earning points! ⚡</i>")

    return "\n".join(lines)
