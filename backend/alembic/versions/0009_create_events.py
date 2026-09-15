"""Create events table for Luma integration, physical RSVP, and certificate linking.

Revision ID: 0009_create_events
Revises: 0008_perf_indexes
Create Date: 2026-09-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0009_create_events"
down_revision = "0008_perf_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cover_image_url", sa.String(length=512), nullable=True),
        sa.Column("luma_url", sa.String(length=512), nullable=True),
        sa.Column("luma_event_id", sa.String(length=128), nullable=True),
        sa.Column("event_type", sa.String(length=32), nullable=False, server_default="external"),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("points_reward", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=False, server_default="ASTU Main Campus"),
        sa.Column("certificate_template_id", sa.String(length=128), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_events_slug", "events", ["slug"], unique=True)
    op.create_index("ix_events_division_id", "events", ["division_id"])
    op.create_index("ix_events_start_time", "events", ["start_time"])
    op.create_index("ix_events_is_published", "events", ["is_published"])


def downgrade() -> None:
    op.drop_index("ix_events_is_published", table_name="events")
    op.drop_index("ix_events_start_time", table_name="events")
    op.drop_index("ix_events_division_id", table_name="events")
    op.drop_index("ix_events_slug", table_name="events")
    op.drop_table("events")
