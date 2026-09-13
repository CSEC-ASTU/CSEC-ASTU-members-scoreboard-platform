from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cert_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    certificate_type: Mapped[str] = mapped_column(String(64), default="completion", nullable=False)
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    signature_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drive_view_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    member: Mapped["Member"] = relationship(foreign_keys=[member_id])  # noqa: F821
    issuer: Mapped["Member | None"] = relationship(foreign_keys=[issued_by_id])  # noqa: F821
    division: Mapped["Division | None"] = relationship(foreign_keys=[division_id])  # noqa: F821
