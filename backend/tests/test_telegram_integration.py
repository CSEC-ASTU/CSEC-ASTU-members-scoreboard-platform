"""Tests for backend Telegram bot integration and handshake endpoints."""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.v1.routers.auth import connect_telegram
from app.config import Settings
from app.models import Member
from app.models.enums import MemberRole
from app.services.telegram import _do_notify, notify_bot


@pytest.fixture
def test_member_user():
    user = MagicMock()
    user.member = Member(
        id=uuid.uuid4(),
        email="testmember@astu.edu.et",
        full_name="Test Member",
        role=MemberRole.MEMBER,
        telegram_chat_id=None,
        telegram_connect_token=None,
        telegram_token_expires_at=None,
    )
    user.id = user.member.id
    return user


@pytest.mark.asyncio
async def test_connect_telegram_with_bot_username(test_member_user):
    db = AsyncMock()
    settings = Settings(
        telegram_bot_username="csec_astu_bot",
        internal_api_secret="secret123",
        telegram_bot_url="http://localhost:8001",
    )

    result = await connect_telegram(db=db, user=test_member_user, settings=settings)

    assert result.token is not None
    assert len(result.token) >= 32
    assert result.link == f"https://t.me/csec_astu_bot?start={result.token}"
    assert test_member_user.member.telegram_connect_token == result.token
    assert test_member_user.member.telegram_token_expires_at is not None

    # Expiry should be approximately 10 minutes in the future
    now = datetime.now(UTC)
    delta = test_member_user.member.telegram_token_expires_at - now
    assert timedelta(minutes=9) < delta <= timedelta(minutes=10, seconds=5)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_connect_telegram_without_bot_username(test_member_user):
    db = AsyncMock()
    settings = Settings(
        telegram_bot_username="",
        internal_api_secret="secret123",
        telegram_bot_url="http://localhost:8001",
    )

    result = await connect_telegram(db=db, user=test_member_user, settings=settings)

    assert result.token is not None
    assert result.link is None
    assert test_member_user.member.telegram_connect_token == result.token
    db.flush.assert_awaited_once()


def test_notify_bot_noop_when_unconfigured():
    settings = Settings(telegram_bot_url="", internal_api_secret="")
    # Should safely return without scheduling a task
    with patch("asyncio.create_task") as mock_task:
        notify_bot(settings, uuid.uuid4())
        mock_task.assert_not_called()


@pytest.mark.asyncio
async def test_do_notify_silent_on_network_error():
    # If bot is offline or connection refused, _do_notify catches it without raising
    event_id = uuid.uuid4()
    with patch("httpx.AsyncClient.post", side_effect=Exception("Connection refused")):
        # Should not raise exception
        await _do_notify("http://localhost:9999", "secret", event_id)
