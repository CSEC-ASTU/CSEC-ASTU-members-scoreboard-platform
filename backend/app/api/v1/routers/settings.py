from fastapi import APIRouter, HTTPException

from app.dependencies import DbSession, RequireUser
from app.models.enums import MemberRole
from app.schemas import SettingsOut, SettingsUpdate
from app.services.settings import get_all_settings, upsert_setting

router = APIRouter()


@router.get("", response_model=SettingsOut)
async def read_settings(db: DbSession, user: RequireUser) -> SettingsOut:
    data = await get_all_settings(db)
    return SettingsOut(**data)


@router.patch("", response_model=SettingsOut)
async def update_settings(body: SettingsUpdate, db: DbSession, user: RequireUser) -> SettingsOut:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    payload = body.model_dump(exclude_unset=True)
    for key, value in payload.items():
        await upsert_setting(db, key, value)
    data = await get_all_settings(db)
    return SettingsOut(**data)
