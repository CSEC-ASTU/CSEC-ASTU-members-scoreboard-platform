from __future__ import annotations

import csv
from datetime import UTC, datetime
import io
import re
import secrets
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.dependencies import AppSettings, DbSession, OptionalUser, RequireUser, get_settings
from app.models import Certificate, Division, Event, Member, PointEvent
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.schemas.certificates import CertificateCreate, ExternalRecipient
from app.schemas.common import Paginated
from app.schemas.events import (
    EventCreate,
    EventOut,
    EventUpdate,
    LumaAttendeePreview,
    LumaCSVPreviewRequest,
    LumaIngestExecuteRequest,
    LumaIngestExecuteResponse,
    LumaPreviewResponse,
)
from app.services.certificates import issue_certificates
from app.services.settings import get_current_academic_year

router = APIRouter()


def _slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    slug_base = re.sub(r"[\s-]+", "-", cleaned)
    if not slug_base:
        slug_base = "event"
    return f"{slug_base}-{secrets.token_hex(2)}"


def _extract_luma_event_id(url_or_id: str | None) -> str | None:
    if not url_or_id:
        return None
    trimmed = url_or_id.strip()
    if trimmed.startswith("evt-"):
        return trimmed

    # Prefer explicit evt- IDs from luma.com / lu.ma checkout links
    evt_match = re.search(r"(evt-[a-zA-Z0-9_-]+)", trimmed)
    if evt_match:
        return evt_match.group(1)

    # Short links: https://lu.ma/re-101 or https://luma.com/re-101
    short_match = re.search(
        r"(?:https?://)?(?:www\.)?(?:lu\.ma|luma\.com)/(?:event/)?([a-zA-Z0-9_-]+)/?(?:\?.*)?$",
        trimmed,
        re.IGNORECASE,
    )
    if short_match:
        return short_match.group(1)

    return trimmed


def _require_officer(user: RequireUser, target_division_id: UUID | None = None) -> None:
    member: Member = user.member
    if member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        return
    if member.role == MemberRole.DIVISION_HEAD:
        if target_division_id and target_division_id != member.division_id and target_division_id != member.secondary_division_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Division Heads can only manage events for their own division.",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Officer privileges required (President, VP, or Division Head).",
    )


