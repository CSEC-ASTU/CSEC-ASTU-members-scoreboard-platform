"""Dispatch approved ledger events to the Telegram bot service.

The bot owns Telegram Bot API credentials and writes `notifications` rows.
This module is a best-effort HTTP client: failures are logged and never
propagate to the member-facing API response.
"""

from __future__ import annotations

import logging
from uuid import UUID

import httpx
from fastapi import BackgroundTasks

from app.config import Settings

logger = logging.getLogger(__name__)


def telegram_notify_configured(settings: Settings) -> bool:
    return bool(settings.telegram_bot_base_url and settings.internal_api_secret)


async def notify_point_event(settings: Settings, point_event_id: UUID) -> bool:
    """POST /internal/notify on the bot. Returns True on HTTP 2xx."""
    if not telegram_notify_configured(settings):
        logger.debug(
            "Telegram notify skipped (bot URL or INTERNAL_API_SECRET not configured) event_id=%s",
            point_event_id,
        )
        return False

    base = settings.telegram_bot_base_url.rstrip("/")
    url = f"{base}/internal/notify"
    headers = {"X-Internal-Secret": settings.internal_api_secret}
    payload = {"point_event_id": str(point_event_id)}

    try:
        async with httpx.AsyncClient(timeout=settings.telegram_notify_timeout_seconds) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning(
                    "Telegram notify failed event_id=%s status=%s body=%s",
                    point_event_id,
                    resp.status_code,
                    resp.text[:500],
                )
                return False
            logger.info("Telegram notify accepted event_id=%s status=%s", point_event_id, resp.status_code)
            return True
    except Exception:
        logger.exception("Telegram notify error event_id=%s", point_event_id)
        return False


def schedule_point_event_notify(
    background_tasks: BackgroundTasks,
    settings: Settings,
    point_event_id: UUID | None,
) -> None:
    """Queue notify after the response (and DB commit) complete."""
    if point_event_id is None:
        return
    if not telegram_notify_configured(settings):
        return
    background_tasks.add_task(notify_point_event, settings, point_event_id)


async def trigger_admin_digest(settings: Settings) -> dict:
    """POST /internal/admin-digest on the bot (president-triggered)."""
    if not telegram_notify_configured(settings):
        return {"ok": False, "detail": "Telegram bot not configured"}

    base = settings.telegram_bot_base_url.rstrip("/")
    url = f"{base}/internal/admin-digest"
    headers = {"X-Internal-Secret": settings.internal_api_secret}

    try:
        async with httpx.AsyncClient(timeout=settings.telegram_notify_timeout_seconds) as client:
            resp = await client.post(url, headers=headers)
            if resp.status_code >= 400:
                logger.warning(
                    "Telegram admin digest failed status=%s body=%s",
                    resp.status_code,
                    resp.text[:500],
                )
                return {"ok": False, "detail": resp.text[:500], "status_code": resp.status_code}
            return {"ok": True, "result": resp.json()}
    except Exception as exc:
        logger.exception("Telegram admin digest error")
        return {"ok": False, "detail": str(exc)}
