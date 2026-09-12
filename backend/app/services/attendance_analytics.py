"""Attendance analytics and matrix aggregation service.

Generates Notion-style attendance matrices for Division Heads and Club Officers,
tracking member presence across sessions with a 15-minute late threshold
while preserving full point awards.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AttendanceSession, Division, Member, PointEvent, Task
from app.models.enums import PointEventStatus


async def get_attendance_matrix(
    db: AsyncSession,
    *,
    division_id: UUID | None = None,
    days: int = 30,
) -> dict[str, Any]:
    """Calculate the attendance matrix and summary stats for a division or club-wide.

    Rules:
    - On-Time: Check-in <= 15 minutes of session creation.
    - Late: Check-in > 15 minutes of session creation (receives full points, flagged as late).
    - Absent: No approved point event linked to the session.
    """
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=days)

    # 1. Fetch sessions in the date window
    session_stmt = (
        select(AttendanceSession)
        .options(selectinload(AttendanceSession.task), selectinload(AttendanceSession.division))
        .where(AttendanceSession.created_at >= cutoff)
        .order_by(AttendanceSession.created_at.asc())
    )
    if division_id:
        session_stmt = session_stmt.where(AttendanceSession.division_id == division_id)
    else:
        # "All Divisions" strictly isolates Club-Wide sessions
        session_stmt = session_stmt.where(AttendanceSession.division_id.is_(None))

    sessions = (await db.execute(session_stmt)).scalars().all()
    session_ids = [s.id for s in sessions]

    # 2. Fetch active members for the division (or club-wide)
    member_stmt = (
        select(Member)
        .options(selectinload(Member.division))
        .where(Member.is_active.is_(True))
        .order_by(Member.full_name.asc())
    )
    if division_id:
        member_stmt = member_stmt.where(
            (Member.division_id == division_id) | (Member.secondary_division_id == division_id)
        )

    members = (await db.execute(member_stmt)).scalars().all()

    # 3. Fetch point events linked to these sessions
    event_map: dict[tuple[UUID, UUID], PointEvent] = {}
    if session_ids:
        events_stmt = select(PointEvent).where(
            PointEvent.attendance_session_id.in_(session_ids),
            PointEvent.status == PointEventStatus.APPROVED,
        )
        events = (await db.execute(events_stmt)).scalars().all()
        for ev in events:
            if ev.attendance_session_id:
                event_map[(ev.member_id, ev.attendance_session_id)] = ev

    # 4. Build session columns metadata
    columns = [
        {
            "id": str(s.id),
            "date": s.created_at.isoformat(),
            "date_display": s.created_at.strftime("%b %d"),
            "task_title": s.title or (s.task.title if s.task else "Attendance Session"),
            "division_name": s.division.name if s.division else "Club-wide",
            "is_active": s.is_active,
        }
        for s in sessions
    ]

    total_sessions = len(sessions)
    total_possible_attendances = len(members) * total_sessions if total_sessions > 0 else 0
    total_actual_attendances = 0
    total_late_checkins = 0

    # 5. Build member rows with statuses
    rows = []
    for m in members:
        member_records = {}
        attended_count = 0
        late_count = 0

        for s in sessions:
            ev = event_map.get((m.id, s.id))
            if ev:
                attended_count += 1
                total_actual_attendances += 1
                # Calculate delay in minutes from session creation
                ev_time = ev.created_at if ev.created_at.tzinfo else ev.created_at.replace(tzinfo=UTC)
                s_time = s.created_at if s.created_at.tzinfo else s.created_at.replace(tzinfo=UTC)
                delay_delta = ev_time - s_time
                delay_minutes = max(0, int(delay_delta.total_seconds() // 60))

                is_late = delay_delta > timedelta(minutes=15)
                if is_late:
                    late_count += 1
                    total_late_checkins += 1

                member_records[str(s.id)] = {
                    "status": "late" if is_late else "present",
                    "delay_minutes": delay_minutes,
                    "claimed_at": ev_time.isoformat(),
                    "points_awarded": ev.points_delta,
                }
            else:
                member_records[str(s.id)] = {
                    "status": "absent",
                    "delay_minutes": None,
                    "claimed_at": None,
                    "points_awarded": 0,
                }

        turnout_rate = round((attended_count / total_sessions * 100), 1) if total_sessions > 0 else 0.0

        rows.append(
            {
                "member_id": str(m.id),
                "full_name": m.full_name,
                "email": m.email,
                "profile_image_url": m.profile_image_url,
                "division_id": str(m.division_id) if m.division_id else None,
                "division_name": m.division.name if m.division else "Unassigned",
                "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                "stats": {
                    "attended_count": attended_count,
                    "total_sessions": total_sessions,
                    "late_count": late_count,
                    "on_time_count": attended_count - late_count,
                    "attendance_rate": turnout_rate,
                },
                "sessions": member_records,
            }
        )

    # Sort rows by turnout rate descending, then name ascending
    rows.sort(key=lambda r: (-r["stats"]["attendance_rate"], r["full_name"]))

    overall_turnout_rate = (
        round((total_actual_attendances / total_possible_attendances * 100), 1)
        if total_possible_attendances > 0
        else 0.0
    )
    on_time_rate = (
        round(((total_actual_attendances - total_late_checkins) / total_actual_attendances * 100), 1)
        if total_actual_attendances > 0
        else 0.0
    )

    return {
        "division_id": str(division_id) if division_id else None,
        "days": days,
        "start_date": cutoff.isoformat(),
        "end_date": now.isoformat(),
        "kpi": {
            "total_sessions": total_sessions,
            "total_members": len(members),
            "average_turnout_rate": overall_turnout_rate,
            "on_time_rate": on_time_rate,
            "total_checkins": total_actual_attendances,
            "total_late_checkins": total_late_checkins,
        },
        "columns": columns,
        "rows": rows,
    }