@router.get("", response_model=Paginated[EventOut])
async def list_events(
    db: DbSession,
    user: OptionalUser,
    filter_type: str = Query("upcoming", alias="filter"),
    division_id: UUID | None = None,
    search: str | None = None,
    event_type: str | None = Query(None, pattern="^(internal|external)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Paginated[EventOut]:
    """List club events. Guests only see published external events; members see all published."""
    now = datetime.now(UTC)
    q = select(Event).options(selectinload(Event.division), selectinload(Event.creator))

    # By default, public list only shows published events
    q = q.where(Event.is_published.is_(True))

    # Club-only (internal) events are never exposed to unauthenticated visitors
    if user is None:
        q = q.where(Event.event_type == "external")
    elif event_type:
        q = q.where(Event.event_type == event_type)

    if filter_type == "upcoming":
        q = q.where(Event.end_time >= now).order_by(Event.start_time.asc())
    elif filter_type == "past":
        q = q.where(Event.end_time < now).order_by(Event.start_time.desc())
    else:
        q = q.order_by(Event.start_time.desc())

    if division_id is not None:
        q = q.where(Event.division_id == division_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(or_(Event.title.ilike(term), Event.description.ilike(term), Event.location_name.ilike(term)))

    count_q = select(func.count()).select_from(q.order_by(None).subquery())
    total = int((await db.execute(count_q)).scalar() or 0)

    rows = (
        await db.execute(
            q.offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    items = [
        EventOut(
            id=ev.id,
            title=ev.title,
            slug=ev.slug,
            description=ev.description,
            cover_image_url=ev.cover_image_url,
            luma_url=ev.luma_url,
            luma_event_id=ev.luma_event_id,
            event_type=ev.event_type,
            division_id=ev.division_id,
            division_name=ev.division.name if ev.division else None,
            points_reward=ev.points_reward,
            start_time=ev.start_time,
            end_time=ev.end_time,
            location_name=ev.location_name,
            certificate_template_id=ev.certificate_template_id,
            is_published=ev.is_published,
            created_by=ev.created_by,
            creator_name=ev.creator.full_name if ev.creator else None,
            created_at=ev.created_at,
            updated_at=ev.updated_at,
        )
        for ev in rows
    ]

    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/{id_or_slug}", response_model=EventOut)
async def get_event(
    id_or_slug: str,
    db: DbSession,
    user: OptionalUser,
) -> EventOut:
    """Retrieve single event details by UUID or slug. Internal events require authentication."""
    q = select(Event).options(selectinload(Event.division), selectinload(Event.creator))
    try:
        event_uuid = UUID(id_or_slug)
        q = q.where(Event.id == event_uuid)
    except ValueError:
        q = q.where(Event.slug == id_or_slug)

    ev = (await db.execute(q)).scalars().first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if user is None and ev.event_type == "internal":
        raise HTTPException(status_code=404, detail="Event not found")

    return EventOut(
        id=ev.id,
        title=ev.title,
        slug=ev.slug,
        description=ev.description,
        cover_image_url=ev.cover_image_url,
        luma_url=ev.luma_url,
        luma_event_id=ev.luma_event_id,
        event_type=ev.event_type,
        division_id=ev.division_id,
        division_name=ev.division.name if ev.division else None,
        points_reward=ev.points_reward,
        start_time=ev.start_time,
        end_time=ev.end_time,
        location_name=ev.location_name,
        certificate_template_id=ev.certificate_template_id,
        is_published=ev.is_published,
        created_by=ev.created_by,
        creator_name=ev.creator.full_name if ev.creator else None,
        created_at=ev.created_at,
        updated_at=ev.updated_at,
    )


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: DbSession,
    user: RequireUser,
) -> EventOut:
    """Publish a new event (President, VP, or Division Head)."""
    _require_officer(user, data.division_id)

    slug = data.slug.strip() if data.slug and data.slug.strip() else _slugify(data.title)
    # Ensure slug uniqueness
    existing_slug = await db.scalar(select(Event.id).where(Event.slug == slug))
    if existing_slug:
        slug = f"{slug}-{secrets.token_hex(2)}"

    luma_event_id = data.luma_event_id or _extract_luma_event_id(data.luma_url)

    event = Event(
        title=data.title.strip(),
        slug=slug,
        description=data.description.strip(),
        cover_image_url=data.cover_image_url.strip() if data.cover_image_url else None,
        luma_url=data.luma_url.strip() if data.luma_url else None,
        luma_event_id=luma_event_id,
        event_type=data.event_type,
        division_id=data.division_id,
        points_reward=data.points_reward,
        start_time=data.start_time,
        end_time=data.end_time,
        location_name=data.location_name.strip(),
        certificate_template_id=data.certificate_template_id,
        is_published=data.is_published,
        created_by=user.member.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Reload division and creator
    res = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(selectinload(Event.division), selectinload(Event.creator))
    )
    ev = res.scalars().first()
    assert ev is not None

    return EventOut(
        id=ev.id,
        title=ev.title,
        slug=ev.slug,
        description=ev.description,
        cover_image_url=ev.cover_image_url,
        luma_url=ev.luma_url,
        luma_event_id=ev.luma_event_id,
        event_type=ev.event_type,
        division_id=ev.division_id,
        division_name=ev.division.name if ev.division else None,
        points_reward=ev.points_reward,
        start_time=ev.start_time,
        end_time=ev.end_time,
        location_name=ev.location_name,
        certificate_template_id=ev.certificate_template_id,
        is_published=ev.is_published,
        created_by=ev.created_by,
        creator_name=ev.creator.full_name if ev.creator else None,
        created_at=ev.created_at,
        updated_at=ev.updated_at,
    )


@router.put("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: UUID,
    data: EventUpdate,
    db: DbSession,
    user: RequireUser,
) -> EventOut:
    """Update event details (President, VP, or Division Head)."""
    ev = await db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    _require_officer(user, ev.division_id)

    if data.title is not None:
        ev.title = data.title.strip()
    if data.slug is not None and data.slug.strip():
        ev.slug = data.slug.strip()
    if data.description is not None:
        ev.description = data.description.strip()
    if data.cover_image_url is not None:
        ev.cover_image_url = data.cover_image_url.strip() if data.cover_image_url else None
    if data.luma_url is not None:
        ev.luma_url = data.luma_url.strip() if data.luma_url else None
        if not data.luma_event_id:
            ev.luma_event_id = _extract_luma_event_id(ev.luma_url)
    if data.luma_event_id is not None:
        ev.luma_event_id = data.luma_event_id.strip() if data.luma_event_id else None
    if data.event_type is not None:
        ev.event_type = data.event_type
    if data.division_id is not None:
        _require_officer(user, data.division_id)
        ev.division_id = data.division_id
    if data.points_reward is not None:
        ev.points_reward = data.points_reward
    if data.start_time is not None:
        ev.start_time = data.start_time
    if data.end_time is not None:
        ev.end_time = data.end_time
    if data.location_name is not None:
        ev.location_name = data.location_name.strip()
    if data.certificate_template_id is not None:
        ev.certificate_template_id = data.certificate_template_id
    if data.is_published is not None:
        ev.is_published = data.is_published

    ev.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(ev)

    res = await db.execute(
        select(Event)
        .where(Event.id == ev.id)
        .options(selectinload(Event.division), selectinload(Event.creator))
    )
    reloaded = res.scalars().first()
    assert reloaded is not None

    return EventOut(
        id=reloaded.id,
        title=reloaded.title,
        slug=reloaded.slug,
        description=reloaded.description,
        cover_image_url=reloaded.cover_image_url,
        luma_url=reloaded.luma_url,
        luma_event_id=reloaded.luma_event_id,
        event_type=reloaded.event_type,
        division_id=reloaded.division_id,
        division_name=reloaded.division.name if reloaded.division else None,
        points_reward=reloaded.points_reward,
        start_time=reloaded.start_time,
        end_time=reloaded.end_time,
        location_name=reloaded.location_name,
        certificate_template_id=reloaded.certificate_template_id,
        is_published=reloaded.is_published,
        created_by=reloaded.created_by,
        creator_name=reloaded.creator.full_name if reloaded.creator else None,
        created_at=reloaded.created_at,
        updated_at=reloaded.updated_at,
    )


@router.delete("/{event_id}", status_code=204, response_class=Response)
async def delete_event(
    event_id: UUID,
    db: DbSession,
    user: RequireUser,
) -> Response:
    """Delete an event (President or VP only)."""
    if user.member.role not in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only executives can delete events.")

    ev = await db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(ev)
    await db.commit()
    return Response(status_code=204)


@router.post("/preview-luma-csv", response_model=LumaPreviewResponse)
async def preview_luma_csv(
    payload: LumaCSVPreviewRequest,
    db: DbSession,
    user: RequireUser,
) -> LumaPreviewResponse:
    """Parse Luma exported CSV, auto-detect columns, and resolve member vs external identities."""
    _require_officer(user, payload.division_id)

    raw_text = payload.csv_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="CSV content cannot be empty")

    # Parse CSV using DictReader
    f = io.StringIO(raw_text)
    # Detect dialect/delimiter
    sample = raw_text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample)
        reader = csv.DictReader(f, dialect=dialect)
    except Exception:
        f.seek(0)
        reader = csv.DictReader(f)

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="No header columns found in CSV")

    fieldnames = [fn.strip() for fn in reader.fieldnames if fn]

    # Column auto-detection patterns
    name_col = None
    first_name_col = None
    last_name_col = None
    email_col = None
    checkin_col = None
    custom_question_cols: list[str] = []

    for fn in fieldnames:
        fn_clean = fn.strip().lower()
        if fn_clean in {"name", "full name", "guest name", "attendee name", "ticket holder"}:
            name_col = fn
        elif fn_clean in {"first name", "firstname"}:
            first_name_col = fn
        elif fn_clean in {"last name", "lastname", "surname"}:
            last_name_col = fn
        elif fn_clean in {"email", "email address", "e-mail"}:
            email_col = fn
        elif fn_clean in {"check-in status", "checked in", "status", "attended", "check in"}:
            checkin_col = fn
        elif any(keyword in fn_clean for keyword in ["university", "track", "organization", "dept", "student id", "affiliation"]):
            custom_question_cols.append(fn)

    if not name_col and not (first_name_col and last_name_col):
        # Fallback: look for any column containing 'name'
        for fn in fieldnames:
            if "name" in fn.lower():
                name_col = fn
                break

    if not name_col and not (first_name_col and last_name_col):
        raise HTTPException(
            status_code=400,
            detail=f"Could not automatically detect Name column in CSV. Found headers: {fieldnames}",
        )

    # Fetch all active members from database for fast in-memory matching
    members_res = await db.execute(
        select(Member)
        .options(selectinload(Member.division))
        .where(Member.is_active.is_(True))
    )
    active_members = members_res.scalars().all()

    email_to_member: dict[str, Member] = {}
    name_to_member: dict[str, Member] = {}

    for m in active_members:
        if m.email:
            email_to_member[m.email.strip().lower()] = m
        if m.full_name:
            name_to_member[m.full_name.strip().lower()] = m

    mapped_columns = {
        "name": name_col or f"{first_name_col} + {last_name_col}",
        "email": email_col or "None",
        "checkin_status": checkin_col or "Assumed Checked-In",
    }
    for q in custom_question_cols:
        mapped_columns[q] = q

    attendees: list[LumaAttendeePreview] = []
    row_idx = 1
    total_rows = 0
    checked_in_rows = 0
    detected_members_count = 0
    detected_externals_count = 0

    for row in reader:
        total_rows += 1
        # Determine name
        if name_col and row.get(name_col):
            full_name = row[name_col].strip()
        elif first_name_col and last_name_col:
            first = (row.get(first_name_col) or "").strip()
            last = (row.get(last_name_col) or "").strip()
            full_name = f"{first} {last}".strip()
        else:
            continue

        if not full_name:
            continue

        email = row.get(email_col, "").strip() if email_col else None
        if email == "":
            email = None

        # Check checkin status
        is_checked_in = True
        if checkin_col and row.get(checkin_col):
            val = row[checkin_col].strip().lower()
            if val in {"checked in", "checked_in", "yes", "true", "attended", "present"}:
                is_checked_in = True
            elif val in {"registered", "no-show", "no show", "cancelled", "declined", "unapproved"}:
                is_checked_in = False

        if is_checked_in:
            checked_in_rows += 1

        # Match member identity
        matched_member: Member | None = None
        if email and email.lower() in email_to_member:
            matched_member = email_to_member[email.lower()]
        elif full_name.lower() in name_to_member:
            matched_member = name_to_member[full_name.lower()]

        # Gather custom questions
        custom_attrs: dict[str, Any] = {}
        for q in custom_question_cols:
            ans = (row.get(q) or "").strip()
            if ans:
                # normalize key
                clean_key = re.sub(r"[^a-zA-Z0-9_]", "_", q.strip().lower())
                custom_attrs[clean_key] = ans

        if matched_member:
            detected_members_count += 1
            attendees.append(
                LumaAttendeePreview(
                    row_index=row_idx,
                    name=full_name,
                    email=email or matched_member.email,
                    is_member=True,
                    member_id=matched_member.id,
                    member_student_id=matched_member.student_id,
                    member_division_name=matched_member.division.name if matched_member.division else None,
                    checked_in=is_checked_in,
                    custom_attributes=custom_attrs,
                )
            )
        else:
            detected_externals_count += 1
            attendees.append(
                LumaAttendeePreview(
                    row_index=row_idx,
                    name=full_name,
                    email=email,
                    is_member=False,
                    member_id=None,
                    member_student_id=None,
                    member_division_name=None,
                    checked_in=is_checked_in,
                    custom_attributes=custom_attrs,
                )
            )
        row_idx += 1

    return LumaPreviewResponse(
        total_rows=total_rows,
        checked_in_rows=checked_in_rows,
        detected_members=detected_members_count,
        detected_externals=detected_externals_count,
        detected_columns=fieldnames,
        mapped_columns=mapped_columns,
        attendees=attendees,
    )


@router.post("/{event_id}/ingest-luma", response_model=LumaIngestExecuteResponse)
async def ingest_luma_event_attendance(
    event_id: UUID,
    payload: LumaIngestExecuteRequest,
    db: DbSession,
    user: RequireUser,
    settings: Settings = Depends(get_settings),
) -> LumaIngestExecuteResponse:
    """Award member leaderboard points and mint official digital certificates from Luma roster."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    _require_officer(user, event.division_id)

    academic_year = payload.academic_year or await get_current_academic_year(db)
    points_awarded_members: list[str] = []
    now = datetime.now(UTC)

    # 1. Deposit points to detected members
    if payload.award_points and payload.points_reward > 0:
        for att in payload.attendees:
            if not att.is_member or not att.member_id:
                continue

            member = await db.get(Member, att.member_id)
            if not member or not member.is_active:
                continue

            # Prevent double deposit for same event and same academic year
            existing = await db.scalar(
                select(PointEvent.id).where(
                    PointEvent.member_id == member.id,
                    PointEvent.academic_year == academic_year,
                    PointEvent.reason == f"Event Attendance: {event.title}",
                    PointEvent.status != PointEventStatus.REJECTED,
                )
            )
            if existing:
                continue

            pe = PointEvent(
                member_id=member.id,
                task_id=None,
                division_id=payload.division_id or event.division_id or member.division_id,
                attendance_session_id=None,
                event_type=PointEventType.CLAIM,
                points_delta=payload.points_reward,
                reason=f"Event Attendance: {event.title}",
                status=PointEventStatus.APPROVED,
                approved_by=user.member.id,
                academic_year=academic_year,
                decided_at=now,
                decision_reason=f"Luma Attendance Ingestion ({event.title})",
            )
            db.add(pe)
            points_awarded_members.append(member.full_name)

    # 2. Mint digital certificates
    minted_codes: list[str] = []
    if payload.mint_certificates:
        member_ids_to_mint = [att.member_id for att in payload.attendees if att.is_member and att.member_id]
        external_recipients_to_mint = [
            ExternalRecipient(
                name=att.name,
                email=att.email,
                organization=att.custom_attributes.get("university") or att.custom_attributes.get("organization") or "Guest",
                custom_attributes=att.custom_attributes,
            )
            for att in payload.attendees
            if not att.is_member
        ]

        if member_ids_to_mint or external_recipients_to_mint:
            cert_create = CertificateCreate(
                template_id=payload.certificate_template_id or event.certificate_template_id,
                title=payload.certificate_title or event.title,
                description=f"Awarded for active participation in {event.title}.",
                certificate_type=payload.certificate_type,
                division_id=payload.division_id or event.division_id,
                academic_year=academic_year,
                member_ids=member_ids_to_mint,
                external_recipients=external_recipients_to_mint,
                event_variables={"event_name": event.title, "location": event.location_name},
                send_email_notifications=True,
            )
            issued = await issue_certificates(
                db,
                data=cert_create,
                issuer=user.member,
                settings=settings,
            )
            minted_codes = [c.cert_code for c in issued]

    await db.commit()

    return LumaIngestExecuteResponse(
        points_awarded_count=len(points_awarded_members),
        certificates_minted_count=len(minted_codes),
        members_awarded=points_awarded_members,
        certificate_codes=minted_codes,
    )
