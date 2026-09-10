"""Unit + integration-style tests for backend → Telegram bot notify glue."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import httpx
import pytest

from app.config import Settings
from app.services.telegram_notify import (
    notify_point_event,
    schedule_point_event_notify,
    telegram_notify_configured,
)


def test_telegram_notify_configured_requires_url_and_secret():
    assert not telegram_notify_configured(
        Settings(telegram_bot_base_url="", internal_api_secret="secret")
    )
    assert not telegram_notify_configured(
        Settings(telegram_bot_base_url="http://localhost:8001", internal_api_secret="")
    )
    assert telegram_notify_configured(
        Settings(telegram_bot_base_url="http://localhost:8001", internal_api_secret="secret")
    )


@pytest.mark.asyncio
async def test_notify_point_event_posts_internal_notify():
    event_id = uuid4()
    settings = Settings(
        telegram_bot_base_url="http://telegram_bot:8001",
        internal_api_secret="shared-secret",
        telegram_notify_timeout_seconds=5.0,
    )

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"ok":true}'

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("app.services.telegram_notify.httpx.AsyncClient", return_value=mock_client):
        ok = await notify_point_event(settings, event_id)

    assert ok is True
    mock_client.post.assert_awaited_once()
    args, kwargs = mock_client.post.call_args
    assert args[0] == "http://telegram_bot:8001/internal/notify"
    assert kwargs["headers"]["X-Internal-Secret"] == "shared-secret"
    assert kwargs["json"]["point_event_id"] == str(event_id)


@pytest.mark.asyncio
async def test_notify_point_event_tolerates_bot_failure():
    event_id = uuid4()
    settings = Settings(
        telegram_bot_base_url="http://telegram_bot:8001",
        internal_api_secret="shared-secret",
    )

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "boom"

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("app.services.telegram_notify.httpx.AsyncClient", return_value=mock_client):
        ok = await notify_point_event(settings, event_id)

    assert ok is False


@pytest.mark.asyncio
async def test_notify_point_event_tolerates_network_error():
    event_id = uuid4()
    settings = Settings(
        telegram_bot_base_url="http://telegram_bot:8001",
        internal_api_secret="shared-secret",
    )

    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.ConnectError("refused")
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("app.services.telegram_notify.httpx.AsyncClient", return_value=mock_client):
        ok = await notify_point_event(settings, event_id)

    assert ok is False


def test_schedule_point_event_notify_queues_background_task():
    settings = Settings(
        telegram_bot_base_url="http://localhost:8001",
        internal_api_secret="secret",
    )
    bg = MagicMock()
    event_id = uuid4()

    schedule_point_event_notify(bg, settings, event_id)

    bg.add_task.assert_called_once()
    args = bg.add_task.call_args[0]
    assert args[0] is notify_point_event
    assert args[1] is settings
    assert args[2] == event_id


def test_schedule_skips_when_unconfigured():
    settings = Settings(telegram_bot_base_url="", internal_api_secret="")
    bg = MagicMock()
    schedule_point_event_notify(bg, settings, uuid4())
    bg.add_task.assert_not_called()
