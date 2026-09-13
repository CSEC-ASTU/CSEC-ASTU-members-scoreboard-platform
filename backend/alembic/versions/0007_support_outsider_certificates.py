"""Support outsider and external participant certificates with dynamic attributes.

Revision ID: 0007_support_outsider_certificates
Revises: 0006_create_certificates
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID

revision = "0007_outsider_certs"
down_revision = "0006_create_certificates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Alter member_id to be nullable so outsiders without a member record can be issued certificates
    op.alter_column("certificates", "member_id", existing_type=UUID(as_uuid=True), nullable=True)

    # 2. Add recipient-specific fields for universal member + outsider support
    op.add_column("certificates", sa.Column("recipient_name", sa.String(length=255), nullable=True))
    op.add_column("certificates", sa.Column("recipient_email", sa.String(length=255), nullable=True))
    op.add_column("certificates", sa.Column("recipient_identity", sa.String(length=100), nullable=True))
    op.add_column("certificates", sa.Column("is_external", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("certificates", sa.Column("custom_attributes", JSON, nullable=True))

    # 3. Backfill recipient_name from members table for existing certificates (if any)
    op.execute(
        """
        UPDATE certificates
        SET recipient_name = COALESCE(members.full_name, 'Recipient'),
            recipient_email = members.email,
            recipient_identity = members.student_id
        FROM members
        WHERE certificates.member_id = members.id
        """
    )
    # Set default for any remaining rows where recipient_name might be null
    op.execute("UPDATE certificates SET recipient_name = 'Recipient' WHERE recipient_name IS NULL")
    op.alter_column("certificates", "recipient_name", nullable=False)


def downgrade() -> None:
    op.drop_column("certificates", "custom_attributes")
    op.drop_column("certificates", "is_external")
    op.drop_column("certificates", "recipient_identity")
    op.drop_column("certificates", "recipient_email")
    op.drop_column("certificates", "recipient_name")
    op.alter_column("certificates", "member_id", existing_type=UUID(as_uuid=True), nullable=False)
