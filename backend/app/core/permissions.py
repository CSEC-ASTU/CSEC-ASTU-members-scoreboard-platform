"""Effective permissions: role defaults + delegated grants (PRD §12)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Member, MemberPermission
from app.models.enums import ROLE_RANK, MemberRole

# Non-delegable permissions — role-default only
NON_DELEGABLE = frozenset({"assign_permission", "execute_layoff"})

ROLE_DEFAULTS: dict[MemberRole, set[str]] = {
    MemberRole.MEMBER: {
        "submit_claim",
        "view_own_score",
        "update_own_profile",
    },
    MemberRole.DIVISION_HEAD: {
        "submit_claim",
        "view_own_score",
        "update_own_profile",
        "approve_task",
        "manage_tasks",
        "assign_permission",
        "import_members",
        "view_division_members",
    },
    MemberRole.VICE_PRESIDENT: {
        "submit_claim",
        "view_own_score",
        "update_own_profile",
        "approve_task",
        "manage_tasks",
        "assign_permission",
        "import_members",
        "view_division_members",
        "override_approval",
    },
    MemberRole.PRESIDENT: {
        "submit_claim",
        "view_own_score",
        "update_own_profile",
        "approve_task",
        "manage_tasks",
        "assign_permission",
        "import_members",
        "view_division_members",
        "override_approval",
        "execute_layoff",
        "manage_settings",
        "manage_divisions",
        "view_audit_log",
        "run_annual_reset",
    },
}


def format_permission(key: str, scope_value: str | None = None) -> str:
    if scope_value is None:
        return f"{key}:club"
    # Heuristic: UUID-like → division scope label
    if len(scope_value) == 36 and scope_value.count("-") == 4:
        return f"{key}:division:{scope_value}"
    return f"{key}:category:{scope_value}"


async def get_effective_permissions(db: AsyncSession, member: Member) -> list[str]:
    perms: set[str] = set()

    for key in ROLE_DEFAULTS.get(member.role, set()):
        if member.role == MemberRole.DIVISION_HEAD and key in {
            "approve_task",
            "manage_tasks",
            "assign_permission",
            "view_division_members",
        }:
            if member.division_id:
                perms.add(format_permission(key, str(member.division_id)))
            else:
                perms.add(format_permission(key, None))
        elif member.role in {MemberRole.VICE_PRESIDENT, MemberRole.PRESIDENT}:
            perms.add(format_permission(key, None))
        else:
            perms.add(key)

    from sqlalchemy import inspect
    from sqlalchemy.orm.base import NO_VALUE

    if "permissions" in inspect(member).attrs and inspect(member).attrs.permissions.loaded_value is not NO_VALUE:
        grants = [g for g in member.permissions if g.is_enabled]
    else:
        result = await db.execute(
            select(MemberPermission).where(
                MemberPermission.member_id == member.id,
                MemberPermission.is_enabled.is_(True),
            )
        )
        grants = list(result.scalars())

    for grant in grants:
        if grant.permission_key in NON_DELEGABLE:
            continue
        perms.add(format_permission(grant.permission_key, grant.scope_value))

    return sorted(perms)


def is_officer(member: Member) -> bool:
    return member.role in {
        MemberRole.DIVISION_HEAD,
        MemberRole.VICE_PRESIDENT,
        MemberRole.PRESIDENT,
    }


def is_club_wide_officer(member: Member) -> bool:
    return member.role in {MemberRole.VICE_PRESIDENT, MemberRole.PRESIDENT}


def can_approve_submitter(approver: Member, submitter: Member) -> bool:
    """No self-approval, no lateral rubber-stamping. President ↔ VP cross-approve."""
    if approver.id == submitter.id:
        return False

    # Top of chain: president and VP approve each other
    if {approver.role, submitter.role} == {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        return True

    return ROLE_RANK[approver.role] > ROLE_RANK[submitter.role]


def has_permission(
    effective: list[str],
    key: str,
    *,
    division_id: UUID | str | None = None,
    category: str | None = None,
) -> bool:
    club = format_permission(key, None)
    if club in effective or key in effective:
        return True
    if division_id is not None and format_permission(key, str(division_id)) in effective:
        return True
    if category is not None and format_permission(key, category) in effective:
        return True
    return False


def can_see_member(viewer: Member, target: Member, effective: list[str]) -> bool:
    """All authenticated club members can view members directory and public profile."""
    return True


def can_view_sensitive_info(viewer: Member, target: Member, effective: list[str]) -> bool:
    """Check if viewer has officer/admin authority to see private contact details (phone, telegram, student ID)."""
    if viewer.id == target.id:
        return True
    if viewer.role == MemberRole.PRESIDENT or is_club_wide_officer(viewer):
        return True
    if viewer.role == MemberRole.DIVISION_HEAD and viewer.division_id and (
        viewer.division_id == target.division_id or viewer.division_id == target.secondary_division_id
    ):
        return True
    if has_permission(effective, "view_division_members"):
        return True
    if target.division_id and has_permission(effective, "view_division_members", division_id=target.division_id):
        return True
    return False
