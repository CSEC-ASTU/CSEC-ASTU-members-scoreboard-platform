"""Unit tests for sensitive profile-change approval workflow."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models import Member
from app.models.enums import MemberRole, ProfileChangeStatus
from app.models.profile_change_request import ProfileChangeRequest
from app.services import profile_changes as svc


@pytest.fixture
def member():
    return Member(
        id=uuid.uuid4(),
        email="member@example.com",
        full_name="Ada Lovelace",
        role=MemberRole.MEMBER,
        phone_number="+251900000000",
        profile_image_url="https://example.com/old.jpg",
        telegram_chat_id=None,
    )


@pytest.fixture
def president():
    return Member(
        id=uuid.uuid4(),
        email="president@example.com",
        full_name="Club President",
        role=MemberRole.PRESIDENT,
    )


@pytest.fixture
def division_head():
    return Member(
        id=uuid.uuid4(),
        email="dh@example.com",
        full_name="Division Head",
        role=MemberRole.DIVISION_HEAD,
    )


@pytest.fixture
def settings():
    s = MagicMock(spec=Settings)
    s.telegram_bot_url = None
    s.internal_api_secret = None
    return s


@pytest.mark.asyncio
async def test_create_text_request_requires_reason(member, settings):
    db = AsyncMock()
    with patch.object(svc, "get_pending_for_member", AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            await svc.create_text_change_request(
                db,
                member=member,
                proposed={"full_name": "Ada L."},
                reason="no",
                settings=settings,
            )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_create_text_request_blocks_duplicate_pending(member, settings):
    db = AsyncMock()
    existing = ProfileChangeRequest(
        id=uuid.uuid4(),
        member_id=member.id,
        status=ProfileChangeStatus.PENDING,
        reason="existing",
        proposed_changes={"phone_number": "1"},
        current_snapshot={"phone_number": "0"},
    )
    with patch.object(svc, "get_pending_for_member", AsyncMock(return_value=existing)):
        with pytest.raises(HTTPException) as exc:
            await svc.create_text_change_request(
                db,
                member=member,
                proposed={"phone_number": "+251911111111"},
                reason="Changed SIM card",
                settings=settings,
            )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_division_head_cannot_approve(member, division_head, settings):
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await svc.approve_request(
            db, request_id=uuid.uuid4(), reviewer=division_head, settings=settings
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_approve_applies_sensitive_fields(member, president, settings):
    req_id = uuid.uuid4()
    req = ProfileChangeRequest(
        id=req_id,
        member_id=member.id,
        status=ProfileChangeStatus.PENDING,
        reason="Legal name update",
        proposed_changes={"full_name": "Augusta Ada King", "phone_number": "+251922222222"},
        current_snapshot={"full_name": member.full_name, "phone_number": member.phone_number},
        proposed_profile_image_url=None,
        current_profile_image_url=member.profile_image_url,
        remove_profile_image=False,
    )
    req.member = member
    req.reviewer = None

    db = AsyncMock()

    async def _load(_db, _id):
        # After approve, status flips — return same object with relationships
        return req

    with (
        patch.object(svc, "_load_request", AsyncMock(side_effect=_load)),
        patch.object(svc, "notify_member_of_decision", AsyncMock()),
        patch.object(svc, "delete_drive_file_from_url", AsyncMock()),
    ):
        # delete_drive is imported inside approve from drive module — patch at source used
        with patch("app.services.profile_changes.delete_drive_file_from_url", AsyncMock()):
            result = await svc.approve_request(
                db, request_id=req_id, reviewer=president, settings=settings
            )

    assert result.status == ProfileChangeStatus.APPROVED
    assert result.reviewed_by == president.id
    assert member.full_name == "Augusta Ada King"
    assert member.phone_number == "+251922222222"
