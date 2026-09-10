from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db
from app.services.bot import (
    handle_bot_command,
    notify_for_point_event,
    push_admin_digest,
    send_telegram_message,
)

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def require_internal_secret(
    settings: AppSettings,
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> None:
    if not settings.internal_api_secret or x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=401, detail="Invalid internal secret")


class NotifyRequest(BaseModel):
    point_event_id: UUID


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "telegram_bot"}


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: DbSession,
    settings: AppSettings,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict:
    if not settings.telegram_webhook_secret:
        raise HTTPException(status_code=503, detail="Telegram webhook is not configured")
    if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
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
        await send_telegram_message(settings, str(chat_id), reply)
    return {"ok": True}


@router.post("/internal/notify", dependencies=[Depends(require_internal_secret)])
async def internal_notify(
    body: NotifyRequest, db: DbSession, settings: AppSettings
) -> dict:
    """Called by the main backend after an approved point_event write."""
    return await notify_for_point_event(db, event_id=body.point_event_id, settings=settings)


@router.post("/internal/admin-digest", dependencies=[Depends(require_internal_secret)])
async def internal_admin_digest(db: DbSession, settings: AppSettings) -> dict:
    return await push_admin_digest(db, settings=settings)
