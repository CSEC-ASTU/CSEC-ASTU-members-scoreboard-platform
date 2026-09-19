from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.core.permissions import is_club_wide_officer, is_officer
from app.dependencies import AppSettings, DbSession, RequireUser
from app.models.enums import MemberRole, ProfileChangeStatus
from app.schemas.common import Paginated
from app.schemas.profile_changes import ProfileChangeRejectIn, ProfileChangeRequestOut
from app.services import profile_changes as profile_change_service
from fastapi import HTTPException

router = APIRouter()


def _require_officer(user) -> None:
    if not is_officer(user.member) or user.member.role == MemberRole.MEMBER:
        # Delegated approvers (role=member) should not see profile PII queue by default
        if user.member.role not in {
            MemberRole.DIVISION_HEAD,
            MemberRole.VICE_PRESIDENT,
            MemberRole.PRESIDENT,
        }:
            raise HTTPException(status_code=403, detail="Officers only")


def _can_decide(user) -> bool:
    return user.member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} or is_club_wide_officer(
        user.member
    )


@router.get("", response_model=Paginated[ProfileChangeRequestOut])
async def list_profile_change_requests(
    db: DbSession,
    user: RequireUser,
    status: ProfileChangeStatus | None = Query(default=ProfileChangeStatus.PENDING),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> Paginated[ProfileChangeRequestOut]:
    _require_officer(user)
    rows, total = await profile_change_service.list_requests(
        db, status_filter=status, page=page, page_size=page_size
    )
    return Paginated(
        items=[ProfileChangeRequestOut(**profile_change_service.serialize_request(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/me/pending", response_model=ProfileChangeRequestOut | None)
async def my_pending_profile_change(db: DbSession, user: RequireUser) -> ProfileChangeRequestOut | None:
    req = await profile_change_service.get_pending_for_member(db, user.member.id)
    if req is None:
        return None
    return ProfileChangeRequestOut(**profile_change_service.serialize_request(req))


@router.get("/{request_id}", response_model=ProfileChangeRequestOut)
async def get_profile_change_request(
    request_id: UUID, db: DbSession, user: RequireUser
) -> ProfileChangeRequestOut:
    req = await profile_change_service._load_request(db, request_id)
    if user.member.id != req.member_id:
        _require_officer(user)
    return ProfileChangeRequestOut(**profile_change_service.serialize_request(req))


@router.post("/{request_id}/approve", response_model=ProfileChangeRequestOut)
async def approve_profile_change(
    request_id: UUID, db: DbSession, user: RequireUser, settings: AppSettings
) -> ProfileChangeRequestOut:
    if not _can_decide(user):
        raise HTTPException(
            status_code=403,
            detail="Only the President or Vice President can approve profile changes.",
        )
    req = await profile_change_service.approve_request(
        db, request_id=request_id, reviewer=user.member, settings=settings
    )
    return ProfileChangeRequestOut(**profile_change_service.serialize_request(req))


@router.post("/{request_id}/reject", response_model=ProfileChangeRequestOut)
async def reject_profile_change(
    request_id: UUID,
    body: ProfileChangeRejectIn,
    db: DbSession,
    user: RequireUser,
    settings: AppSettings,
) -> ProfileChangeRequestOut:
    if not _can_decide(user):
        raise HTTPException(
            status_code=403,
            detail="Only the President or Vice President can reject profile changes.",
        )
    req = await profile_change_service.reject_request(
        db,
        request_id=request_id,
        reviewer=user.member,
        decision_reason=body.decision_reason,
        settings=settings,
    )
    return ProfileChangeRequestOut(**profile_change_service.serialize_request(req))


@router.post("/{request_id}/cancel", response_model=ProfileChangeRequestOut)
async def cancel_profile_change(
    request_id: UUID, db: DbSession, user: RequireUser, settings: AppSettings
) -> ProfileChangeRequestOut:
    req = await profile_change_service.cancel_request(
        db, request_id=request_id, actor=user.member, settings=settings
    )
    return ProfileChangeRequestOut(**profile_change_service.serialize_request(req))
