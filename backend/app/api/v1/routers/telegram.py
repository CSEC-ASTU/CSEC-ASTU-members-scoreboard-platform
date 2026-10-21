"""Telegram bot router handling webhooks and internal notification endpoints."""

from __future__ import annotations

import hmac
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.dependencies import AppSettings, DbSession
from app.services.telegram_bot import (
    handle_bot_command,
    notify_for_point_event,
    push_admin_digest,
    push_weekly_digest,
    send_telegram_message,
)

router = APIRouter()

# Published in repository examples; never accept as a real secret.
_PLACEHOLDER_SECRETS = {"change-me-internal-secret", "change-me-long-random-secret"}


def require_internal_secret(
    settings: AppSettings,
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> None:
    if (
        not settings.internal_api_secret
        or settings.internal_api_secret in _PLACEHOLDER_SECRETS
        or x_internal_secret is None
        or not hmac.compare_digest(x_internal_secret, settings.internal_api_secret)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal secret")


class NotifyRequest(BaseModel):
    point_event_id: UUID


class WeeklyDigestRequest(BaseModel):
    message_text: str


class BroadcastRequest(BaseModel):
    chat_ids: list[str]
    text: str


@router.get("/status")
async def bot_status(settings: AppSettings) -> dict:
    return {
        "status": "ok",
        "service": "telegram_bot_integrated",
        "bot_configured": bool(settings.telegram_bot_token),
        "username": settings.telegram_bot_username or None,
    }


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: DbSession,
    settings: AppSettings,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict:
    if not settings.telegram_webhook_secret or settings.telegram_webhook_secret in _PLACEHOLDER_SECRETS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram webhook is not configured",
        )
    if x_telegram_bot_api_secret_token is None or not hmac.compare_digest(
        x_telegram_bot_api_secret_token, settings.telegram_webhook_secret
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    payload = await request.json()
    message = payload.get("message") or payload.get("edited_message")
    if not message:
        return {"ok": True}

    text = (message.get("text") or "").strip()
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    from_user = message.get("from") or {}
    if not text or chat_id is None:
        return {"ok": True}

    if text.startswith("/"):
        reply = await handle_bot_command(
            db, text=text, chat_id=str(chat_id), from_user=from_user
        )
        await db.commit()
        await send_telegram_message(settings, str(chat_id), reply)
    return {"ok": True}


@router.post("/internal/notify", dependencies=[Depends(require_internal_secret)])
async def internal_notify(
    body: NotifyRequest, db: DbSession, settings: AppSettings
) -> dict:
    """Invoked internally or by external worker to dispatch notifications for a point event."""
    return await notify_for_point_event(db, event_id=body.point_event_id, settings=settings)


@router.post("/internal/admin-digest", dependencies=[Depends(require_internal_secret)])
async def internal_admin_digest(db: DbSession, settings: AppSettings) -> dict:
    return await push_admin_digest(db, settings=settings)


@router.post("/internal/weekly-digest", dependencies=[Depends(require_internal_secret)])
async def internal_weekly_digest(
    body: WeeklyDigestRequest, db: DbSession, settings: AppSettings
) -> dict:
    return await push_weekly_digest(db, settings=settings, message_text=body.message_text)


@router.post("/internal/broadcast", dependencies=[Depends(require_internal_secret)])
async def internal_broadcast(body: BroadcastRequest, settings: AppSettings) -> dict:
    """Send HTML message to specific chat IDs (profile changes, admin alerts, etc.)."""
    sent = 0
    failed = 0
    for chat_id in body.chat_ids:
        ok = await send_telegram_message(settings, chat_id, body.text)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed, "total": len(body.chat_ids)}
