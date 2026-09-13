from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.core.rate_limit import RateLimiter
from app.dependencies import AppSettings, DbSession, RequireUser, get_settings
from app.models import Certificate, Division, Member
from app.models.enums import MemberRole
from app.schemas.certificates import (
    CertificateCreate,
    CertificateOut,
    CertificatePublicVerify,
    CertificateRevokeRequest,
)
from app.schemas.common import Paginated
from app.services.certificates import (
    issue_certificates,
    revoke_certificate,
    verify_certificate_public,
)

router = APIRouter()


@router.get("/verify/{code}", response_model=CertificatePublicVerify, dependencies=[Depends(RateLimiter(times=60, seconds=60))])
async def verify_certificate(
    code: str,
    db: DbSession,
    settings: Settings = Depends(get_settings),
) -> CertificatePublicVerify:
    """Public verification endpoint for QR code scanning and recruiter lookup."""
    return await verify_certificate_public(db, code, settings)


@router.get("/my", response_model=list[CertificateOut])
async def get_my_certificates(
    db: DbSession,
    user: RequireUser,
) -> list[CertificateOut]:
    """Retrieve all certificates conferred to the currently authenticated member."""
    stmt = (
        select(Certificate)
        .where(Certificate.member_id == user.member.id)
        .order_by(Certificate.issued_at.desc())
        .options(
            selectinload(Certificate.member),
            selectinload(Certificate.issuer),
            selectinload(Certificate.division),
        )
    )
    res = await db.execute(stmt)
    certs = res.scalars().all()

    return [
        CertificateOut(
            id=c.id,
            cert_code=c.cert_code,
            member_id=c.member_id,
            division_id=c.division_id,
            division_name=c.division.name if c.division else None,
            title=c.title,
            description=c.description,
            certificate_type=c.certificate_type,
            academic_year=c.academic_year,
            issued_by_id=c.issued_by_id,
            issuer_name=c.issuer.full_name if c.issuer else None,
            issued_at=c.issued_at,
            signature_hash=c.signature_hash,
            drive_file_id=c.drive_file_id,
            drive_view_link=c.drive_view_link,
            is_revoked=c.is_revoked,
            revoked_reason=c.revoked_reason,
            revoked_at=c.revoked_at,
            member_name=c.member.full_name if c.member else None,
            member_student_id=c.member.student_id if c.member else None,
            member_department=c.member.department if c.member else None,
        )
        for c in certs
    ]


@router.get("", response_model=Paginated[CertificateOut])
async def list_certificates(
    db: DbSession,
    user: RequireUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    division_id: UUID | None = None,
    academic_year: int | None = None,
    search: str | None = None,
    is_revoked: bool | None = None,
) -> Paginated[CertificateOut]:
    """Officer registry list for all issued certificates."""
    if user.member.role == MemberRole.MEMBER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer privileges required")

    q = select(Certificate)

    # Scoping: division heads only see their own division
    if user.member.role == MemberRole.DIVISION_HEAD:
        q = q.where(Certificate.division_id == user.member.division_id)
    elif division_id:
        q = q.where(Certificate.division_id == division_id)

    if academic_year:
        q = q.where(Certificate.academic_year == academic_year)
    if is_revoked is not None:
        q = q.where(Certificate.is_revoked == is_revoked)

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.outerjoin(Member, Member.id == Certificate.member_id).where(
            or_(
                Certificate.cert_code.ilike(term),
                Certificate.title.ilike(term),
                Member.full_name.ilike(term),
                Member.student_id.ilike(term),
            )
        )

    # Count
    count_q = select(func.count()).select_from(q.order_by(None).subquery())
    total = int((await db.execute(count_q)).scalar() or 0)

    rows = (
        await db.execute(
            q.order_by(Certificate.issued_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(Certificate.member),
                selectinload(Certificate.issuer),
                selectinload(Certificate.division),
            )
        )
    ).scalars().all()

    items = [
        CertificateOut(
            id=c.id,
            cert_code=c.cert_code,
            member_id=c.member_id,
            division_id=c.division_id,
            division_name=c.division.name if c.division else None,
            title=c.title,
            description=c.description,
            certificate_type=c.certificate_type,
            academic_year=c.academic_year,
            issued_by_id=c.issued_by_id,
            issuer_name=c.issuer.full_name if c.issuer else None,
            issued_at=c.issued_at,
            signature_hash=c.signature_hash,
            drive_file_id=c.drive_file_id,
            drive_view_link=c.drive_view_link,
            is_revoked=c.is_revoked,
            revoked_reason=c.revoked_reason,
            revoked_at=c.revoked_at,
            member_name=c.member.full_name if c.member else None,
            member_student_id=c.member.student_id if c.member else None,
            member_department=c.member.department if c.member else None,
        )
        for c in rows
    ]

    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=list[CertificateOut], status_code=201)
