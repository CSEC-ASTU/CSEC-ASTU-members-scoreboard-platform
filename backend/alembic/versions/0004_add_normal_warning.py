"""Add normal_warning to point_event_type and notification_type enums.

Revision ID: 0004_add_normal_warning
Revises: 0003_attendance_sessions
Create Date: 2026-09-10
"""

from alembic import op

revision = "0004_add_normal_warning"
down_revision = "0003_attendance_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE point_event_type ADD VALUE IF NOT EXISTS 'normal_warning';")
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'normal_warning';")


def downgrade() -> None:
    pass
