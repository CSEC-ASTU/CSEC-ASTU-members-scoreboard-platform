"""Sensitive profile-change request workflow (President/VP approval + DH visibility)."""

from __future__ import annotations

import html
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.models import Member, ProfileChangeRequest
from app.models.enums import MemberRole, ProfileChangeStatus
from app.services.drive import delete_drive_file_from_url
from app.services.telegram import broadcast_message

logger = logging.getLogger(__name__)

SENSITIVE_TEXT_FIELDS = ("full_name", "phone_number")
IMMEDIATE_FIELDS = ("department", "github_url", "telegram_username")
OFFICER_NOTIFY_ROLES = {
    MemberRole.DIVISION_HEAD,
    MemberRole.VICE_PRESIDENT,
    MemberRole.PRESIDENT,
}


def _serialize_request(req: ProfileChangeRequest) -> dict:
    member = req.member
    reviewer = req.reviewer
    return {
        "id": req.id,
        "member_id": req.member_id,
        "member_full_name": member.full_name if member else None,
        "member_email": member.email if member else None,
        "member_role": member.role if member else None,
        "member_division_id": member.division_id if member else None,
        "status": req.status,
        "reason": req.reason,
        "proposed_changes": req.proposed_changes or {},
        "current_snapshot": req.current_snapshot or {},
        "proposed_profile_image_url": req.proposed_profile_image_url,
        "current_profile_image_url": req.current_profile_image_url,
        "remove_profile_image": req.remove_profile_image,
        "reviewed_by": req.reviewed_by,
        "reviewer_full_name": reviewer.full_name if reviewer else None,
        "reviewed_at": req.reviewed_at,
        "decision_reason": req.decision_reason,
        "created_at": req.created_at,
    }


async def get_pending_for_member(db: AsyncSession, member_id: UUID) -> ProfileChangeRequest | None:
    result = await db.execute(
        select(ProfileChangeRequest)
        .where(
            ProfileChangeRequest.member_id == member_id,
            ProfileChangeRequest.status == ProfileChangeStatus.PENDING,
        )
        .options(
            selectinload(ProfileChangeRequest.member),
            selectinload(ProfileChangeRequest.reviewer),
        )
    )
    return result.scalar_one_or_none()


async def _load_request(db: AsyncSession, request_id: UUID) -> ProfileChangeRequest:
    result = await db.execute(
        select(ProfileChangeRequest)
        .where(ProfileChangeRequest.id == request_id)
        .options(
            selectinload(ProfileChangeRequest.member),
            selectinload(ProfileChangeRequest.reviewer),
        )
    )
    req = result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=404, detail="Profile change request not found")
    return req


async def _officer_chat_targets(db: AsyncSession) -> list[tuple[UUID, str]]:
    result = await db.execute(
        select(Member).where(
            Member.is_active.is_(True),
            Member.role.in_(list(OFFICER_NOTIFY_ROLES)),
            Member.telegram_chat_id.is_not(None),
        )
    )
    return [(m.id, m.telegram_chat_id) for m in result.scalars().all() if m.telegram_chat_id]


def _format_field_summary(req: ProfileChangeRequest) -> str:
    parts: list[str] = []
    for key, new_val in (req.proposed_changes or {}).items():
        old_val = (req.current_snapshot or {}).get(key)
        label = key.replace("_", " ").title()
        parts.append(f"• <b>{html.escape(label)}</b>: {html.escape(str(old_val or '—'))} → {html.escape(str(new_val or '—'))}")
    if req.remove_profile_image:
        parts.append("• <b>Profile Photo</b>: remove current photo")
    elif req.proposed_profile_image_url:
        parts.append("• <b>Profile Photo</b>: new image uploaded for review")
    return "\n".join(parts) if parts else "• (no field details)"


