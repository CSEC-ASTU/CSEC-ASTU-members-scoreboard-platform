import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models import Division, Member, PointEvent, Task
from app.models.enums import MemberRole, PointEventStatus
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
def dev_member(dev_division):
    return Member(
        id=uuid.uuid4(),
        email="dev_member@astu.edu.et",
        full_name="Dev Member",
        role=MemberRole.MEMBER,
        division_id=dev_division.id,
        secondary_division_id=None,
    )


@pytest.mark.asyncio
async def test_duplicate_pending_claim_rejected(mock_settings, dev_member, dev_division):
    cleaning_task = Task(
        id=uuid.uuid4(),
        title="Weekly Lab Cleaning Duty",
        category="lab_cleaning",
        base_points=15,
        active=True,
        division_id=None,
        is_repeatable=True,
    )
    db = AsyncMock()
    db.get.return_value = cleaning_task

    # Existing pending claim in DB
    existing_pending = PointEvent(
        id=uuid.uuid4(),
        member_id=dev_member.id,
        task_id=cleaning_task.id,
        status=PointEventStatus.PENDING,
    )
    db.scalar.return_value = existing_pending

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=cleaning_task.id,
            reason="Cleaned lab desks",
            settings=mock_settings,
        )

    assert exc_info.value.status_code == 400
    assert "pending claim for this task" in exc_info.value.detail


@pytest.mark.asyncio
async def test_non_repeatable_task_rejected_if_already_approved(mock_settings, dev_member, dev_division):
    onboarding_task = Task(
        id=uuid.uuid4(),
        title="Annual Member Registration Setup",
        category="academic_support",
        base_points=20,
        active=True,
        division_id=dev_division.id,
        is_repeatable=False,  # Non-repeatable!
    )
    db = AsyncMock()
    db.get.return_value = onboarding_task

    # First scalar check for pending returns None, second scalar check for approved returns existing
    db.scalar.side_effect = [
        None,  # No pending
        PointEvent(
            id=uuid.uuid4(),
            member_id=dev_member.id,
            task_id=onboarding_task.id,
            status=PointEventStatus.APPROVED,
        ),
    ]

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=onboarding_task.id,
            reason="Did registration setup",
            settings=mock_settings,
        )

    assert exc_info.value.status_code == 400
    assert "non-repeatable and has already been approved" in exc_info.value.detail


@pytest.mark.asyncio
async def test_repeatable_task_rejected_within_24_hours(mock_settings, dev_member):
    lecture_task = Task(
        id=uuid.uuid4(),
        title="Deliver Division Lecture",
        category="internal_bootcamp",
        base_points=75,
        active=True,
        division_id=dev_member.division_id,
        is_repeatable=True,
    )
    db = AsyncMock()
    db.get.return_value = lecture_task

    # Pending check returns None; 24h check returns recent approved claim
    db.scalar.side_effect = [
        None,  # No pending
        PointEvent(
            id=uuid.uuid4(),
            member_id=dev_member.id,
            task_id=lecture_task.id,
            status=PointEventStatus.APPROVED,
            created_at=datetime.now(UTC) - timedelta(hours=2),
        ),
    ]

    with pytest.raises(HTTPException) as exc_info:
        await create_claim(
            db,
            member=dev_member,
            task_id=lecture_task.id,
            reason="Delivered react lecture",
            settings=mock_settings,
        )

    assert exc_info.value.status_code == 400
    assert "claimed this task in the last 24 hours" in exc_info.value.detail
