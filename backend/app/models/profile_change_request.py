import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProfileChangeStatus


class ProfileChangeRequest(Base):
    """Pending sensitive profile edits awaiting President/VP approval."""

    __tablename__ = "profile_change_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[ProfileChangeStatus] = mapped_column(
        Enum(
            ProfileChangeStatus,
            name="profile_change_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ProfileChangeStatus.PENDING,
        index=True,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_changes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    current_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    proposed_profile_image_url: Mapped[str | None] = mapped_column(Text)
    current_profile_image_url: Mapped[str | None] = mapped_column(Text)
    remove_profile_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_reason: Mapped[str | None] = mapped_column(Text)
    notified_officer_ids: Mapped[list | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    member: Mapped["Member"] = relationship(foreign_keys=[member_id])  # noqa: F821
    reviewer: Mapped["Member | None"] = relationship(foreign_keys=[reviewed_by])  # noqa: F821
