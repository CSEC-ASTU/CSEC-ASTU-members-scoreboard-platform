"""Telegram bot notification service for the FastAPI backend.

Provides fire-and-forget notifications to the Telegram bot service
when point events are created or approved.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


async def _do_notify(bot_url: str, secret: str, event_id: UUID | str) -> None:
    """Post point_event_id to the bot internal notification endpoint."""
    url = f"{bot_url.rstrip('/')}/internal/notify"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                json={"point_event_id": str(event_id)},
                headers={"X-Internal-Secret": secret},
            )
            if resp.status_code != 200:
                logger.warning(
                    "Telegram bot notification failed with status %d: %s",
                    resp.status_code,
                    resp.text,
                )
    except Exception as exc:
        logger.debug("Telegram bot unreachable or notification failed: %s", exc)


def notify_bot(settings: Settings, event_id: UUID | str) -> None:
    """Fire-and-forget notification to the Telegram bot service.

    Does not block the caller or transaction. Silently handles bot downtime.
    """
    if not settings.telegram_bot_url or not settings.internal_api_secret:
        return

    try:
        asyncio.create_task(
            _do_notify(settings.telegram_bot_url, settings.internal_api_secret, event_id)
        )
    except RuntimeError:
        # No running event loop (e.g. running in a synchronous test environment)
        pass
