from datetime import UTC, datetime
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance_session import AttendanceSession
from app.repositories.base import BaseRepository


class AttendanceRepository(BaseRepository[AttendanceSession]):
    def __init__(self, db: AsyncSession):
        super().__init__(AttendanceSession, db)

    async def get_active_sessions(self, division_id: UUID | None = None) -> list[AttendanceSession]:
        now = datetime.now(UTC)
        query = (
            select(AttendanceSession)
            .options(selectinload(AttendanceSession.task), selectinload(AttendanceSession.division))
            .where(
                AttendanceSession.is_active.is_(True),
                AttendanceSession.expires_at > now,
            )
        )
        if division_id:
            query = query.where(AttendanceSession.division_id == division_id)
        else:
            query = query.where(AttendanceSession.division_id.is_(None))

        result = await self.db.execute(query.order_by(AttendanceSession.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_code_and_task(self, task_id: UUID, code: str) -> AttendanceSession | None:
        now = datetime.now(UTC)
        query = select(AttendanceSession).where(
            AttendanceSession.task_id == task_id,
            AttendanceSession.code == code,
            AttendanceSession.is_active.is_(True),
            AttendanceSession.expires_at > now,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def end_session(self, session_id: UUID) -> bool:
        stmt = (
            update(AttendanceSession)
            .where(AttendanceSession.id == session_id, AttendanceSession.is_active.is_(True))
            .values(is_active=False)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return (result.rowcount or 0) > 0
