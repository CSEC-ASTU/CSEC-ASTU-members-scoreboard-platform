from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import func, or_, select

from app.core.permissions import can_see_member, can_view_sensitive_info, has_permission, is_club_wide_officer, is_officer
from app.dependencies import AppSettings, DbSession, RequireUser
from app.models import Division, Member, PermissionGrantHistory, PointEvent
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.schemas import (
    AchievementCardOut,
    LayoffRequest,
    MemberAdminUpdate,
    MemberDetail,
    MemberListItem,
    MemberSelfUpdate,
    Paginated,
    PointEventOut,
)
from app.services.drive import delete_drive_file_from_url, upload_profile_picture
from app.services.settings import (
    badge_for_score,
    fetch_member_scores,
    get_badge_multipliers,
    get_current_academic_year,
    get_score_cap,
)

router = APIRouter()


@router.get("", response_model=Paginated[MemberListItem])
async def list_members(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    division_id: UUID | None = None,
    role: MemberRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> Paginated[MemberListItem]:
    # All authenticated club members can browse the member directory.
    # Crucial sensitive details (phone, telegram, student ID) are filtered below for non-officers.
    q = select(Member)
    count_q = select(func.count()).select_from(Member)

    if division_id is not None:
        div_filter = or_(
            Member.division_id == division_id,
            Member.secondary_division_id == division_id,
        )
        q = q.where(div_filter)
        count_q = count_q.where(div_filter)

    if role is not None:
        q = q.where(Member.role == role)
        count_q = count_q.where(Member.role == role)
    if is_active is not None:
        q = q.where(Member.is_active == is_active)
        count_q = count_q.where(Member.is_active == is_active)
    if search:
        like = f"%{search}%"
        filt = or_(Member.full_name.ilike(like), Member.email.ilike(like))
        q = q.where(filt)
        count_q = count_q.where(filt)

    total = int((await db.execute(count_q)).scalar() or 0)
    rows = (
        await db.execute(
            q.order_by(Member.full_name).offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    items = []
    for m in rows:
        scores = await fetch_member_scores(db, m.id) if m.google_id else {
            "cycle_score": 0, "display_score": 0, "career_score": 0
        }
        can_view_sensitive = can_view_sensitive_info(user.member, m, user.permissions)
        items.append(
            MemberListItem(
                id=m.id,
                full_name=m.full_name,
                email=m.email,
                profile_image_url=m.profile_image_url,
                division_id=m.division_id,
                secondary_division_id=m.secondary_division_id,
                role=m.role,
                department=m.department,
                joining_year=m.joining_year,
                student_id=m.student_id if can_view_sensitive else None,
                phone_number=m.phone_number if can_view_sensitive else None,
                github_url=m.github_url,
                telegram_username=m.telegram_username if can_view_sensitive else None,
                is_active=m.is_active,
                **scores,
            )
        )
    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/{member_id}", response_model=MemberDetail)
async def get_member(member_id: UUID, db: DbSession, user: RequireUser) -> MemberDetail:
    m = await db.get(Member, member_id)
    if m is None or not can_see_member(user.member, m, user.permissions):
        raise HTTPException(status_code=404, detail="Member not found")
    scores = await fetch_member_scores(db, m.id) if m.google_id and m.is_active else {
        "cycle_score": 0, "display_score": 0, "career_score": 0
    }
    can_view_sensitive = can_view_sensitive_info(user.member, m, user.permissions)
    return MemberDetail(
        id=m.id,
        full_name=m.full_name,
        email=m.email,
        profile_image_url=m.profile_image_url,
        division_id=m.division_id,
        secondary_division_id=m.secondary_division_id,
        role=m.role,
        department=m.department,
        joining_year=m.joining_year,
        student_id=m.student_id if can_view_sensitive else None,
        phone_number=m.phone_number if can_view_sensitive else None,
        github_url=m.github_url,
        telegram_username=m.telegram_username if can_view_sensitive else None,
        is_active=m.is_active,
        first_login_at=m.first_login_at if can_view_sensitive else None,
        joined_at=m.joined_at,
        google_claimed=m.google_id is not None,
        **scores,
    )


@router.patch("/me", response_model=MemberDetail)
async def update_me(body: MemberSelfUpdate, db: DbSession, user: RequireUser) -> MemberDetail:
    m = user.member
    if body.department is not None:
        m.department = body.department
    if body.full_name is not None:
        m.full_name = body.full_name
    if body.phone_number is not None:
        m.phone_number = body.phone_number
    if body.github_url is not None:
        m.github_url = body.github_url
    if body.telegram_username is not None:
        m.telegram_username = body.telegram_username
    await db.flush()
    return await get_member(m.id, db, user)


@router.post("/me/profile-picture")
async def upload_my_picture(
    db: DbSession,
    user: RequireUser,
    settings: AppSettings,
    file: UploadFile = File(...),
) -> dict:
    url = await upload_profile_picture(settings, file, str(user.id))
    old = user.member.profile_image_url
    user.member.profile_image_url = url
    await db.flush()
    await delete_drive_file_from_url(settings, old)
    return {"profile_image_url": url}


@router.delete("/me/profile-picture")
async def delete_my_picture(db: DbSession, user: RequireUser, settings: AppSettings) -> dict:
    old = user.member.profile_image_url
    user.member.profile_image_url = None
    await db.flush()
    await delete_drive_file_from_url(settings, old)
    return {"detail": "removed"}


@router.patch("/{member_id}", response_model=MemberDetail)
async def update_member(
    member_id: UUID,
    body: MemberAdminUpdate,
    db: DbSession,
    user: RequireUser,
) -> MemberDetail:
    target = await db.get(Member, member_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")

    actor = user.member

    # Check permission to modify member profile
    if actor.role == MemberRole.PRESIDENT:
        pass
    elif actor.role == MemberRole.VICE_PRESIDENT:
        if target.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} and target.id != actor.id:
            raise HTTPException(status_code=403, detail="Vice President cannot modify executive leadership members")
    elif actor.role == MemberRole.DIVISION_HEAD and actor.division_id == target.division_id:
        if body.role is not None and body.role != target.role:
            raise HTTPException(status_code=403, detail="Division heads cannot assign base club roles")
    else:
        raise HTTPException(status_code=403, detail="Not permitted to update member details")

    # Role assignment rules & succession
    if body.role is not None and body.role != target.role:
        if actor.role == MemberRole.PRESIDENT:
            if body.role == MemberRole.PRESIDENT and target.id != actor.id:
                # Presidential succession: transfer presidency to target member,
                # actor transitions to vice president so they remain an officer.
                actor.role = MemberRole.VICE_PRESIDENT
                db.add(
                    PermissionGrantHistory(
                        member_id=actor.id,
                        permission_key="role:vice_president",
                        action="role_assigned",
                        actor_id=actor.id,
                        note=f"Stepped down to Vice President upon transferring Presidency to {target.full_name}",
                    )
                )
        elif actor.role == MemberRole.VICE_PRESIDENT:
            if body.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
                raise HTTPException(status_code=403, detail="Vice President cannot assign executive roles")
            if body.role not in {MemberRole.DIVISION_HEAD, MemberRole.MEMBER}:
                raise HTTPException(status_code=403, detail="Vice President may only assign Division Head or Member roles")
        else:
            raise HTTPException(status_code=403, detail="Not permitted to assign roles")

        if body.role == MemberRole.DIVISION_HEAD:
            div_id = body.division_id if "division_id" in body.model_fields_set else target.division_id
            if not div_id:
                raise HTTPException(status_code=400, detail="Division Head role requires selecting a primary division")

        note = f"Role updated from {target.role.value} to {body.role.value}"
        if body.role == MemberRole.PRESIDENT and target.id != actor.id:
            note = f"Presidency transferred from {actor.full_name} to {target.full_name}"

        db.add(
            PermissionGrantHistory(
                member_id=target.id,
                permission_key=f"role:{body.role.value}",
                action="role_assigned",
                actor_id=actor.id,
                note=note,
            )
        )
        target.role = body.role
    if "division_id" in body.model_fields_set:
        target.division_id = body.division_id
    if "secondary_division_id" in body.model_fields_set:
        target.secondary_division_id = body.secondary_division_id
    if body.department is not None:
        target.department = body.department
    if body.student_id is not None:
        target.student_id = body.student_id
    if body.phone_number is not None:
        target.phone_number = body.phone_number
    if body.github_url is not None:
        target.github_url = body.github_url
    if body.telegram_username is not None:
        target.telegram_username = body.telegram_username
    await db.flush()
    return await get_member(member_id, db, user)


@router.post("/{member_id}/layoff", response_model=PointEventOut)
async def layoff_member(
    member_id: UUID,
    body: LayoffRequest,
    db: DbSession,
    user: RequireUser,
) -> PointEventOut:
    if user.member.role != MemberRole.PRESIDENT:
        raise HTTPException(status_code=403, detail="President only")
    target = await db.get(Member, member_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if not target.is_active:
        raise HTTPException(status_code=409, detail="Member already inactive")

    target.is_active = False
    year = await get_current_academic_year(db)
    event = PointEvent(
        member_id=target.id,
        event_type=PointEventType.LAYOFF,
        points_delta=-100,
        reason=body.reason,
        status=PointEventStatus.APPROVED,
        approved_by=user.id,
        academic_year=year,
        decided_at=datetime.now(UTC),
    )
    db.add(event)
    await db.flush()
    return PointEventOut.model_validate(event)


@router.get("/{member_id}/point-events", response_model=Paginated[PointEventOut])
async def member_point_events(
    member_id: UUID,
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
) -> Paginated[PointEventOut]:
    target = await db.get(Member, member_id)
    if target is None or not can_see_member(user.member, target, user.permissions):
        raise HTTPException(status_code=404, detail="Member not found")

    count = int(
        (
            await db.execute(
                select(func.count()).select_from(PointEvent).where(PointEvent.member_id == member_id)
            )
        ).scalar()
        or 0
    )
    rows = (
        await db.execute(
            select(PointEvent)
            .where(PointEvent.member_id == member_id)
            .order_by(PointEvent.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return Paginated(
        items=[PointEventOut.model_validate(r) for r in rows],
        total=count,
        page=page,
        page_size=page_size,
    )


@router.get("/{member_id}/achievement-card", response_model=AchievementCardOut)
async def achievement_card(member_id: UUID, db: DbSession, user: RequireUser) -> AchievementCardOut:
    # Phase 1: owner only
    if user.id != member_id:
        raise HTTPException(status_code=403, detail="Achievement card is private in Phase 1")
    m = user.member
    scores = await fetch_member_scores(db, m.id)
    cap = await get_score_cap(db)
    multipliers = await get_badge_multipliers(db)
    badge = badge_for_score(scores["cycle_score"], cap, multipliers)
    div_name = None
    if m.division_id:
        div = await db.get(Division, m.division_id)
        div_name = div.name if div else None
    sec_div_name = None
    if m.secondary_division_id:
        sec_div = await db.get(Division, m.secondary_division_id)
        sec_div_name = sec_div.name if sec_div else None
    return AchievementCardOut(
        full_name=m.full_name,
        joining_year=m.joining_year,
        division_id=m.division_id,
        division_name=div_name,
        secondary_division_id=m.secondary_division_id,
        secondary_division_name=sec_div_name,
        career_score=scores["career_score"],
        cycle_score=scores["cycle_score"],
        display_score=scores["display_score"],
        badges=[badge] if badge else [],
        profile_image_url=m.profile_image_url,
    )

