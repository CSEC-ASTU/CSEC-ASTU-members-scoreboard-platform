from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select

from app.core.permissions import has_permission
from app.dependencies import DbSession, RequireUser
from app.models import LoginAttemptFailure, PointEvent
from app.models.enums import MemberRole, PointEventType
from app.schemas import (
    AnnualResetPreview,
    AnnualResetResult,
    ImportResult,
    Paginated,
    PointEventOut,
)
from app.services.annual_reset import execute_annual_reset, preview_annual_reset
from app.services.import_members import import_members_csv

router = APIRouter()


@router.post("/members/import", response_model=ImportResult)
async def import_members(
    db: DbSession,
    user: RequireUser,
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
) -> ImportResult:
    if not (
        user.member.role == MemberRole.PRESIDENT
        or has_permission(user.permissions, "import_members")
    ):
        raise HTTPException(status_code=403, detail="Missing import_members permission")
    raw = await file.read()
    return await import_members_csv(db, raw, importer_id=user.id, dry_run=dry_run)


@router.get("/annual-reset/preview", response_model=AnnualResetPreview)
async def annual_reset_preview(db: DbSession, user: RequireUser) -> AnnualResetPreview:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    data = await preview_annual_reset(db)
    return AnnualResetPreview(**data)


@router.post("/annual-reset", response_model=AnnualResetResult)
async def annual_reset(db: DbSession, user: RequireUser) -> AnnualResetResult:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    data = await execute_annual_reset(db)
    return AnnualResetResult(**data)


@router.get("/audit-log", response_model=Paginated[PointEventOut])
async def audit_log(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    member_id: UUID | None = None,
    event_type: PointEventType | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> Paginated[PointEventOut]:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")

    q = select(PointEvent)
    cq = select(func.count()).select_from(PointEvent)
    if member_id is not None:
        q = q.where(PointEvent.member_id == member_id)
        cq = cq.where(PointEvent.member_id == member_id)
    if event_type is not None:
        q = q.where(PointEvent.event_type == event_type)
        cq = cq.where(PointEvent.event_type == event_type)
    if date_from is not None:
        q = q.where(PointEvent.created_at >= date_from)
        cq = cq.where(PointEvent.created_at >= date_from)
    if date_to is not None:
        q = q.where(PointEvent.created_at <= date_to)
        cq = cq.where(PointEvent.created_at <= date_to)

    total = int((await db.execute(cq)).scalar() or 0)
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


@router.get("/login-failures")
async def list_login_failures(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """Improvement: officers can inspect unmatched Google login attempts."""
    if user.member.role not in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        raise HTTPException(status_code=403, detail="Club officers only")
    total = int(
        (await db.execute(select(func.count()).select_from(LoginAttemptFailure))).scalar() or 0
    )
    rows = (
        await db.execute(
            select(LoginAttemptFailure)
            .order_by(LoginAttemptFailure.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "email": r.email,
                "google_id": r.google_id,
                "reason": r.reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
