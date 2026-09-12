from uuid import UUID
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import MemberRole
from app.models.member import Member
from app.repositories.base import BaseRepository


class MemberRepository(BaseRepository[Member]):
    def __init__(self, db: AsyncSession):
        super().__init__(Member, db)

    async def list_members(
        self,
        *,
        page: int = 1,
        page_size: int = 25,
        division_id: UUID | None = None,
        role: MemberRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[Member], int]:
        q = select(Member).options(selectinload(Member.division))
        count_q = select(func.count()).select_from(Member)

        if division_id is not None:
            div_filter = or_(
                Member.division_id == division_id,
                Member.secondary_division_id == division_id,
            )
            q = q.where(div_filter)
            count_q = count_q.where(div_filter)

        if role is not None:
            q = q.where(Member.role == role)
            count_q = count_q.where(Member.role == role)
        if is_active is not None:
            q = q.where(Member.is_active == is_active)
            count_q = count_q.where(Member.is_active == is_active)
        if search:
            like = f"%{search}%"
            filt = or_(Member.full_name.ilike(like), Member.email.ilike(like))
            q = q.where(filt)
            count_q = count_q.where(filt)

        total = int((await self.db.execute(count_q)).scalar() or 0)
        rows = (
            await self.db.execute(
                q.order_by(Member.full_name).offset((page - 1) * page_size).limit(page_size)
            )
        ).scalars().all()

        return list(rows), total

    async def get_by_email(self, email: str) -> Member | None:
        query = select(Member).where(Member.email.ilike(email))
        result = await self.db.execute(query)
        return result.scalars().first()