async def notify_officers_of_request(
    db: AsyncSession, settings: Settings, req: ProfileChangeRequest
) -> list[str]:
    member_name = html.escape(req.member.full_name if req.member else "A member")
    reason = html.escape(req.reason)
    summary = _format_field_summary(req)
    text = (
        f"📝 <b>Profile Change Request</b>\n\n"
        f"<b>{member_name}</b> submitted a sensitive profile update for review.\n\n"
        f"📌 <b>Reason:</b> <i>{reason}</i>\n\n"
        f"{summary}\n\n"
        f"Division Heads can review before/after. "
        f"Only the President or Vice President can approve or reject.\n"
        f"Open the web dashboard → <b>Profile Requests</b>."
    )
    targets = await _officer_chat_targets(db)
    # Don't notify the requester even if they are an officer
    targets = [(mid, chat) for mid, chat in targets if mid != req.member_id]
    if not targets:
        return []

    chat_ids = [chat for _, chat in targets]
    await broadcast_message(settings, chat_ids, text)
    notified = [str(mid) for mid, _ in targets]
    req.notified_officer_ids = notified
    await db.flush()
    return notified


async def notify_member_of_decision(
    settings: Settings, member: Member, req: ProfileChangeRequest
) -> None:
    if not member.telegram_chat_id:
        return
    name = html.escape(member.full_name.split()[0] if member.full_name else "there")
    if req.status == ProfileChangeStatus.APPROVED:
        text = (
            f"✅ <b>Profile Change Approved</b>\n\n"
            f"Hi <b>{name}</b>, your profile update request was approved "
            f"and is now live on the platform."
        )
    elif req.status == ProfileChangeStatus.REJECTED:
        reason = html.escape(req.decision_reason or "No reason provided")
        text = (
            f"❌ <b>Profile Change Rejected</b>\n\n"
            f"Hi <b>{name}</b>, your profile update request was not approved.\n\n"
            f"📌 <b>Reason:</b> <i>{reason}</i>"
        )
    else:
        return
    await broadcast_message(settings, [member.telegram_chat_id], text)


async def create_text_change_request(
    db: AsyncSession,
    *,
    member: Member,
    proposed: dict[str, str | None],
    reason: str,
    settings: Settings,
) -> ProfileChangeRequest:
    if not reason or len(reason.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="A reason (at least 3 characters) is required for sensitive profile changes.",
        )
    existing = await get_pending_for_member(db, member.id)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending profile change request. Cancel or wait for a decision first.",
        )

    snapshot = {k: getattr(member, k) for k in proposed}
    # Only keep keys that actually differ
    filtered = {k: v for k, v in proposed.items() if (getattr(member, k) or None) != (v or None)}
    if not filtered:
        raise HTTPException(status_code=400, detail="No sensitive field changes detected.")

    req = ProfileChangeRequest(
        member_id=member.id,
        status=ProfileChangeStatus.PENDING,
        reason=reason.strip(),
        proposed_changes=filtered,
        current_snapshot={k: snapshot[k] for k in filtered},
        current_profile_image_url=member.profile_image_url,
        remove_profile_image=False,
    )
    db.add(req)
    await db.flush()
    await db.refresh(req, attribute_names=["id", "created_at"])
    # Attach relationships for serialization/notifications
    req = await _load_request(db, req.id)
    await notify_officers_of_request(db, settings, req)
    return req


async def create_picture_change_request(
    db: AsyncSession,
    *,
    member: Member,
    reason: str,
    settings: Settings,
    proposed_url: str | None = None,
    remove: bool = False,
) -> ProfileChangeRequest:
    if not reason or len(reason.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="A reason (at least 3 characters) is required to change your profile photo.",
        )
    if not remove and not proposed_url:
        raise HTTPException(status_code=400, detail="No profile picture change provided.")
    if remove and not member.profile_image_url:
        raise HTTPException(status_code=400, detail="You do not have a profile photo to remove.")

    existing = await get_pending_for_member(db, member.id)
    if existing is not None:
        # Clean up newly uploaded pending file if we cannot accept the request
        if proposed_url:
            await delete_drive_file_from_url(settings, proposed_url)
        raise HTTPException(
            status_code=409,
            detail="You already have a pending profile change request. Cancel or wait for a decision first.",
        )

    req = ProfileChangeRequest(
        member_id=member.id,
        status=ProfileChangeStatus.PENDING,
        reason=reason.strip(),
        proposed_changes={},
        current_snapshot={},
        proposed_profile_image_url=None if remove else proposed_url,
        current_profile_image_url=member.profile_image_url,
        remove_profile_image=remove,
    )
    db.add(req)
    await db.flush()
    req = await _load_request(db, req.id)
    await notify_officers_of_request(db, settings, req)
    return req


