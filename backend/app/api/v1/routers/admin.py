from __future__ import annotations

from datetime import datetime
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.permissions import has_permission, is_club_wide_officer
from app.core.rate_limit import RateLimiter
from app.dependencies import AppSettings, DbSession, RequireUser, _load_user_from_token
from app.models import LoginAttemptFailure, PointEvent
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.schemas import (
    AnnualResetPreview,
    AnnualResetResult,
    ImportResult,
    Paginated,
    PointEventOut,
)
from app.services.annual_reset import execute_annual_reset, preview_annual_reset
from app.services.import_members import import_members_csv
from app.services.weekly_performers import format_weekly_digest_message, get_weekly_top_performers

router = APIRouter()


@router.post("/members/import", response_model=ImportResult, dependencies=[Depends(RateLimiter(times=3, seconds=60))])
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


@router.post("/annual-reset", response_model=AnnualResetResult, dependencies=[Depends(RateLimiter(times=3, seconds=60))])
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
    if not (
        user.member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}
        or is_club_wide_officer(user.member)
        or has_permission(user.permissions, "view_audit_log")
    ):
        raise HTTPException(status_code=403, detail="President or authorized officer only")

    q = select(PointEvent).options(
        selectinload(PointEvent.member),
        selectinload(PointEvent.task),
        selectinload(PointEvent.approver),
    )
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

    items: list[PointEventOut] = []
    for r in rows:
        app_name = None
        if r.approved_by:
            if r.approved_by == r.member_id:
                app_name = "Auto-Approved (System)"
            elif r.approver:
                app_name = r.approver.full_name
            else:
                app_name = "Officer"
        elif r.status == PointEventStatus.PENDING:
            app_name = "Pending Review"

        items.append(
            PointEventOut(
                id=r.id,
                member_id=r.member_id,
                task_id=r.task_id,
                division_id=r.division_id,
                attendance_session_id=r.attendance_session_id,
                event_type=r.event_type,
                points_delta=r.points_delta,
                reason=r.reason,
                status=r.status,
                approved_by=r.approved_by,
                academic_year=r.academic_year,
                created_at=r.created_at,
                decided_at=r.decided_at,
                decision_reason=r.decision_reason,
                task_title=r.task.title if r.task else None,
                member_name=r.member.full_name if r.member else None,
                approver_name=app_name,
            )
        )

    return Paginated(
        items=items,
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


@router.get("/weekly-performers")
async def weekly_performers(
    db: DbSession,
    user: RequireUser,
    days: int = Query(7, ge=1, le=90),
) -> dict:
    """Extract weekly top point earners club-wide and per division."""
    if not (
        user.member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}
        or is_club_wide_officer(user.member)
        or has_permission(user.permissions, "view_admin_panel")
    ):
        raise HTTPException(status_code=403, detail="Officer permission required")

    data = await get_weekly_top_performers(db, days=days)
    data["formatted_message"] = format_weekly_digest_message(data)
    return data


@router.post("/weekly-performers/dispatch")
async def dispatch_weekly_performers(
    request: Request,
    db: DbSession,
    settings: AppSettings,
    days: int = Query(7, ge=1, le=90),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> dict:
    """Dispatch the weekly performance digest to all club officers on Telegram.

    Authorization:
    - Automated scripts (Google Apps Script / cron): Provide `X-Internal-Secret: <INTERNAL_API_SECRET>`.
    - Dashboard calls: Requires active Officer credentials.
    """
    is_internal_auth = (
        bool(settings.internal_api_secret)
        and x_internal_secret == settings.internal_api_secret
    )

    if not is_internal_auth:
        token = request.cookies.get(settings.access_cookie_name)
        user = await _load_user_from_token(db, token)
        if not (
            user.member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}
            or is_club_wide_officer(user.member)
            or has_permission(user.permissions, "view_admin_panel")
        ):
            raise HTTPException(status_code=403, detail="Officer permission required")

    data = await get_weekly_top_performers(db, days=days)
    message_text = format_weekly_digest_message(data)

    if not settings.telegram_bot_url or not settings.internal_api_secret:
        return {
            "status": "skipped",
            "detail": "Telegram bot URL or internal API secret is not configured.",
            "message": message_text,
        }

    url = f"{settings.telegram_bot_url.rstrip('/')}/internal/weekly-digest"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={"message_text": message_text},
                headers={"X-Internal-Secret": settings.internal_api_secret},
            )
            bot_res = (
                resp.json()
                if resp.status_code == 200
                else {"status": resp.status_code, "detail": resp.text}
            )
    except Exception as exc:
        bot_res = {"status": "error", "detail": str(exc)}

    return {
        "status": "dispatched",
        "bot_response": bot_res,
        "message": message_text,
    }


