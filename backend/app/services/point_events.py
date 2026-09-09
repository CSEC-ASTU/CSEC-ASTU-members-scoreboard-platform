"""Point event create / approve / reject logic."""

from __future__ import annotations

from datetime import UTC, datetime
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
) -> PointEvent:
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

    year = await get_current_academic_year(db)
    auto = abs(task.base_points) <= settings.auto_approve_claim_max_points and not task.is_penalty

    event = PointEvent(
        member_id=member.id,
        task_id=task.id,
        division_id=event_division_id,
        event_type=PointEventType.CLAIM,
        points_delta=task.base_points,
        reason=reason or f"Claim: {task.title}",
        status=PointEventStatus.APPROVED if auto else PointEventStatus.PENDING,
        approved_by=member.id if auto else None,
        academic_year=year,
        decided_at=datetime.now(UTC) if auto else None,
        decision_reason="auto-approved (low-stakes claim)" if auto else None,
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

