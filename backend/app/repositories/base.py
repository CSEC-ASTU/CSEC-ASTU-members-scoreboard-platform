from typing import Generic, Type, TypeVar
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    def __init__(self, model: Type[ModelT], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> ModelT | None:
        return await self.db.get(self.model, id)

    async def add(self, instance: ModelT) -> ModelT:
        self.db.add(instance)
        await self.db.flush()
        return instance