async def create_certificates(
    body: CertificateCreate,
    db: DbSession,
    user: RequireUser,
    settings: Settings = Depends(get_settings),
) -> list[CertificateOut]:
    """Issue certificates in batch (President, VP, or Division Head within division)."""
    certs = await issue_certificates(
        db,
        data=body,
        issuer=user.member,
        settings=settings,
    )
    # Reload with relationships
    ids = [c.id for c in certs]
    reloaded = (
        await db.execute(
            select(Certificate)
            .where(Certificate.id.in_(ids))
            .options(
                selectinload(Certificate.member),
                selectinload(Certificate.issuer),
                selectinload(Certificate.division),
            )
        )
    ).scalars().all()

    return [
        CertificateOut(
            id=c.id,
            cert_code=c.cert_code,
            member_id=c.member_id,
            division_id=c.division_id,
            division_name=c.division.name if c.division else None,
            title=c.title,
            description=c.description,
            certificate_type=c.certificate_type,
            academic_year=c.academic_year,
            issued_by_id=c.issued_by_id,
            issuer_name=c.issuer.full_name if c.issuer else None,
            issued_at=c.issued_at,
            signature_hash=c.signature_hash,
            drive_file_id=c.drive_file_id,
            drive_view_link=c.drive_view_link,
            is_revoked=c.is_revoked,
            revoked_reason=c.revoked_reason,
            revoked_at=c.revoked_at,
            member_name=c.member.full_name if c.member else None,
            member_student_id=c.member.student_id if c.member else None,
            member_department=c.member.department if c.member else None,
        )
        for c in reloaded
    ]


@router.post("/{cert_id}/revoke", response_model=CertificateOut)
async def revoke_issued_certificate(
    cert_id: UUID,
    body: CertificateRevokeRequest,
    db: DbSession,
    user: RequireUser,
) -> CertificateOut:
    """Revoke an issued certificate (President & VP only)."""
    cert = await revoke_certificate(
        db,
        cert_id=cert_id,
        officer=user.member,
        reason=body.reason,
    )
    # Reload with relationships
    c = (
        await db.execute(
            select(Certificate)
            .where(Certificate.id == cert.id)
            .options(
                selectinload(Certificate.member),
                selectinload(Certificate.issuer),
                selectinload(Certificate.division),
            )
        )
    ).scalars().first()
    assert c is not None

    return CertificateOut(
        id=c.id,
        cert_code=c.cert_code,
        member_id=c.member_id,
        division_id=c.division_id,
        division_name=c.division.name if c.division else None,
        title=c.title,
        description=c.description,
        certificate_type=c.certificate_type,
        academic_year=c.academic_year,
        issued_by_id=c.issued_by_id,
        issuer_name=c.issuer.full_name if c.issuer else None,
        issued_at=c.issued_at,
        signature_hash=c.signature_hash,
        drive_file_id=c.drive_file_id,
        drive_view_link=c.drive_view_link,
        is_revoked=c.is_revoked,
        revoked_reason=c.revoked_reason,
        revoked_at=c.revoked_at,
        member_name=c.member.full_name if c.member else None,
        member_student_id=c.member.student_id if c.member else None,
        member_department=c.member.department if c.member else None,
    )
