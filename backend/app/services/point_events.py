"""Point event create / approve / reject logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.core.permissions import can_approve_submitter, has_permission, is_club_wide_officer
from app.models import Member, PointEvent, Task
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.services.settings import get_current_academic_year


async def create_claim(
    db: AsyncSession,
    *,
    member: Member,
    task_id: UUID,
    reason: str | None,
    settings: Settings,
    division_id: UUID | None = None,
    verification_code: str | None = None,
) -> PointEvent:
    from app.models.attendance_session import AttendanceSession

    task = await db.get(Task, task_id)
    if task is None or not task.active:
        raise HTTPException(status_code=404, detail="Task not found")

    member_divs = {d for d in [member.division_id, member.secondary_division_id] if d is not None}

    # Division scoping rule
    if task.division_id is not None:
        if task.division_id not in member_divs:
            raise HTTPException(
                status_code=403,
                detail="You must be an active member of this division to claim this task.",
            )
        event_division_id = task.division_id
    else:
        # Club-wide task: attribute to chosen division if valid, else primary division
        if division_id and division_id in member_divs:
            event_division_id = division_id
        else:
            event_division_id = member.division_id or member.secondary_division_id

    # Duplicate Claim Prevention Engine for non-session tasks
    # (Session attendance duplicate prevention is enforced via attendance_session_id below)
    if task.category != "division_session":
        # 1. Pending Claim Guard: prevent duplicate pending claims for the same task
        existing_pending = await db.scalar(
            select(PointEvent).where(
                PointEvent.member_id == member.id,
                PointEvent.task_id == task.id,
                PointEvent.status == PointEventStatus.PENDING,
            )
        )
        if existing_pending:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending claim for this task awaiting officer review.",
            )

        # 2. Non-Repeatable Task Guard: prevent claiming non-repeatable tasks multiple times
        if not task.is_repeatable:
            existing_approved = await db.scalar(
                select(PointEvent).where(
                    PointEvent.member_id == member.id,
                    PointEvent.task_id == task.id,
                    PointEvent.status == PointEventStatus.APPROVED,
                )
            )
            if existing_approved:
                raise HTTPException(
                    status_code=400,
                    detail="This task is non-repeatable and has already been approved for your account.",
                )

        # 3. Repeatable Task Cooldown Guard: 24-hour rate limit for same repeatable task
        if task.is_repeatable:
            cooldown_threshold = datetime.now(UTC) - timedelta(hours=24)
            recent_claim = await db.scalar(
                select(PointEvent).where(
                    PointEvent.member_id == member.id,
                    PointEvent.task_id == task.id,
                    PointEvent.status == PointEventStatus.APPROVED,
                    PointEvent.created_at >= cooldown_threshold,
                )
            )
            if recent_claim:
                raise HTTPException(
                    status_code=400,
                    detail="You have already claimed this task in the last 24 hours. Please wait before submitting another claim.",
                )

    # Session code verification
    attendance_session: AttendanceSession | None = None
    clean_code = verification_code.strip() if verification_code else None

    if task.category == "division_session":
        if not clean_code:
            raise HTTPException(
                status_code=400,
                detail="A 6-digit session verification code is required to claim session attendance.",
            )

    if clean_code:
        if len(clean_code) != 6 or not clean_code.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Verification code must be exactly 6 digits.",
            )

        now = datetime.now(UTC)
        session_stmt = (
            select(AttendanceSession)
            .where(
                AttendanceSession.code == clean_code,
                AttendanceSession.is_active.is_(True),
                AttendanceSession.expires_at > now,
                or_(
                    AttendanceSession.task_id == task.id,
                    AttendanceSession.division_id == event_division_id,
                ),
            )
            .order_by(AttendanceSession.created_at.desc())
        )
        res = await db.execute(session_stmt)
        attendance_session = res.scalars().first()

        if not attendance_session:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired session verification code.",
            )

        # Flag 3: Strict Once-Per-Session Claim Enforcement
        existing_claim = await db.scalar(
            select(PointEvent).where(
                PointEvent.member_id == member.id,
                PointEvent.attendance_session_id == attendance_session.id,
                PointEvent.status != PointEventStatus.REJECTED,
            )
        )
        if existing_claim:
            raise HTTPException(
                status_code=400,
                detail="You have already claimed attendance for this session.",
            )

    year = await get_current_academic_year(db)
    # If verified by session code or low-stakes non-penalty task
    is_session_verified = attendance_session is not None
    auto = (
        is_session_verified
        or (abs(task.base_points) <= settings.auto_approve_claim_max_points and not task.is_penalty)
    )

    decision_msg = "verified whiteboard session code" if is_session_verified else "auto-approved (low-stakes claim)"

    event = PointEvent(
        member_id=member.id,
        task_id=task.id,
        division_id=event_division_id,
        attendance_session_id=attendance_session.id if attendance_session else None,
        event_type=PointEventType.CLAIM,
        points_delta=task.base_points,
        reason=reason or f"Claim: {task.title}",
        status=PointEventStatus.APPROVED if auto else PointEventStatus.PENDING,
        approved_by=member.id if auto else None,
        academic_year=year,
        decided_at=datetime.now(UTC) if auto else None,
        decision_reason=decision_msg if auto else None,
    )
    db.add(event)
    await db.flush()
    return event


async def create_officer_event(
    db: AsyncSession,
    *,
    officer: Member,
    officer_perms: list[str],
    member_id: UUID,
    event_type: PointEventType,
    points_delta: int,
    reason: str,
    task_id: UUID | None,
    division_id: UUID | None = None,
) -> PointEvent:
    if event_type == PointEventType.CLAIM:
        raise HTTPException(status_code=400, detail="Use claim shape for event_type claim")
    if event_type == PointEventType.LAYOFF:
        raise HTTPException(status_code=400, detail="Use POST /members/{id}/layoff for layoffs")

    target = await db.get(Member, member_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")

    target_divs = {d for d in [target.division_id, target.secondary_division_id] if d is not None}

    # Scope check for division heads
    if officer.role == MemberRole.DIVISION_HEAD:
        if officer.division_id not in target_divs:
            raise HTTPException(status_code=403, detail="Member is not enrolled in your division")
        if not has_permission(officer_perms, "approve_task", division_id=officer.division_id):
            raise HTTPException(status_code=403, detail="Missing approve_task permission")
        event_division_id = officer.division_id
    elif not (
        is_club_wide_officer(officer)
        or has_permission(officer_perms, "approve_task")
    ):
        raise HTTPException(status_code=403, detail="Not permitted")
    else:
        event_division_id = division_id or target.division_id or target.secondary_division_id

    year = await get_current_academic_year(db)
    event = PointEvent(
        id=uuid.uuid4(),
        member_id=target.id,
        task_id=task_id,
        division_id=event_division_id,
        event_type=event_type,
        points_delta=points_delta,
        reason=reason,
        status=PointEventStatus.APPROVED,
        approved_by=officer.id,
        academic_year=year,
        decided_at=datetime.now(UTC),
    )
    db.add(event)
    await db.flush()
    return event


async def decide_event(
    db: AsyncSession,
    *,
    event_id: UUID,
    actor: Member,
    actor_perms: list[str],
    approve: bool,
    reason: str | None = None,
) -> PointEvent:
    event = await db.get(PointEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Point event not found")
    if event.status != PointEventStatus.PENDING:
        raise HTTPException(status_code=409, detail="Event is not pending")

    submitter = await db.get(Member, event.member_id)
    if submitter is None:
        raise HTTPException(status_code=404, detail="Submitter not found")

    if not can_approve_submitter(actor, submitter):
        raise HTTPException(status_code=403, detail="Approver must be strictly senior to submitter")

    # Scope: division head limited to their division
    if actor.role == MemberRole.DIVISION_HEAD:
        event_division = event.division_id
        if not event_division and event.task_id:
            task = await db.get(Task, event.task_id)
            event_division = task.division_id if task else None

        if event_division is not None and event_division != actor.division_id:
            raise HTTPException(status_code=403, detail="Point event belongs to another division")

        submitter_divs = {d for d in [submitter.division_id, submitter.secondary_division_id] if d is not None}
        if actor.division_id not in submitter_divs:
            raise HTTPException(status_code=403, detail="Submitter is not enrolled in your division")

        task = await db.get(Task, event.task_id) if event.task_id else None
        category = task.category if task else None
        if not (
            has_permission(actor_perms, "approve_task", division_id=actor.division_id)
            or (category and has_permission(actor_perms, "approve_task", category=category))
        ):
            raise HTTPException(status_code=403, detail="Missing approve_task in scope")
    elif not (
        actor.role in {MemberRole.VICE_PRESIDENT, MemberRole.PRESIDENT}
        or has_permission(actor_perms, "approve_task")
        or has_permission(actor_perms, "override_approval")
    ):
        raise HTTPException(status_code=403, detail="Not permitted")

    if approve:
        event.status = PointEventStatus.APPROVED
        event.decision_reason = None
    else:
        if not reason:
            raise HTTPException(status_code=400, detail="Rejection reason required")
        event.status = PointEventStatus.REJECTED
        event.decision_reason = reason

    event.approved_by = actor.id
    event.decided_at = datetime.now(UTC)
    await db.flush()
    return event


async def visible_point_events_filter(query, actor: Member):
    """Apply server-side scoping to a point_events select."""
    if actor.role == MemberRole.PRESIDENT or actor.role == MemberRole.VICE_PRESIDENT:
        return query
    if actor.role == MemberRole.DIVISION_HEAD and actor.division_id:
        # Division heads see events attributed to their division, OR for tasks scoped to their division
        return query.outerjoin(Task, Task.id == PointEvent.task_id).where(
            or_(
                PointEvent.division_id == actor.division_id,
                Task.division_id == actor.division_id,
            )
        )
    return query.where(PointEvent.member_id == actor.id)

