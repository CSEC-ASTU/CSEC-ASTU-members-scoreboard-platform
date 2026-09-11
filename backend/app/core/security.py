from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models import Member, RefreshToken


def create_access_token(member_id: UUID, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(member_id), "type": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def issue_refresh_token(db: AsyncSession, member_id: UUID, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    raw = secrets.token_urlsafe(48)
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            member_id=member_id,
            token_hash=hash_token(raw),
            expires_at=expires,
        )
    )
    await db.flush()
    return raw


async def rotate_refresh_token(
    db: AsyncSession, raw_token: str, settings: Settings | None = None
) -> tuple[Member, str] | None:
    settings = settings or get_settings()
    token_hash = hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
        )
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        return None

    now = datetime.now(UTC)
    expires_at = stored.expires_at if stored.expires_at.tzinfo else stored.expires_at.replace(tzinfo=UTC)

    if expires_at < now:
        if stored.revoked_at is None:
            stored.revoked_at = now
        return None

    member = await db.get(Member, stored.member_id)
    if member is None or not member.is_active:
        return None

    # Concurrency grace window: if this token was already rotated within the last 15 seconds,
    # issue a new token without failing or logging the user out.
    if stored.revoked_at is not None:
        revoked_at = stored.revoked_at if stored.revoked_at.tzinfo else stored.revoked_at.replace(tzinfo=UTC)
        if (now - revoked_at).total_seconds() <= 15:
            new_raw = await issue_refresh_token(db, member.id, settings)
            return member, new_raw
        return None

    stored.revoked_at = now
    new_raw = await issue_refresh_token(db, member.id, settings)
    return member, new_raw


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token))
    )
    stored = result.scalar_one_or_none()
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)


async def revoke_all_member_tokens(db: AsyncSession, member_id: UUID) -> None:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.member_id == member_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    now = datetime.now(UTC)
    for token in result.scalars():
        token.revoked_at = now


def decode_access_token(token: str, settings: Settings | None = None) -> dict[str, Any] | None:
    settings = settings or get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
