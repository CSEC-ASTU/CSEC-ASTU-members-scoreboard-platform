import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MemberPermission(Base):
    __tablename__ = "member_permissions"
    __table_args__ = (
        CheckConstraint("member_id <> granted_by", name="chk_no_self_grant"),
        UniqueConstraint("member_id", "permission_key", "scope_value"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    permission_key: Mapped[str] = mapped_column(
        String(100), ForeignKey("permissions.key", ondelete="CASCADE"), nullable=False
    )
    scope_value: Mapped[str | None] = mapped_column(String(255))
    granted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=False
    )
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    member: Mapped["Member"] = relationship(  # noqa: F821
        back_populates="permissions", foreign_keys=[member_id]
    )
    granter: Mapped["Member"] = relationship(foreign_keys=[granted_by])  # noqa: F821
    permission: Mapped["Permission"] = relationship()  # noqa: F821
