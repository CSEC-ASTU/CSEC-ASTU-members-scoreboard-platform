from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExternalRecipient(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    organization: str | None = Field(default=None, max_length=100)
    custom_attributes: dict[str, Any] = Field(default_factory=dict)


class CertificateCreate(BaseModel):
    template_id: str | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    certificate_type: str = Field(default="completion", max_length=64)
    division_id: UUID | None = None
    academic_year: int | None = None
    member_ids: list[UUID] = Field(default_factory=list)
    external_recipients: list[ExternalRecipient] = Field(default_factory=list)
    event_variables: dict[str, Any] = Field(default_factory=dict)
    send_email_notifications: bool = False


class CertificateRevokeRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CertificateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cert_code: str
    member_id: UUID | None = None
    recipient_name: str
    recipient_email: str | None = None
    recipient_identity: str | None = None
    is_external: bool = False
    custom_attributes: dict[str, Any] | None = None
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
    is_external: bool = False
    recipient_organization: str | None = None
    custom_attributes: dict[str, Any] | None = None
    division_name: str | None = None
    issuer_name: str | None = None
    drive_view_link: str | None = None
    is_valid: bool
    is_revoked: bool
    revoked_reason: str | None = None
    revoked_at: datetime | None = None
    signature_verified: bool
    verify_url: str
