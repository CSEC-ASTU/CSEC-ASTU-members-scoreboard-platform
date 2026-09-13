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
    member_id: UUID | str,
    academic_year: int,
    issued_at: datetime,
    secret_key: str,
) -> str:
    """Generate an HMAC-SHA256 cryptographic signature for the certificate."""
    # Ensure consistent ISO format
    iso_time = issued_at.astimezone(UTC).isoformat()
    raw_payload = f"{cert_code}:{member_id}:{academic_year}:{iso_time}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()


def verify_certificate_integrity(cert: Certificate, secret_key: str) -> bool:
    """Verify certificate authenticity by recomputing HMAC signature."""
    expected = sign_certificate_payload(
        cert_code=cert.cert_code,
        member_id=cert.member_id,
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
    """Issue certificates in batch to the specified member IDs."""
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

    academic_year = data.academic_year or await get_current_academic_year(db)

    # Resolve division if specified
    division = await db.get(Division, data.division_id) if data.division_id else None
    div_name = division.name if division else None

    signing_secret = settings.jwt_secret_key
    created_certs: list[Certificate] = []
    now = datetime.now(UTC)

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
            member_id=member.id,
            academic_year=academic_year,
            issued_at=now,
            secret_key=signing_secret,
        )

        cert = Certificate(
            cert_code=code,
            member_id=member.id,
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

    return CertificatePublicVerify(
        cert_code=cert.cert_code,
        title=cert.title,
        description=cert.description,
        certificate_type=cert.certificate_type or "completion",
        academic_year=cert.academic_year,
        issued_at=cert.issued_at,
        recipient_name=cert.member.full_name if cert.member else "Unknown Recipient",
        recipient_student_id=cert.member.student_id if cert.member else None,
        recipient_department=cert.member.department if cert.member else None,
        division_name=cert.division.name if cert.division else "Club-Wide",
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
