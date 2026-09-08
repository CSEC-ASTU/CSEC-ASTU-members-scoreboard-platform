import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, SmallInteger, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PointEventStatus, PointEventType


class PointEvent(Base):
    __tablename__ = "point_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL")
    )
    event_type: Mapped[PointEventType] = mapped_column(
        Enum(PointEventType, name="point_event_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PointEventType.CLAIM,
    )
    points_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[PointEventStatus] = mapped_column(
        Enum(PointEventStatus, name="point_event_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PointEventStatus.PENDING,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL")
    )
    academic_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Improvement: rejection reason stored separately from original claim reason
    decision_reason: Mapped[str | None] = mapped_column(Text)

    member: Mapped["Member"] = relationship(foreign_keys=[member_id])  # noqa: F821
    task: Mapped["Task | None"] = relationship()  # noqa: F821
    approver: Mapped["Member | None"] = relationship(foreign_keys=[approved_by])  # noqa: F821
