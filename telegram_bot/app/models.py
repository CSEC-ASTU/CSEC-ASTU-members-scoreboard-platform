import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MemberRole(str, enum.Enum):
    MEMBER = "member"
    DIVISION_HEAD = "division_head"
    VICE_PRESIDENT = "vice_president"
    PRESIDENT = "president"


class PointEventStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PointEventType(str, enum.Enum):
    CLAIM = "claim"
    MANUAL_ADJUSTMENT = "manual_adjustment"
    NORMAL_WARNING = "normal_warning"
    YELLOW_WARNING = "yellow_warning"
    RED_WARNING = "red_warning"
    LAYOFF = "layoff"


class NotificationType(str, enum.Enum):
    NORMAL_WARNING = "normal_warning"
    YELLOW_WARNING = "yellow_warning"
    RED_WARNING = "red_warning"
    LAYOFF = "layoff"
    MOTIVATIONAL = "motivational"
    STREAK = "streak"
    ADMIN_REPORT = "admin_report"


class NotificationStatus(str, enum.Enum):
    SENT = "sent"
    FAILED = "failed"
    SKIPPED_NO_CHAT_ID = "skipped_no_chat_id"


_enum_values = lambda x: [e.value for e in x]  # noqa: E731


class Member(Base):
    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", values_callable=_enum_values),
        nullable=False,
    )
    division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    google_id: Mapped[str | None] = mapped_column(String(255))
    telegram_username: Mapped[str | None] = mapped_column(String(255))
    telegram_chat_id: Mapped[str | None] = mapped_column(String(255))
    telegram_connect_token: Mapped[str | None] = mapped_column(String(255))
    telegram_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Division(Base):
    __tablename__ = "divisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)


class PointEvent(Base):
    __tablename__ = "point_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    event_type: Mapped[PointEventType] = mapped_column(
        Enum(PointEventType, name="point_event_type", values_callable=_enum_values),
        nullable=False,
    )
    points_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[PointEventStatus] = mapped_column(
        Enum(PointEventStatus, name="point_event_status", values_callable=_enum_values),
        nullable=False,
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    related_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", values_callable=_enum_values),
        nullable=False,
    )
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status", values_callable=_enum_values),
        nullable=False,
        default=NotificationStatus.SKIPPED_NO_CHAT_ID,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
