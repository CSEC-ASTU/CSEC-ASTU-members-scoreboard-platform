import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models import Division, Member, PointEvent, Task
from app.models.attendance_session import AttendanceSession
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.services.point_events import create_claim


@pytest.fixture
def mock_settings():
    settings = MagicMock(spec=Settings)
    settings.auto_approve_claim_max_points = 10
    return settings


@pytest.fixture
def dev_division():
    return Division(
        id=uuid.uuid4(),
        name="Development",
        description="Dev division",
    )


@pytest.fixture
def cyber_division():
    return Division(
        id=uuid.uuid4(),
        name="Cybersecurity",
        description="Cyber division",
    )


@pytest.fixture
def dev_member(dev_division):
    return Member(
        id=uuid.uuid4(),
        email="dev_member@astu.edu.et",
        full_name="Dev Member",
        role=MemberRole.MEMBER,
        division_id=dev_division.id,
        secondary_division_id=None,
    )


@pytest.fixture
def attendance_task(dev_division):
    return Task(
        id=uuid.uuid4(),
        title="Development Session Attendance",
        category="division_session",
        base_points=10,
        active=True,
        division_id=dev_division.id,
        is_penalty=False,
    )


@pytest.mark.asyncio
async def test_session_attendance_requires_code(mock_settings, dev_member, attendance_task):
    db = AsyncMock()
    db.get.return_value = attendance_task

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=attendance_task.id,
            reason=None,
            settings=mock_settings,
            verification_code=None,
        )

    assert exc_info.value.status_code == 400
    assert "6-digit session verification code is required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_session_attendance_rejects_invalid_code_length(mock_settings, dev_member, attendance_task):
    db = AsyncMock()
    db.get.return_value = attendance_task

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=attendance_task.id,
            reason=None,
            settings=mock_settings,
            verification_code="123",  # Not 6 digits
        )

    assert exc_info.value.status_code == 400
    assert "must be exactly 6 digits" in exc_info.value.detail


@pytest.mark.asyncio
async def test_session_attendance_rejects_non_existent_or_expired_code(mock_settings, dev_member, attendance_task):
    db = AsyncMock()
    db.get.return_value = attendance_task

    # Query returns no active session
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=attendance_task.id,
            reason=None,
            settings=mock_settings,
            verification_code="999999",
        )

    assert exc_info.value.status_code == 400
    assert "Invalid or expired session verification code" in exc_info.value.detail


@pytest.mark.asyncio
async def test_session_attendance_enforces_once_per_session(mock_settings, dev_member, attendance_task, dev_division):
    db = AsyncMock()
    db.get.return_value = attendance_task

    valid_session = AttendanceSession(
        id=uuid.uuid4(),
        task_id=attendance_task.id,
        division_id=dev_division.id,
        code="654321",
        is_active=True,
        expires_at=datetime.now(UTC) + timedelta(minutes=60),
    )

    mock_scalars = MagicMock()
    mock_scalars.first.return_value = valid_session
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    db.execute.return_value = mock_res

    # Simulate existing claim already in database for this session
    existing_event = PointEvent(
        id=uuid.uuid4(),
        member_id=dev_member.id,
        attendance_session_id=valid_session.id,
        status=PointEventStatus.APPROVED,
    )
    db.scalar.return_value = existing_event

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=attendance_task.id,
            reason=None,
            settings=mock_settings,
            verification_code="654321",
        )

    assert exc_info.value.status_code == 400
    assert "already claimed attendance for this session" in exc_info.value.detail


@pytest.mark.asyncio
async def test_session_attendance_foreign_division_rejected(mock_settings, cyber_division, attendance_task):
    db = AsyncMock()
    db.get.return_value = attendance_task

    # Member is from Cyber, task is from Dev
    cyber_member = Member(
        id=uuid.uuid4(),
        email="cyber@astu.edu.et",
        full_name="Cyber Member",
        role=MemberRole.MEMBER,
        division_id=cyber_division.id,
        secondary_division_id=None,
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=cyber_member,
            task_id=attendance_task.id,
            reason=None,
            settings=mock_settings,
            verification_code="654321",
        )

    assert exc_info.value.status_code == 403
    assert "active member of this division" in exc_info.value.detail
