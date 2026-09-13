from datetime import UTC, datetime
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models import Certificate, Division, Member
from app.models.enums import MemberRole
from app.schemas.certificates import CertificateCreate
from app.services.certificates import (
    generate_cert_code,
    issue_certificates,
    revoke_certificate,
    sign_certificate_payload,
    verify_certificate_integrity,
    verify_certificate_public,
)


def test_cryptographic_signature_tamper_detection():
    secret = "super-secret-key-12345"
    member_id = uuid.uuid4()
    code = "CSEC-2026-DEV-A1B2C3"
    year = 2026
    now = datetime.now(UTC)

    sig = sign_certificate_payload(code, member_id, year, now, secret)
    assert isinstance(sig, str) and len(sig) == 64

    # Valid certificate object
    cert = Certificate(
        id=uuid.uuid4(),
        cert_code=code,
        member_id=member_id,
        academic_year=year,
        issued_at=now,
        signature_hash=sig,
        title="Full-Stack Engineering",
    )
    assert verify_certificate_integrity(cert, secret) is True

    # Tampered code
    cert.cert_code = "CSEC-2026-DEV-TAMPERED"
    assert verify_certificate_integrity(cert, secret) is False

    # Tampered member
    cert.cert_code = code
    cert.member_id = uuid.uuid4()
    assert verify_certificate_integrity(cert, secret) is False

    # Tampered year
    cert.member_id = member_id
    cert.academic_year = 2025
    assert verify_certificate_integrity(cert, secret) is False


def test_generate_cert_code_formatting():
    code_dev = generate_cert_code(2026, "Development")
    assert code_dev.startswith("CSEC-2026-DEV-")
    assert len(code_dev) == len("CSEC-2026-DEV-A1B2C3")

    code_club = generate_cert_code(2026, None)
    assert code_club.startswith("CSEC-2026-CSEC-")

    code_multi = generate_cert_code(2026, "Competitive Programming")
    assert code_multi.startswith("CSEC-2026-CP-")


@pytest.mark.asyncio
async def test_member_cannot_issue_certificates():
    db = AsyncMock()
    settings = MagicMock(spec=Settings)

    member_issuer = Member(
        id=uuid.uuid4(),
        role=MemberRole.MEMBER,
        full_name="Regular Member",
    )
    create_data = CertificateCreate(
        member_ids=[uuid.uuid4()],
        title="Web Dev",
    )

    with pytest.raises(HTTPException) as exc:
        await issue_certificates(db, data=create_data, issuer=member_issuer, settings=settings)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_division_head_scoping_check():
    db = AsyncMock()
    settings = MagicMock(spec=Settings)
    dev_div_id = uuid.uuid4()
    cyber_div_id = uuid.uuid4()

    dh_issuer = Member(
        id=uuid.uuid4(),
        role=MemberRole.DIVISION_HEAD,
        division_id=dev_div_id,
        full_name="Dev DH",
    )

    # Attempt to issue for cyber division
    create_data = CertificateCreate(
        member_ids=[uuid.uuid4()],
        division_id=cyber_div_id,
        title="Cyber Defense",
    )

    with pytest.raises(HTTPException) as exc:
        await issue_certificates(db, data=create_data, issuer=dh_issuer, settings=settings)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_certificate_public_success():
    db = AsyncMock()
    settings = MagicMock(spec=Settings)
    settings.jwt_secret_key = "test-secret"
    settings.frontend_url = "https://csec-astu.org"

    now = datetime.now(UTC)
    member_id = uuid.uuid4()
    code = "CSEC-2026-DEV-XYZ123"
    sig = sign_certificate_payload(code, member_id, 2026, now, settings.jwt_secret_key)

    div = Division(id=uuid.uuid4(), name="Development")
    recipient = Member(
        id=member_id,
        full_name="Dawit Alemayehu",
        student_id="UGR/12345/14",
        department="Software Engineering",
    )
    issuer = Member(
        id=uuid.uuid4(),
        full_name="President Helen",
    )

    cert = Certificate(
        id=uuid.uuid4(),
        cert_code=code,
        member_id=member_id,
        division_id=div.id,
        title="Development Division Mastery",
        description="Exceptional performance in web track",
        certificate_type="completion",
        academic_year=2026,
        issued_by_id=issuer.id,
        issued_at=now,
        signature_hash=sig,
        is_revoked=False,
    )
    cert.member = recipient
    cert.issuer = issuer
    cert.division = div

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = cert
    db.execute.return_value = mock_result

    res = await verify_certificate_public(db, code, settings)
    assert res.cert_code == code
    assert res.recipient_name == "Dawit Alemayehu"
    assert res.recipient_student_id == "UGR/12345/14"
    assert res.division_name == "Development"
    assert res.is_valid is True
    assert res.is_revoked is False
    assert res.signature_verified is True
    assert res.verify_url == "https://csec-astu.org/verify/certificate/CSEC-2026-DEV-XYZ123"


