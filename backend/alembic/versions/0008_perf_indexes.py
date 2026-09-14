"""Add high-performance B-tree and partial indexes for foreign keys and query paths.

Revision ID: 0008_perf_indexes
Revises: 0007_outsider_certs
Create Date: 2026-09-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_perf_indexes"
down_revision = "0007_outsider_certs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Members indexes
    op.create_index("ix_members_google_id", "members", ["google_id"])
    op.create_index("ix_members_student_id", "members", ["student_id"])
    op.create_index("ix_members_division_id", "members", ["division_id"])
    op.create_index("ix_members_secondary_division_id", "members", ["secondary_division_id"])

    # 2. Point Events indexes
    op.create_index("ix_point_events_member_id", "point_events", ["member_id"])
    op.create_index("ix_point_events_task_id", "point_events", ["task_id"])
    op.create_index("ix_point_events_division_id", "point_events", ["division_id"])
    op.create_index("ix_point_events_created_at", "point_events", ["created_at"])

    # 3. Partial index for pending approvals (micro-storage: only indexes pending items)
    op.create_index(
        "ix_point_events_pending_approval",
        "point_events",
        ["created_at"],
        postgresql_where=sa.text("status = 'pending'"),
    )

    # 4. Tasks foreign key index
    op.create_index("ix_tasks_division_id", "tasks", ["division_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_division_id", table_name="tasks")
    op.drop_index("ix_point_events_pending_approval", table_name="point_events")
    op.drop_index("ix_point_events_created_at", table_name="point_events")
    op.drop_index("ix_point_events_division_id", table_name="point_events")
    op.drop_index("ix_point_events_task_id", table_name="point_events")
    op.drop_index("ix_point_events_member_id", table_name="point_events")
    op.drop_index("ix_members_secondary_division_id", table_name="members")
    op.drop_index("ix_members_division_id", table_name="members")
    op.drop_index("ix_members_student_id", table_name="members")
    op.drop_index("ix_members_google_id", table_name="members")
