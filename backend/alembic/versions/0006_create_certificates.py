"""Create certificates table with cryptographic verification support.

Revision ID: 0006_create_certificates
Revises: 0005_add_member_contact_fields
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0006_create_certificates"
down_revision = "0005_add_member_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "certificates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("cert_code", sa.String(length=64), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("certificate_type", sa.String(length=64), nullable=False, server_default="completion"),
        sa.Column("academic_year", sa.Integer(), nullable=False),
        sa.Column("issued_by_id", UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="SET NULL"), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("signature_hash", sa.String(length=255), nullable=False),
        sa.Column("drive_file_id", sa.String(length=255), nullable=True),
        sa.Column("drive_view_link", sa.String(length=1000), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("revoked_reason", sa.String(length=500), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_certificates_cert_code", "certificates", ["cert_code"], unique=True)
    op.create_index("ix_certificates_member_id", "certificates", ["member_id"])
    op.create_index("ix_certificates_division_id", "certificates", ["division_id"])


def downgrade() -> None:
    op.drop_index("ix_certificates_division_id", table_name="certificates")
    op.drop_index("ix_certificates_member_id", table_name="certificates")
    op.drop_index("ix_certificates_cert_code", table_name="certificates")
    op.drop_table("certificates")
