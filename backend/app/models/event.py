from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Luma Integration
    luma_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    luma_event_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Scope & Metadata
    event_type: Mapped[str] = mapped_column(String(32), default="external", nullable=False)  # 'internal' | 'external'
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    points_reward: Mapped[int] = mapped_column(Integer, default=20, nullable=False)

    # Schedule & Venue
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location_name: Mapped[str] = mapped_column(String(255), default="ASTU Main Campus", nullable=False)

    # Linked Certificate Template ID (e.g. from template catalogue)
    certificate_template_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Status & Audit
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    division: Mapped["Division | None"] = relationship()  # noqa: F821
    creator: Mapped["Member | None"] = relationship(foreign_keys=[created_by])  # noqa: F821
