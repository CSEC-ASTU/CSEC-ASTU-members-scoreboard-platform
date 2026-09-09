from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, or_, select

from app.dependencies import AppSettings, DbSession, RequireUser
from app.models import Member, PointEvent
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.schemas import (
    BulkApproveRequest,
    BulkRejectRequest,
    BulkResult,
    ClaimCreate,
    OfficerPointEventCreate,
    Paginated,
    PointEventOut,
    RejectRequest,
)
from app.services.point_events import (
    create_claim,
    create_officer_event,
    decide_event,
    visible_point_events_filter,
)

router = APIRouter()


@router.get("", response_model=Paginated[PointEventOut])
async def list_point_events(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    member_id: UUID | None = None,
    status: PointEventStatus | None = Query(default=None, alias="status"),
    event_type: PointEventType | None = None,
    division_id: UUID | None = None,
    academic_year: int | None = None,
) -> Paginated[PointEventOut]:
    q = select(PointEvent)
    q = await visible_point_events_filter(q, user.member)

    if member_id is not None:
        q = q.where(PointEvent.member_id == member_id)
    if status is not None:
        q = q.where(PointEvent.status == status)
    if event_type is not None:
        q = q.where(PointEvent.event_type == event_type)
    if academic_year is not None:
        q = q.where(PointEvent.academic_year == academic_year)
    if division_id is not None:
        q = q.outerjoin(Member, Member.id == PointEvent.member_id).where(
            or_(
                PointEvent.division_id == division_id,
                Member.division_id == division_id,
                Member.secondary_division_id == division_id,
            )
        )

    # Count via subquery
    count_q = select(func.count()).select_from(q.order_by(None).subquery())
    total = int((await db.execute(count_q)).scalar() or 0)
    rows = (
        await db.execute(
            q.order_by(PointEvent.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return Paginated(
        items=[PointEventOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=PointEventOut, status_code=201)
async def create_point_event(
    request: Request,
    db: DbSession,
    user: RequireUser,
    settings: AppSettings,
) -> PointEventOut:
    body = await request.json()
    # Discriminate claim vs officer shape
    if "task_id" in body and "event_type" not in body and "member_id" not in body:
        claim = ClaimCreate.model_validate(body)
        event = await create_claim(
            db,
            member=user.member,
            task_id=claim.task_id,
            reason=claim.reason,
            settings=settings,
            division_id=claim.division_id,
        )
        return PointEventOut.model_validate(event)

    officer = OfficerPointEventCreate.model_validate(body)
    if officer.event_type == PointEventType.CLAIM:
        raise HTTPException(status_code=400, detail="Members submit claims without member_id/event_type")
    event = await create_officer_event(
        db,
        officer=user.member,
        officer_perms=user.permissions,
        member_id=officer.member_id,
        event_type=officer.event_type,
        points_delta=officer.points_delta,
        reason=officer.reason,
        task_id=officer.task_id,
        division_id=officer.division_id,
    )
    return PointEventOut.model_validate(event)



@router.get("/{event_id}", response_model=PointEventOut)
async def get_point_event(event_id: UUID, db: DbSession, user: RequireUser) -> PointEventOut:
    event = await db.get(PointEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Point event not found")

    actor = user.member
    if actor.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        return PointEventOut.model_validate(event)
    if actor.id == event.member_id:
        return PointEventOut.model_validate(event)
    if actor.role == MemberRole.DIVISION_HEAD:
        submitter = await db.get(Member, event.member_id)
        if submitter and submitter.division_id == actor.division_id:
            return PointEventOut.model_validate(event)
    raise HTTPException(status_code=404, detail="Point event not found")


@router.patch("/{event_id}/approve", response_model=PointEventOut)
async def approve_event(event_id: UUID, db: DbSession, user: RequireUser) -> PointEventOut:
    event = await decide_event(
        db, event_id=event_id, actor=user.member, actor_perms=user.permissions, approve=True
    )
    return PointEventOut.model_validate(event)


@router.patch("/{event_id}/reject", response_model=PointEventOut)
async def reject_event(
    event_id: UUID, body: RejectRequest, db: DbSession, user: RequireUser
) -> PointEventOut:
    event = await decide_event(
        db,
        event_id=event_id,
        actor=user.member,
        actor_perms=user.permissions,
        approve=False,
        reason=body.reason,
    )
    return PointEventOut.model_validate(event)


@router.post("/bulk-approve", response_model=BulkResult)
async def bulk_approve(body: BulkApproveRequest, db: DbSession, user: RequireUser) -> BulkResult:
    succeeded: list[UUID] = []
    failed: list[dict] = []
    for eid in body.event_ids:
        try:
            await decide_event(
                db, event_id=eid, actor=user.member, actor_perms=user.permissions, approve=True
            )
            succeeded.append(eid)
        except HTTPException as exc:
            failed.append({"event_id": str(eid), "detail": exc.detail})
    return BulkResult(succeeded=succeeded, failed=failed)


@router.post("/bulk-reject", response_model=BulkResult)
async def bulk_reject(body: BulkRejectRequest, db: DbSession, user: RequireUser) -> BulkResult:
    succeeded: list[UUID] = []
    failed: list[dict] = []
    for eid in body.event_ids:
        try:
            await decide_event(
                db,
                event_id=eid,
                actor=user.member,
                actor_perms=user.permissions,
                approve=False,
                reason=body.reason,
            )
            succeeded.append(eid)
        except HTTPException as exc:
            failed.append({"event_id": str(eid), "detail": exc.detail})
    return BulkResult(succeeded=succeeded, failed=failed)
