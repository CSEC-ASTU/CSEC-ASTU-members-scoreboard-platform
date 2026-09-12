from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select, update
from sqlalchemy.orm import selectinload

from app.core.permissions import has_permission, is_club_wide_officer
from app.core.rate_limit import RateLimiter
from app.dependencies import DbSession, RequireUser
from app.models import Division, Member, Task
from app.models.attendance_session import AttendanceSession
from app.models.enums import MemberRole
from app.schemas import AttendanceSessionCreate, AttendanceSessionOut
from app.services.attendance_analytics import get_attendance_matrix

router = APIRouter()


def _check_session_authority(user, target_division_id: UUID | None) -> None:
    member: Member = user.member
    if member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} or is_club_wide_officer(member):
        return

    if target_division_id is None:
        if not has_permission(user.permissions, "approve_task"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only executive officers can generate club-wide attendance sessions.",
            )
        return

    if member.role == MemberRole.DIVISION_HEAD:
        if target_division_id != member.division_id and target_division_id != member.secondary_division_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Division Heads can only generate attendance codes for their own division.",
            )
        return

    if has_permission(user.permissions, "approve_task", division_id=target_division_id) or has_permission(
        user.permissions, "cbd_head", division_id=target_division_id
    ):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to generate attendance session codes.",
    )


@router.post("", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RateLimiter(times=6, seconds=300))])
async def create_attendance_session(
    db: DbSession,
    user: RequireUser,
    data: AttendanceSessionCreate,
) -> AttendanceSessionOut:
    task = await db.get(Task, data.task_id)
    if not task or not task.active:
        raise HTTPException(status_code=404, detail="Task not found or inactive")

    # If task has a division bound to it, target that division.
    # Otherwise use explicitly selected division_id (None for Club-wide).
    if task.division_id:
        target_div_id = task.division_id
    else:
        target_div_id = data.division_id

    _check_session_authority(user, target_div_id)

    # Flag 1 & 2: Rotating dynamic 6-digit code with time-bounded expiration
    # Deactivate prior active sessions for this specific task
    await db.execute(
        update(AttendanceSession)
        .where(
            AttendanceSession.task_id == task.id,
            AttendanceSession.is_active.is_(True),
        )
        .values(is_active=False)
    )

    # Cryptographically secure 6-digit numeric PIN
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(UTC) + timedelta(minutes=data.duration_minutes)

    session = AttendanceSession(
        task_id=task.id,
        division_id=target_div_id,
        title=data.title.strip() if data.title and data.title.strip() else None,
        code=code,
        created_by=user.member.id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Enrich metadata for output
    division_name = None
    if target_div_id:
        div = await db.get(Division, target_div_id)
        if div:
            division_name = div.name
    else:
        division_name = "Club-wide"

    out = AttendanceSessionOut.model_validate(session)
    out.task_title = session.title or task.title
    out.division_name = division_name
    return out


@router.get("/active", response_model=list[AttendanceSessionOut])
async def list_active_sessions(
    db: DbSession,
    user: RequireUser,
    division_id: UUID | None = None,
) -> list[AttendanceSessionOut]:
    now = datetime.now(UTC)
    q = (
        select(AttendanceSession)
        .options(selectinload(AttendanceSession.task), selectinload(AttendanceSession.division))
        .where(
            AttendanceSession.is_active.is_(True),
            AttendanceSession.expires_at > now,
        )
        .order_by(AttendanceSession.created_at.desc())
    )

    # Scoping for non-executive officers
    member: Member = user.member
    if not (member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} or is_club_wide_officer(member)):
        if member.role == MemberRole.DIVISION_HEAD:
            q = q.where(AttendanceSession.division_id == member.division_id)
        else:
            enrolled = {d for d in [member.division_id, member.secondary_division_id] if d is not None}
            if enrolled:
                q = q.where(AttendanceSession.division_id.in_(enrolled))
            else:
                q = q.where(AttendanceSession.division_id.is_(None))

    if division_id is not None:
        q = q.where(AttendanceSession.division_id == division_id)

    res = await db.execute(q)
    sessions = res.scalars().all()

    results: list[AttendanceSessionOut] = []
    for s in sessions:
        out = AttendanceSessionOut.model_validate(s)
        out.task_title = s.title or (s.task.title if s.task else None)
        out.division_name = s.division.name if s.division else "Club-wide"
        results.append(out)
    return results


@router.post("/{session_id}/end", response_model=AttendanceSessionOut)
async def end_attendance_session(
    session_id: UUID,
    db: DbSession,
    user: RequireUser,
) -> AttendanceSessionOut:
    session = await db.get(AttendanceSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    member: Member = user.member
    is_admin = member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} or is_club_wide_officer(member)
    is_creator = session.created_by == member.id
    is_div_head = member.role == MemberRole.DIVISION_HEAD and member.division_id == session.division_id

    if not (is_admin or is_creator or is_div_head):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to end this session.",
        )

    session.is_active = False
    await db.commit()
    await db.refresh(session)

    task = await db.get(Task, session.task_id)
    division_name = None
    if session.division_id:
        div = await db.get(Division, session.division_id)
        if div:
            division_name = div.name
    else:
        division_name = "Club-wide"

    out = AttendanceSessionOut.model_validate(session)
    out.task_title = session.title or (task.title if task else None)
    out.division_name = division_name
    return out


@router.get("/matrix")
async def get_matrix_data(
    db: DbSession,
    user: RequireUser,
    division_id: UUID | None = Query(None),
    days: int = Query(30, ge=1, le=180),
) -> dict:
    """Generate Notion-style attendance matrix and KPIs.

    - division_id=None queries Club-Wide sessions.
    - division_id=UUID queries sessions for that specific division.
    """
    effective_division_id = division_id

    return await get_attendance_matrix(
        db,
        division_id=effective_division_id,
        days=days,
    )

