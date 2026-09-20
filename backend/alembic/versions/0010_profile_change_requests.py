"""Create profile_change_requests table for sensitive profile approval workflow.

Revision ID: 0010_profile_change_requests
Revises: 0009_create_events
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID

revision = "0010_profile_change_requests"
down_revision = "0009_create_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use postgresql.ENUM with create_type=False so create_table does not
    # emit a second CREATE TYPE (sa.Enum(checkfirst) still races with table DDL).
    profile_change_status = ENUM(
        "pending",
        "approved",
        "rejected",
        "cancelled",
        name="profile_change_status",
        create_type=False,
    )
    bind = op.get_bind()
    profile_change_status.create(bind, checkfirst=True)

    op.create_table(
        "profile_change_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("member_id", UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "status",
            profile_change_status,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("proposed_changes", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("current_snapshot", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("proposed_profile_image_url", sa.Text(), nullable=True),
        sa.Column("current_profile_image_url", sa.Text(), nullable=True),
        sa.Column("remove_profile_image", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("notified_officer_ids", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_profile_change_requests_member_id", "profile_change_requests", ["member_id"])
    op.create_index("ix_profile_change_requests_status", "profile_change_requests", ["status"])
    op.create_index("ix_profile_change_requests_created_at", "profile_change_requests", ["created_at"])
    # At most one pending request per member
    op.create_index(
        "uq_profile_change_requests_one_pending",
        "profile_change_requests",
        ["member_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("uq_profile_change_requests_one_pending", table_name="profile_change_requests")
    op.drop_index("ix_profile_change_requests_created_at", table_name="profile_change_requests")
    op.drop_index("ix_profile_change_requests_status", table_name="profile_change_requests")
    op.drop_index("ix_profile_change_requests_member_id", table_name="profile_change_requests")
    op.drop_table("profile_change_requests")
    ENUM(name="profile_change_status").drop(op.get_bind(), checkfirst=True)
