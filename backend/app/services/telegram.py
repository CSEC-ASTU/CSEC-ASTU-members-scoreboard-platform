"""Telegram bot notification service for the FastAPI backend.

Provides fire-and-forget notifications to members when point events are created or approved.
Supports both direct in-process dispatch (unified service) and legacy remote HTTP webhook dispatch.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


async def _do_in_process_notify(settings: Settings, event_id: UUID) -> None:
    """Run notification dispatch directly in-process against the database."""
    try:
        from app.database import AsyncSessionLocal
        from app.services.telegram_bot import notify_for_point_event

        async with AsyncSessionLocal() as db:
            await notify_for_point_event(db, event_id=event_id, settings=settings)
            await db.commit()
    except Exception as exc:
        logger.exception("In-process Telegram notification failed for event %s: %s", event_id, exc)


async def _do_notify(bot_url: str, secret: str, event_id: UUID | str) -> None:
    """Post point_event_id to the bot internal notification endpoint (legacy remote mode)."""
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
    """Fire-and-forget notification for point event updates.

    Dispatches directly in-process if TELEGRAM_BOT_TOKEN is set,
    or falls back to HTTP dispatch if a separate TELEGRAM_BOT_URL is configured.
    Does not block the caller or transaction.
    """
    # 1. Prefer unified in-process bot
    if settings.telegram_bot_token:
        try:
            eid = UUID(str(event_id))
            asyncio.create_task(_do_in_process_notify(settings, eid))
        except (ValueError, RuntimeError):
            pass
        return

    # 2. Fall back to remote bot if configured
    if settings.telegram_bot_url and settings.internal_api_secret:
        try:
            asyncio.create_task(
                _do_notify(settings.telegram_bot_url, settings.internal_api_secret, event_id)
            )
        except RuntimeError:
            pass


async def broadcast_message(settings: Settings, chat_ids: list[str], text: str) -> None:
    """Send an arbitrary HTML message to one or more Telegram chats."""
    if not chat_ids:
        return

    # 1. Prefer unified in-process bot
    if settings.telegram_bot_token:
        from app.services.telegram_bot import send_telegram_message

        for chat_id in chat_ids:
            try:
                await send_telegram_message(settings, chat_id, text)
            except Exception as exc:
                logger.warning("Failed to send telegram message to %s: %s", chat_id, exc)
        return

    # 2. Fall back to remote bot if configured
    if not settings.telegram_bot_url or not settings.internal_api_secret:
        return

    url = f"{settings.telegram_bot_url.rstrip('/')}/internal/broadcast"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={"chat_ids": chat_ids, "text": text},
                headers={"X-Internal-Secret": settings.internal_api_secret},
            )
            if resp.status_code != 200:
                logger.warning(
                    "Telegram broadcast failed with status %d: %s",
                    resp.status_code,
                    resp.text,
                )
    except Exception as exc:
        logger.debug("Telegram broadcast failed: %s", exc)
