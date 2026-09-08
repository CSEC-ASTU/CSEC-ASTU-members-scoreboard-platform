from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import func, select

from app.dependencies import DbSession, RequireUser
from app.models import Division, Member
from app.models.enums import MemberRole
from app.schemas import DivisionCreate, DivisionOut, DivisionUpdate

router = APIRouter()


@router.get("", response_model=list[DivisionOut])
async def list_divisions(db: DbSession, user: RequireUser) -> list[DivisionOut]:
    rows = (await db.execute(select(Division).order_by(Division.name))).scalars().all()
    return [DivisionOut.model_validate(r) for r in rows]


@router.post("", response_model=DivisionOut, status_code=201)
async def create_division(body: DivisionCreate, db: DbSession, user: RequireUser) -> DivisionOut:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    existing = await db.execute(select(Division).where(Division.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Division name already exists")
    div = Division(name=body.name, description=body.description)
    db.add(div)
    await db.flush()
    return DivisionOut.model_validate(div)


@router.get("/{division_id}", response_model=DivisionOut)
async def get_division(division_id: UUID, db: DbSession, user: RequireUser) -> DivisionOut:
    div = await db.get(Division, division_id)
    if div is None:
        raise HTTPException(status_code=404, detail="Division not found")
    return DivisionOut.model_validate(div)


@router.patch("/{division_id}", response_model=DivisionOut)
async def update_division(
    division_id: UUID, body: DivisionUpdate, db: DbSession, user: RequireUser
) -> DivisionOut:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    div = await db.get(Division, division_id)
    if div is None:
        raise HTTPException(status_code=404, detail="Division not found")
    if body.name is not None:
        div.name = body.name
    if body.description is not None:
        div.description = body.description
    await db.flush()
    return DivisionOut.model_validate(div)


@router.delete("/{division_id}", status_code=204, response_class=Response)
async def delete_division(division_id: UUID, db: DbSession, user: RequireUser) -> Response:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    div = await db.get(Division, division_id)
    if div is None:
        raise HTTPException(status_code=404, detail="Division not found")
    count = int(
        (
            await db.execute(
                select(func.count()).select_from(Member).where(Member.division_id == division_id)
            )
        ).scalar()
        or 0
    )
    if count:
        raise HTTPException(status_code=409, detail="Division still has members")
    await db.delete(div)
    return Response(status_code=204)
