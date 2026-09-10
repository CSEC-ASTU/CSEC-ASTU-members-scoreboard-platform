import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.routers.point_events import batch_officer_events
from app.config import Settings
from app.models import Member
from app.models.enums import MemberRole, PointEventType
from app.schemas import BatchOfficerEventCreate


@pytest.fixture
def president_user():
    user = MagicMock()
    user.member = Member(
        id=uuid.uuid4(),
        email="president@astu.edu.et",
        full_name="Club President",
        role=MemberRole.PRESIDENT,
        division_id=None,
        secondary_division_id=None,
    )
    user.permissions = ["approve_task", "manage_tasks", "cbd_head"]
    return user


@pytest.fixture
def notify_settings():
    # Unconfigured → schedule_point_event_notify is a no-op (no httpx)
    return Settings(telegram_bot_base_url="", internal_api_secret="")


@pytest.mark.asyncio
async def test_batch_officer_events_success(president_user, notify_settings):
    db = AsyncMock()
    background_tasks = MagicMock()

    m1_id = uuid.uuid4()
    m2_id = uuid.uuid4()

    m1 = Member(id=m1_id, email="m1@astu.edu.et", full_name="M1", role=MemberRole.MEMBER)
    m2 = Member(id=m2_id, email="m2@astu.edu.et", full_name="M2", role=MemberRole.MEMBER)

    async def mock_get(model, entity_id):
        if entity_id == m1_id:
            return m1
        if entity_id == m2_id:
            return m2
        return None

    db.get.side_effect = mock_get
    mock_setting = MagicMock()
    mock_setting.value = 2026
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_setting
    db.execute.return_value = mock_res

    payload = BatchOfficerEventCreate(
        member_ids=[m1_id, m2_id],
        event_type=PointEventType.MANUAL_ADJUSTMENT,
        points_delta=25,
        reason="Game Night participation award",
    )

    res = await batch_officer_events(
        payload,
        background_tasks=background_tasks,
        db=db,
        user=president_user,
        settings=notify_settings,
    )

    assert len(res.succeeded) == 2
    assert len(res.failed) == 0
    assert db.commit.called


@pytest.mark.asyncio
async def test_batch_officer_events_normal_warning(president_user, notify_settings):
    db = AsyncMock()
    background_tasks = MagicMock()
    m_id = uuid.uuid4()
    m = Member(id=m_id, email="warned@astu.edu.et", full_name="Warned Member", role=MemberRole.MEMBER)

    async def mock_get(model, entity_id):
        if entity_id == m_id:
            return m
        return None

    db.get.side_effect = mock_get
    mock_setting = MagicMock()
    mock_setting.value = 2026
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_setting
    db.execute.return_value = mock_res

    payload = BatchOfficerEventCreate(
        member_ids=[m_id],
        event_type=PointEventType.NORMAL_WARNING,
        points_delta=-15,
        reason="Minor infraction: Late to division sprint review",
    )

    res = await batch_officer_events(
        payload,
        background_tasks=background_tasks,
        db=db,
        user=president_user,
        settings=notify_settings,
    )

    assert len(res.succeeded) == 1
    assert isinstance(res.succeeded[0], uuid.UUID)
    assert db.commit.called
