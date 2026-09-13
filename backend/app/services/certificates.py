from __future__ import annotations

from datetime import UTC, datetime
import hashlib
import hmac
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.models import Certificate, Division, Member
from app.models.enums import MemberRole
from app.schemas.certificates import CertificateCreate, CertificatePublicVerify
from app.services.settings import get_current_academic_year


def sign_certificate_payload(
    cert_code: str,
    recipient_identifier: UUID | str,
    academic_year: int,
    issued_at: datetime,
    secret_key: str,
) -> str:
    """Generate an HMAC-SHA256 cryptographic signature for the certificate."""
    # Ensure consistent ISO format
    iso_time = issued_at.astimezone(UTC).isoformat()
    raw_payload = f"{cert_code}:{recipient_identifier}:{academic_year}:{iso_time}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()


def verify_certificate_integrity(cert: Certificate, secret_key: str) -> bool:
    """Verify certificate authenticity by recomputing HMAC signature."""
    recip_id = cert.member_id or cert.recipient_email or cert.recipient_identity or cert.recipient_name
    expected = sign_certificate_payload(
        cert_code=cert.cert_code,
        recipient_identifier=recip_id,
        academic_year=cert.academic_year,
        issued_at=cert.issued_at,
        secret_key=secret_key,
    )
    return hmac.compare_digest(cert.signature_hash, expected)


def generate_cert_code(academic_year: int, division_name: str | None = None) -> str:
    """Generate human-readable unique credential code e.g. CSEC-2026-DEV-A9B8C7."""
    slug = "CSEC"
    if division_name:
        parts = division_name.strip().split()
        if len(parts) == 1:
            slug = parts[0][:3].upper()
        else:
            slug = "".join(p[0] for p in parts if p).upper()[:4]
    rand_hex = secrets.token_hex(3).upper()
    return f"CSEC-{academic_year}-{slug}-{rand_hex}"


async def issue_certificates(
    db: AsyncSession,
    *,
    data: CertificateCreate,
    issuer: Member,
    settings: Settings,
) -> list[Certificate]:
    """Issue certificates in batch to club members and external participants."""
    # Authority check: President, VP, or Division Head within their division
    if issuer.role == MemberRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="General members cannot issue certificates",
        )

    if issuer.role == MemberRole.DIVISION_HEAD:
        if not data.division_id or data.division_id != issuer.division_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Division Heads can only issue certificates for their own division",
            )

    if not data.member_ids and not data.external_recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one club member or external participant must be specified",
        )

    academic_year = data.academic_year or await get_current_academic_year(db)

    # Resolve division if specified
    division = await db.get(Division, data.division_id) if data.division_id else None
    div_name = division.name if division else None

    signing_secret = settings.jwt_secret_key
    created_certs: list[Certificate] = []
    now = datetime.now(UTC)

    # 1. Process Internal Club Members
    for mid in data.member_ids:
        member = await db.get(Member, mid)
        if not member:
            continue

        # Scoping check for division head
        if issuer.role == MemberRole.DIVISION_HEAD:
            member_divs = {d for d in [member.division_id, member.secondary_division_id] if d is not None}
            if issuer.division_id not in member_divs:
                continue

        # Generate unique code
        code = generate_cert_code(academic_year, div_name)
        # Sign payload
        sig = sign_certificate_payload(
            cert_code=code,
            recipient_identifier=member.id,
            academic_year=academic_year,
            issued_at=now,
            secret_key=signing_secret,
        )

        # Merge event variables and member profile attributes
        attrs = dict(data.event_variables)
        attrs.update({
            "student_id": member.student_id,
            "department": member.department,
        })

        cert = Certificate(
            cert_code=code,
            member_id=member.id,
            recipient_name=member.full_name,
            recipient_email=member.email,
            recipient_identity=member.student_id,
            is_external=False,
            custom_attributes=attrs,
            division_id=data.division_id,
            title=data.title,
            description=data.description,
            certificate_type=data.certificate_type,
            academic_year=academic_year,
            issued_by_id=issuer.id,
            issued_at=now,
            signature_hash=sig,
            is_revoked=False,
        )
        db.add(cert)
        created_certs.append(cert)

    # 2. Process External Outsiders / Hackathon & Guest Participants
    for ext in data.external_recipients:
        if not ext.name or not ext.name.strip():
            continue

        code = generate_cert_code(academic_year, div_name)
        recip_id = (ext.email and ext.email.strip()) or (ext.organization and ext.organization.strip()) or ext.name.strip()
        sig = sign_certificate_payload(
            cert_code=code,
            recipient_identifier=recip_id,
            academic_year=academic_year,
            issued_at=now,
            secret_key=signing_secret,
        )

        attrs = dict(data.event_variables)
        if ext.custom_attributes:
            attrs.update(ext.custom_attributes)
        if ext.organization:
            attrs["organization"] = ext.organization

        cert = Certificate(
            cert_code=code,
            member_id=None,
            recipient_name=ext.name.strip(),
            recipient_email=ext.email.strip() if ext.email else None,
            recipient_identity=ext.organization.strip() if ext.organization else "External Participant",
            is_external=True,
            custom_attributes=attrs,
            division_id=data.division_id,
            title=data.title,
            description=data.description,
            certificate_type=data.certificate_type,
            academic_year=academic_year,
            issued_by_id=issuer.id,
            issued_at=now,
            signature_hash=sig,
            is_revoked=False,
        )
        db.add(cert)
        created_certs.append(cert)

    await db.commit()
    for c in created_certs:
        await db.refresh(c)
    return created_certs


