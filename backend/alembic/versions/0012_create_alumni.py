"""Create alumni table for honorable alumni roster.

Revision ID: 0012_create_alumni
Revises: 0011_attendance_session_title
Create Date: 2026-10-21
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0012_create_alumni"
down_revision = "0011_attendance_session_title"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alumni",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("current_role", sa.String(255), nullable=False),
        sa.Column("division_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("division_name", sa.String(128), nullable=True),
        sa.Column("graduation_year", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("profile_url", sa.String(512), nullable=True),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alumni_division_id", "alumni", ["division_id"])
    op.create_index("ix_alumni_is_featured", "alumni", ["is_featured"])
    op.create_index("ix_alumni_is_active", "alumni", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_alumni_is_active", table_name="alumni")
    op.drop_index("ix_alumni_is_featured", table_name="alumni")
    op.drop_index("ix_alumni_division_id", table_name="alumni")
    op.drop_table("alumni")
