from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.core.permissions import can_see_member, is_officer
from app.dependencies import DbSession, RequireUser
from app.models import AnnualSummary, Member
from app.schemas import AnnualSummaryOut, Paginated

router = APIRouter()


@router.get("", response_model=Paginated[AnnualSummaryOut])
async def list_summaries(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    member_id: UUID | None = None,
    academic_year: int | None = None,
) -> Paginated[AnnualSummaryOut]:
    q = select(AnnualSummary)
    cq = select(func.count()).select_from(AnnualSummary)

    if not is_officer(user.member):
        q = q.where(AnnualSummary.member_id == user.id)
        cq = cq.where(AnnualSummary.member_id == user.id)
    elif member_id is not None:
        target = await db.get(Member, member_id)
        if target is None or not can_see_member(user.member, target, user.permissions):
            raise HTTPException(status_code=404, detail="Member not found")
        q = q.where(AnnualSummary.member_id == member_id)
        cq = cq.where(AnnualSummary.member_id == member_id)

    if academic_year is not None:
        q = q.where(AnnualSummary.academic_year == academic_year)
        cq = cq.where(AnnualSummary.academic_year == academic_year)

    total = int((await db.execute(cq)).scalar() or 0)
    rows = (
        await db.execute(
            q.order_by(AnnualSummary.academic_year.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return Paginated(
        items=[AnnualSummaryOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{summary_id}", response_model=AnnualSummaryOut)
async def get_summary(summary_id: UUID, db: DbSession, user: RequireUser) -> AnnualSummaryOut:
    row = await db.get(AnnualSummary, summary_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Summary not found")
    if row.member_id != user.id and not is_officer(user.member):
        raise HTTPException(status_code=404, detail="Summary not found")
    if is_officer(user.member) and row.member_id != user.id:
        target = await db.get(Member, row.member_id)
        if target is None or not can_see_member(user.member, target, user.permissions):
            raise HTTPException(status_code=404, detail="Summary not found")
    return AnnualSummaryOut.model_validate(row)
