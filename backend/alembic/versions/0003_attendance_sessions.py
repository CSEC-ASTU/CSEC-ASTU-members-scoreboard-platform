"""Add attendance_sessions table and attendance_session_id to point_events.

Revision ID: 0003_attendance_sessions
Revises: 0002_dual_division_scoping
Create Date: 2026-09-10
"""

from alembic import op

revision = "0003_attendance_sessions"
down_revision = "0002_dual_division_scoping"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create attendance_sessions table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
            code VARCHAR(6) NOT NULL,
            created_by UUID REFERENCES members(id) ON DELETE SET NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS ix_attendance_sessions_code ON attendance_sessions(code);
        CREATE INDEX IF NOT EXISTS ix_attendance_sessions_active ON attendance_sessions(task_id, is_active);
        """
    )

    # 2. Add attendance_session_id to point_events table
    op.execute(
        """
        ALTER TABLE point_events 
        ADD COLUMN IF NOT EXISTS attendance_session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_member_session
        ON point_events(member_id, attendance_session_id)
        WHERE attendance_session_id IS NOT NULL AND status != 'rejected';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS uq_point_events_member_session;
        ALTER TABLE point_events DROP COLUMN IF EXISTS attendance_session_id;
        DROP TABLE IF EXISTS attendance_sessions;
        """
    )
