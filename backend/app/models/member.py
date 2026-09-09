import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MemberRole


class Member(Base):
    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_id: Mapped[str | None] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    profile_image_url: Mapped[str | None] = mapped_column(Text)
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="SET NULL")
    )
    secondary_division_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="SET NULL")
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberRole.MEMBER,
    )
    department: Mapped[str | None] = mapped_column(String(150))
    joining_year: Mapped[int | None] = mapped_column(SmallInteger)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    imported_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL")
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Phase 2 — unused until Telegram ships
    telegram_username: Mapped[str | None] = mapped_column(String(255))
    telegram_chat_id: Mapped[str | None] = mapped_column(String(255))
    telegram_connect_token: Mapped[str | None] = mapped_column(String(255))
    telegram_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    division: Mapped["Division | None"] = relationship(foreign_keys=[division_id], back_populates="members")  # noqa: F821
    secondary_division: Mapped["Division | None"] = relationship(
        foreign_keys=[secondary_division_id], back_populates="secondary_members"
    )  # noqa: F821
    permissions: Mapped[list["MemberPermission"]] = relationship(  # noqa: F821
        back_populates="member",
        foreign_keys="MemberPermission.member_id",
    )