async def approve_request(
    db: AsyncSession,
    *,
    request_id: UUID,
    reviewer: Member,
    settings: Settings,
) -> ProfileChangeRequest:
    if reviewer.role not in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the President or Vice President can approve profile changes.",
        )

    req = await _load_request(db, request_id)
    if req.status != ProfileChangeStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request is no longer pending.")

    member = req.member
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found for this request.")

    for key, value in (req.proposed_changes or {}).items():
        if key in SENSITIVE_TEXT_FIELDS:
            setattr(member, key, value)

    old_image = member.profile_image_url
    if req.remove_profile_image:
        member.profile_image_url = None
        await delete_drive_file_from_url(settings, old_image)
    elif req.proposed_profile_image_url:
        member.profile_image_url = req.proposed_profile_image_url
        if old_image and old_image != req.proposed_profile_image_url:
            await delete_drive_file_from_url(settings, old_image)

    req.status = ProfileChangeStatus.APPROVED
    req.reviewed_by = reviewer.id
    req.reviewed_at = datetime.now(UTC)
    await db.flush()
    req = await _load_request(db, req.id)
    await notify_member_of_decision(settings, member, req)
    return req


async def reject_request(
    db: AsyncSession,
    *,
    request_id: UUID,
    reviewer: Member,
    decision_reason: str,
    settings: Settings,
) -> ProfileChangeRequest:
    if reviewer.role not in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the President or Vice President can reject profile changes.",
        )
    if not decision_reason or len(decision_reason.strip()) < 1:
        raise HTTPException(status_code=400, detail="A rejection reason is required.")

    req = await _load_request(db, request_id)
    if req.status != ProfileChangeStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request is no longer pending.")

    # Discard pending uploaded photo
    if req.proposed_profile_image_url:
        await delete_drive_file_from_url(settings, req.proposed_profile_image_url)
        req.proposed_profile_image_url = None

    req.status = ProfileChangeStatus.REJECTED
    req.reviewed_by = reviewer.id
    req.reviewed_at = datetime.now(UTC)
    req.decision_reason = decision_reason.strip()
    await db.flush()
    req = await _load_request(db, req.id)
    if req.member:
        await notify_member_of_decision(settings, req.member, req)
    return req


async def cancel_request(
    db: AsyncSession,
    *,
    request_id: UUID,
    actor: Member,
    settings: Settings,
) -> ProfileChangeRequest:
    req = await _load_request(db, request_id)
    if req.status != ProfileChangeStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request is no longer pending.")
    if req.member_id != actor.id and actor.role not in {
        MemberRole.PRESIDENT,
        MemberRole.VICE_PRESIDENT,
    }:
        raise HTTPException(status_code=403, detail="You can only cancel your own request.")

    if req.proposed_profile_image_url:
        await delete_drive_file_from_url(settings, req.proposed_profile_image_url)
        req.proposed_profile_image_url = None

    req.status = ProfileChangeStatus.CANCELLED
    req.reviewed_by = actor.id
    req.reviewed_at = datetime.now(UTC)
    req.decision_reason = "Cancelled by requester" if req.member_id == actor.id else "Cancelled by officer"
    await db.flush()
    return await _load_request(db, req.id)


async def list_requests(
    db: AsyncSession,
    *,
    status_filter: ProfileChangeStatus | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[ProfileChangeRequest], int]:
    from sqlalchemy import func

    filters = []
    if status_filter is not None:
        filters.append(ProfileChangeRequest.status == status_filter)

    count_stmt = select(func.count()).select_from(ProfileChangeRequest)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = int((await db.execute(count_stmt)).scalar() or 0)

    q = (
        select(ProfileChangeRequest)
        .options(
            selectinload(ProfileChangeRequest.member),
            selectinload(ProfileChangeRequest.reviewer),
        )
        .order_by(ProfileChangeRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if filters:
        q = q.where(*filters)

    rows = (await db.execute(q)).scalars().all()
    return list(rows), total


serialize_request = _serialize_request
