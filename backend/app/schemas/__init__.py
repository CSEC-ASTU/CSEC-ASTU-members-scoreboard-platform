# Master Schemas Barrel — Backwards-Compatible Re-Exports
from app.schemas.annual import AnnualResetPreview, AnnualResetResult, AnnualSummaryOut
from app.schemas.attendance import AttendanceSessionCreate, AttendanceSessionOut
from app.schemas.auth import MeOut, TelegramConnectOut
from app.schemas.common import HealthOut, MessageOut, Paginated
from app.schemas.divisions import DivisionCreate, DivisionOut, DivisionUpdate
from app.schemas.leaderboard import LeaderboardItem, LeaderboardItemOut, LeaderboardOut
from app.schemas.members import (
    AchievementCardOut,
    ImportErrorRow,
    ImportResult,
    ImportUnmatchedDivision,
    LayoffRequest,
    MemberAdminUpdate,
    MemberDetail,
    MemberListItem,
    MemberSelfUpdate,
)
from app.schemas.permissions import (
    MemberPermissionCreate,
    MemberPermissionOut,
    MemberPermissionUpdate,
    PermissionOut,
)
from app.schemas.point_events import (
    BatchOfficerEventCreate,
    BulkApproveRequest,
    BulkRejectRequest,
    BulkResult,
    ClaimCreate,
    OfficerPointEventCreate,
    PointEventOut,
    RejectRequest,
)
from app.schemas.settings import SettingsOut, SettingsUpdate
from app.schemas.tasks import TaskCreate, TaskOut, TaskUpdate

__all__ = [
    # Common
    "Paginated",
    "MessageOut",
    "HealthOut",
    # Auth
    "MeOut",
    "TelegramConnectOut",
    # Members
    "MemberListItem",
    "MemberDetail",
    "MemberSelfUpdate",
    "MemberAdminUpdate",
    "LayoffRequest",
    "ImportErrorRow",
    "ImportUnmatchedDivision",
    "ImportResult",
    "AchievementCardOut",
    # Divisions
    "DivisionCreate",
    "DivisionUpdate",
    "DivisionOut",
    # Leaderboard
    "LeaderboardItemOut",
    "LeaderboardItem",
    "LeaderboardOut",
    # Tasks
    "TaskCreate",
    "TaskUpdate",
    "TaskOut",
    # Point Events
    "ClaimCreate",
    "OfficerPointEventCreate",
    "BatchOfficerEventCreate",
    "PointEventOut",
    "RejectRequest",
    "BulkApproveRequest",
    "BulkRejectRequest",
    "BulkResult",
    # Attendance
    "AttendanceSessionCreate",
    "AttendanceSessionOut",
    # Permissions
    "PermissionOut",
    "MemberPermissionCreate",
    "MemberPermissionUpdate",
    "MemberPermissionOut",
    # Annual & Settings
    "AnnualSummaryOut",
    "AnnualResetPreview",
    "AnnualResetResult",
    "SettingsOut",
    "SettingsUpdate",
]
