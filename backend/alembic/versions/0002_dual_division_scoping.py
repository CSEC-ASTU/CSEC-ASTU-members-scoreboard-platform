"""Add secondary_division_id to members and division_id to point_events.

Revision ID: 0002_dual_division_scoping
Revises: 0001_phase1
Create Date: 2026-09-08
"""

from alembic import op

revision = "0002_dual_division_scoping"
down_revision = "0001_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add secondary_division_id to members table
    op.execute(
        """
        ALTER TABLE members 
        ADD COLUMN IF NOT EXISTS secondary_division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
        """
    )

    # 2. Add division_id to point_events table
    op.execute(
        """
        ALTER TABLE point_events 
        ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
        """
    )

    # 3. Backfill point_events.division_id from associated task's division_id,
    # or fallback to submitter's division_id
    op.execute(
        """
        UPDATE point_events pe
        SET division_id = COALESCE(t.division_id, m.division_id)
        FROM members m, tasks t
        WHERE pe.member_id = m.id AND pe.task_id = t.id AND pe.division_id IS NULL;

        UPDATE point_events pe
        SET division_id = m.division_id
        FROM members m
        WHERE pe.member_id = m.id AND pe.task_id IS NULL AND pe.division_id IS NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE point_events DROP COLUMN IF EXISTS division_id;
        ALTER TABLE members DROP COLUMN IF EXISTS secondary_division_id;
        """
    )
