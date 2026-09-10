"""Add student_id, phone_number, and github_url to members table.

Revision ID: 0005_add_member_contact_fields
Revises: 0004_add_normal_warning
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_member_contact_fields"
down_revision = "0004_add_normal_warning"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("members", sa.Column("student_id", sa.String(length=50), nullable=True))
    op.add_column("members", sa.Column("phone_number", sa.String(length=50), nullable=True))
    op.add_column("members", sa.Column("github_url", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("members", "github_url")
    op.drop_column("members", "phone_number")
    op.drop_column("members", "student_id")
