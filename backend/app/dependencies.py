from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.permissions import get_effective_permissions
from app.core.security import decode_access_token
from app.database import get_db
from app.models import Member

DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


class CurrentUser:
    def __init__(self, member: Member, permissions: list[str]):
        self.member = member
        self.permissions = permissions

    @property
    def id(self) -> UUID:
        return self.member.id


async def _load_user_from_token(db: AsyncSession, token: str | None) -> CurrentUser:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        member_id = UUID(payload["sub"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc

    result = await db.execute(select(Member).where(Member.id == member_id))
    member = result.scalar_one_or_none()
    if member is None or not member.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Member not found or inactive")
    if member.google_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not claimed")

    perms = await get_effective_permissions(db, member)
    return CurrentUser(member=member, permissions=perms)


async def require_user(request: Request, db: DbSession, settings: AppSettings) -> CurrentUser:
    token = request.cookies.get(settings.access_cookie_name)
    return await _load_user_from_token(db, token)


RequireUser = Annotated[CurrentUser, Depends(require_user)]
