import enum


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


class PermissionScopeType(str, enum.Enum):
    CLUB = "club"
    DIVISION = "division"
    TASK_CATEGORY = "task_category"


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


# Seniority for no-self / no-lateral approval (PRD §12)
ROLE_RANK: dict[MemberRole, int] = {
    MemberRole.MEMBER: 0,
    MemberRole.DIVISION_HEAD: 1,
    MemberRole.VICE_PRESIDENT: 2,
    MemberRole.PRESIDENT: 3,
}
