from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.permissions import is_officer
from app.dependencies import DbSession, RequireUser
from app.models import Permission
from app.schemas import PermissionOut

router = APIRouter()


@router.get("", response_model=list[PermissionOut])
async def list_permissions(db: DbSession, user: RequireUser) -> list[PermissionOut]:
    if not (is_officer(user.member) or user.member.role.value == "president"):
        raise HTTPException(status_code=403, detail="Officers only")
    rows = (await db.execute(select(Permission).order_by(Permission.key))).scalars().all()
    return [PermissionOut.model_validate(r) for r in rows]


@router.get("/{key}", response_model=PermissionOut)
async def get_permission(key: str, db: DbSession, user: RequireUser) -> PermissionOut:
    if not is_officer(user.member):
        raise HTTPException(status_code=403, detail="Officers only")
    row = await db.get(Permission, key)
    if row is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    return PermissionOut.model_validate(row)