async def get_certificate_by_code(
    db: AsyncSession,
    code: str,
) -> Certificate | None:
    """Retrieve certificate by unique code with related recipient and division loaded."""
    stmt = (
        select(Certificate)
        .where(Certificate.cert_code == code.strip())
        .options(
            selectinload(Certificate.member),
            selectinload(Certificate.issuer),
            selectinload(Certificate.division),
        )
    )
    res = await db.execute(stmt)
    return res.scalars().first()


async def verify_certificate_public(
    db: AsyncSession,
    code: str,
    settings: Settings,
) -> CertificatePublicVerify:
    """Public verification method returning sanitized credential verification payload."""
    cert = await get_certificate_by_code(db, code)
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate code '{code}' was not found in the official CSEC-ASTU registry.",
        )

    sig_valid = verify_certificate_integrity(cert, settings.jwt_secret_key)
    is_valid = sig_valid and not cert.is_revoked

    frontend_base = settings.frontend_url.rstrip("/")
    verify_url = f"{frontend_base}/verify/certificate/{cert.cert_code}"

    recipient_name = cert.recipient_name or (cert.member.full_name if cert.member else "Unknown Recipient")
    recipient_student_id = cert.member.student_id if cert.member else (cert.recipient_identity if not cert.is_external else None)
    recipient_org = cert.recipient_identity if cert.is_external else None
    department = cert.member.department if cert.member else None

    return CertificatePublicVerify(
        cert_code=cert.cert_code,
        title=cert.title,
        description=cert.description,
        certificate_type=cert.certificate_type or "completion",
        academic_year=cert.academic_year,
        issued_at=cert.issued_at,
        recipient_name=recipient_name,
        recipient_student_id=recipient_student_id,
        recipient_department=department,
        is_external=bool(cert.is_external),
        recipient_organization=recipient_org,
        custom_attributes=cert.custom_attributes,
        division_name=cert.division.name if cert.division else ("Club-Wide" if not cert.is_external else "CSEC-ASTU Host Division"),
        issuer_name=cert.issuer.full_name if cert.issuer else "CSEC-ASTU Leadership",
        drive_view_link=cert.drive_view_link,
        is_valid=is_valid,
        is_revoked=cert.is_revoked,
        revoked_reason=cert.revoked_reason,
        revoked_at=cert.revoked_at,
        signature_verified=sig_valid,
        verify_url=verify_url,
    )


async def revoke_certificate(
    db: AsyncSession,
    *,
    cert_id: UUID,
    officer: Member,
    reason: str,
) -> Certificate:
    """Revoke a certificate (Executive officers only)."""
    if officer.role not in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only President and Vice President can revoke issued certificates",
        )

    cert = await db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    cert.is_revoked = True
    cert.revoked_reason = reason.strip()
    cert.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(cert)
    return cert
