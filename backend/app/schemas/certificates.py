from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CertificateCreate(BaseModel):
    member_ids: list[UUID] = Field(min_length=1)
    division_id: UUID | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    certificate_type: str = Field(default="completion", max_length=64)
    academic_year: int | None = None


class CertificateRevokeRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CertificateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cert_code: str
    member_id: UUID
    division_id: UUID | None = None
    division_name: str | None = None
    title: str
    description: str | None = None
    certificate_type: str
    academic_year: int
    issued_by_id: UUID | None = None
    issuer_name: str | None = None
    issued_at: datetime
    signature_hash: str
    drive_file_id: str | None = None
    drive_view_link: str | None = None
    is_revoked: bool
    revoked_reason: str | None = None
    revoked_at: datetime | None = None
    member_name: str | None = None
    member_student_id: str | None = None
    member_department: str | None = None


class CertificatePublicVerify(BaseModel):
    cert_code: str
    title: str
    description: str | None = None
    certificate_type: str
    academic_year: int
    issued_at: datetime
    recipient_name: str
    recipient_student_id: str | None = None
    recipient_department: str | None = None
    division_name: str | None = None
    issuer_name: str | None = None
    drive_view_link: str | None = None
    is_valid: bool
    is_revoked: bool
    revoked_reason: str | None = None
    revoked_at: datetime | None = None
    signature_verified: bool
    verify_url: str