@pytest.mark.asyncio
async def test_verify_certificate_public_revoked():
    db = AsyncMock()
    settings = MagicMock(spec=Settings)
    settings.jwt_secret_key = "test-secret"
    settings.frontend_url = "https://csec-astu.org"

    now = datetime.now(UTC)
    member_id = uuid.uuid4()
    code = "CSEC-2026-DEV-REVOKED"
    sig = sign_certificate_payload(code, member_id, 2026, now, settings.jwt_secret_key)

    cert = Certificate(
        id=uuid.uuid4(),
        cert_code=code,
        member_id=member_id,
        academic_year=2026,
        issued_at=now,
        signature_hash=sig,
        title="Revoked Award",
        certificate_type="completion",
        is_revoked=True,
        revoked_reason="Academic misconduct violation",
        revoked_at=now,
    )
    cert.member = Member(id=member_id, full_name="Student X")
    cert.issuer = None
    cert.division = None

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = cert
    db.execute.return_value = mock_result

    res = await verify_certificate_public(db, code, settings)
    assert res.is_valid is False
    assert res.is_revoked is True
    assert res.revoked_reason == "Academic misconduct violation"
    assert res.signature_verified is True


@pytest.mark.asyncio
async def test_revoke_certificate_authority():
    db = AsyncMock()
    cert_id = uuid.uuid4()

    dh_member = Member(id=uuid.uuid4(), role=MemberRole.DIVISION_HEAD)
    with pytest.raises(HTTPException) as exc:
        await revoke_certificate(db, cert_id=cert_id, officer=dh_member, reason="Test")
    assert exc.value.status_code == 403

    vp_member = Member(id=uuid.uuid4(), role=MemberRole.VICE_PRESIDENT)
    cert = Certificate(id=cert_id, is_revoked=False)
    db.get.return_value = cert

    revoked = await revoke_certificate(db, cert_id=cert_id, officer=vp_member, reason="Valid revocation")
    assert revoked.is_revoked is True
    assert revoked.revoked_reason == "Valid revocation"


@pytest.mark.asyncio
async def test_issue_outsider_certificates_with_dynamic_variables():
    db = AsyncMock()
    settings = MagicMock(spec=Settings)
    settings.jwt_secret_key = "secret"
    settings.frontend_url = "http://localhost:3000"

    issuer = Member(id=uuid.uuid4(), role=MemberRole.PRESIDENT, full_name="President")
    div_id = uuid.uuid4()
    div = Division(id=div_id, name="Cybersecurity")
    db.get.return_value = div

    from app.schemas.certificates import ExternalRecipient

    create_data = CertificateCreate(
        title="2026 ASTU CTF Championship",
        description="National Inter-University Cybersecurity Contest",
        certificate_type="competition",
        division_id=div_id,
        academic_year=2026,
        external_recipients=[
            ExternalRecipient(
                name="Abebe Kebede",
                email="abebe@aau.edu.et",
                organization="Addis Ababa University",
                custom_attributes={"rank": "1st Place", "team_name": "ZeroDayWarriors", "score": 4200},
            ),
            ExternalRecipient(
                name="Bethlehem Tadesse",
                email="beth@aastu.edu.et",
                organization="AASTU",
                custom_attributes={"rank": "2nd Place", "team_name": "CyberKnights"},
            ),
        ],
        event_variables={"track": "Binary Exploitation & Web", "sponsor": "CSEC ASTU"},
    )

    issued = await issue_certificates(db, data=create_data, issuer=issuer, settings=settings)
    assert len(issued) == 2

    # Check Abebe's record
    cert1 = issued[0]
    assert cert1.member_id is None
    assert cert1.is_external is True
    assert cert1.recipient_name == "Abebe Kebede"
    assert cert1.recipient_email == "abebe@aau.edu.et"
    assert cert1.recipient_identity == "Addis Ababa University"
    assert cert1.custom_attributes["rank"] == "1st Place"
    assert cert1.custom_attributes["team_name"] == "ZeroDayWarriors"
    assert cert1.custom_attributes["track"] == "Binary Exploitation & Web"

    # Integrity verification must pass
    assert verify_certificate_integrity(cert1, settings.jwt_secret_key) is True

    # Check public verification for outsider
    cert1.issuer = issuer
    cert1.division = div
    cert1.member = None
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = cert1
    db.execute.return_value = mock_result

    public_res = await verify_certificate_public(db, cert1.cert_code, settings)
    assert public_res.is_valid is True
    assert public_res.is_external is True
    assert public_res.recipient_name == "Abebe Kebede"
    assert public_res.recipient_organization == "Addis Ababa University"
    assert public_res.custom_attributes["rank"] == "1st Place"

