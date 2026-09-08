from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import func, select

from app.core.permissions import NON_DELEGABLE, has_permission, is_club_wide_officer, is_officer
from app.dependencies import DbSession, RequireUser
from app.models import Member, MemberPermission, Permission, PermissionGrantHistory
from app.models.enums import MemberRole
from app.schemas import (
    MemberPermissionCreate,
    MemberPermissionOut,
    MemberPermissionUpdate,
    Paginated,
)

router = APIRouter()


def _can_manage_grant(actor: Member, grant: MemberPermission, perms: list[str]) -> bool:
    if actor.role == MemberRole.PRESIDENT:
        return True
    if grant.granted_by == actor.id:
        return True
    if is_club_wide_officer(actor):
        return True
    if actor.role == MemberRole.DIVISION_HEAD and has_permission(
        perms, "assign_permission", division_id=actor.division_id
    ):
        return True
    return False


@router.get("", response_model=Paginated[MemberPermissionOut])
async def list_grants(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    member_id: UUID | None = None,
    permission_key: str | None = None,
    is_enabled: bool | None = None,
) -> Paginated[MemberPermissionOut]:
    if not is_officer(user.member):
        raise HTTPException(status_code=403, detail="Officers only")

    q = select(MemberPermission)
    cq = select(func.count()).select_from(MemberPermission)

    if user.member.role == MemberRole.DIVISION_HEAD:
        # Only grants the head made, or grants to members in their division
        q = q.join(Member, Member.id == MemberPermission.member_id).where(
            Member.division_id == user.member.division_id
        )
        cq = cq.join(Member, Member.id == MemberPermission.member_id).where(
            Member.division_id == user.member.division_id
        )

    if member_id is not None:
        q = q.where(MemberPermission.member_id == member_id)
        cq = cq.where(MemberPermission.member_id == member_id)
    if permission_key is not None:
        q = q.where(MemberPermission.permission_key == permission_key)
        cq = cq.where(MemberPermission.permission_key == permission_key)
    if is_enabled is not None:
        q = q.where(MemberPermission.is_enabled == is_enabled)
        cq = cq.where(MemberPermission.is_enabled == is_enabled)

    total = int((await db.execute(cq)).scalar() or 0)
    rows = (
        await db.execute(
            q.order_by(MemberPermission.granted_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return Paginated(
        items=[MemberPermissionOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=MemberPermissionOut, status_code=201)
async def grant_permission(
    body: MemberPermissionCreate, db: DbSession, user: RequireUser
) -> MemberPermissionOut:
    if not is_officer(user.member):
        raise HTTPException(status_code=403, detail="Officers only")
    if body.permission_key in NON_DELEGABLE:
        raise HTTPException(status_code=403, detail="This permission is not delegable")
    if body.member_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot self-grant")

    catalog = await db.get(Permission, body.permission_key)
    if catalog is None:
        raise HTTPException(status_code=404, detail="Unknown permission key")

    target = await db.get(Member, body.member_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")

    actor = user.member
    # Escalation safeguards
    if actor.role == MemberRole.DIVISION_HEAD:
        if not has_permission(user.permissions, "assign_permission", division_id=actor.division_id):
            raise HTTPException(status_code=403, detail="Missing assign_permission")
        if body.scope_value is None or body.scope_value != str(actor.division_id):
            # Allow category scopes within division, but not club-wide
            if body.scope_value is None:
                raise HTTPException(status_code=403, detail="Division heads cannot grant club-wide")
        if target.division_id != actor.division_id:
            raise HTTPException(status_code=403, detail="Target outside your division")
    elif not (
        is_club_wide_officer(actor)
        or has_permission(user.permissions, "assign_permission")
    ):
        raise HTTPException(status_code=403, detail="Not permitted")

    grant = MemberPermission(
        member_id=body.member_id,
        permission_key=body.permission_key,
        scope_value=body.scope_value,
        granted_by=user.id,
        is_enabled=True,
    )
    db.add(grant)
    await db.flush()
    db.add(
        PermissionGrantHistory(
            member_permission_id=grant.id,
            member_id=grant.member_id,
            permission_key=grant.permission_key,
            scope_value=grant.scope_value,
            action="granted",
            actor_id=user.id,
        )
    )
    await db.flush()
    return MemberPermissionOut.model_validate(grant)


@router.patch("/{grant_id}", response_model=MemberPermissionOut)
async def toggle_grant(
    grant_id: UUID, body: MemberPermissionUpdate, db: DbSession, user: RequireUser
) -> MemberPermissionOut:
    grant = await db.get(MemberPermission, grant_id)
    if grant is None:
        raise HTTPException(status_code=404, detail="Grant not found")
    if not _can_manage_grant(user.member, grant, user.permissions):
        raise HTTPException(status_code=403, detail="Not permitted")

    grant.is_enabled = body.is_enabled
    await db.flush()
    db.add(
        PermissionGrantHistory(
            member_permission_id=grant.id,
            member_id=grant.member_id,
            permission_key=grant.permission_key,
            scope_value=grant.scope_value,
            action="enabled" if body.is_enabled else "disabled",
            actor_id=user.id,
        )
    )
    await db.flush()
    return MemberPermissionOut.model_validate(grant)


@router.delete("/{grant_id}", status_code=204, response_class=Response)
async def revoke_grant(grant_id: UUID, db: DbSession, user: RequireUser) -> Response:
    grant = await db.get(MemberPermission, grant_id)
    if grant is None:
        raise HTTPException(status_code=404, detail="Grant not found")
    if not _can_manage_grant(user.member, grant, user.permissions):
        raise HTTPException(status_code=403, detail="Not permitted")

    db.add(
        PermissionGrantHistory(
            member_permission_id=grant.id,
            member_id=grant.member_id,
            permission_key=grant.permission_key,
            scope_value=grant.scope_value,
            action="revoked",
            actor_id=user.id,
        )
    )
    await db.delete(grant)
    return Response(status_code=204)
