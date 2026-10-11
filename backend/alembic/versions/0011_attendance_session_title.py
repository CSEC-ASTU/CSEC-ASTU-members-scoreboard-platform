"""Add attendance_sessions.title (column existed in the model since Sep 13 without a migration).

Revision ID: 0011_attendance_session_title
Revises: 0010_profile_change_requests
Create Date: 2026-10-11
"""

from alembic import op

revision = "0011_attendance_session_title"
down_revision = "0010_profile_change_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS: some databases may have had the column added by hand.
    op.execute("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255)")


def downgrade() -> None:
    op.execute("ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS title")
