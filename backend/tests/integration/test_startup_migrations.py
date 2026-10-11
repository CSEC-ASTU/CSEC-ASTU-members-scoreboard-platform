"""The startup schema check must fix every state production might be in."""

from __future__ import annotations

import logging
import uuid

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

from app.config import get_settings
from app.database import Base
from app.db_migrations import _alembic_config, ensure_schema, sync_database_url


@pytest.fixture
def temp_db():
    """A brand-new empty database on the same server; dropped afterwards."""
    base = make_url(get_settings().database_url)
    name = f"csec_boot_{uuid.uuid4().hex[:8]}"
    admin = create_engine(sync_database_url(base.set(database="postgres").render_as_string(False)),
                          isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    settings = get_settings().model_copy(update={"database_url": base.set(database=name).render_as_string(False)})
    try:
        yield settings
    finally:
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()


def _sync(settings):
    return create_engine(sync_database_url(settings.database_url))


def _tables(settings) -> set[str]:
    eng = _sync(settings)
    try:
        with eng.connect() as conn:
            return set(inspect(conn).get_table_names())
    finally:
        eng.dispose()


def test_empty_database_is_migrated_to_head(temp_db):
    status = ensure_schema(temp_db)
    assert status.ok, status
    assert status.revision == status.head and status.repaired == []
    assert {"events", "members", "attendance_sessions"} <= _tables(temp_db)


def test_database_behind_on_migrations_is_upgraded(temp_db):
    """Production's likely state: migrations stopped before 0009 (no events table)."""
    from alembic import command

    command.upgrade(_alembic_config(temp_db), "0008_perf_indexes")
    assert "events" not in _tables(temp_db)
    status = ensure_schema(temp_db)
    assert status.ok, status
    assert "events" in _tables(temp_db) and status.repaired == []


def test_database_created_outside_alembic_is_repaired_and_stamped(temp_db):
    """Tables exist but no alembic_version, and some tables/columns are missing."""
    eng = _sync(temp_db)
    import app.models  # noqa: F401

    keep = [t for t in Base.metadata.sorted_tables if t.name not in {"events", "profile_change_requests"}]
    with eng.begin() as conn:
        Base.metadata.create_all(conn, tables=keep)
        conn.execute(text("ALTER TABLE attendance_sessions DROP COLUMN title"))
    eng.dispose()

    status = ensure_schema(temp_db)
    assert status.upgrade_error, "upgrade from scratch should fail on existing tables"
    assert "created table events" in status.repaired
    assert "added column attendance_sessions.title" in status.repaired
    assert status.ok and status.revision == status.head, status


def test_tables_missing_even_though_alembic_says_head(temp_db):
    eng = _sync(temp_db)
    ensure_schema(temp_db)
    with eng.begin() as conn:
        conn.execute(text("DROP TABLE events"))
    eng.dispose()
    status = ensure_schema(temp_db)
    assert status.ok and status.repaired == ["created table events"], status


def test_running_twice_is_a_no_op_and_keeps_app_logging(temp_db):
    ensure_schema(temp_db)
    status = ensure_schema(temp_db)
    assert status.ok and status.repaired == [] and status.upgrade_error is None
    assert not logging.getLogger("app").disabled
    assert not logging.getLogger("app.migrations").disabled


def test_unknown_revision_in_database_is_recovered(temp_db):
    """alembic_version points at a revision this code doesn't have (e.g. an unmerged branch)."""
    ensure_schema(temp_db)
    eng = _sync(temp_db)
    with eng.begin() as conn:
        conn.execute(text("UPDATE alembic_version SET version_num = '0099_from_another_branch'"))
        conn.execute(text("ALTER TABLE attendance_sessions DROP COLUMN title"))
    eng.dispose()
    status = ensure_schema(temp_db)
    assert status.upgrade_error and "0099_from_another_branch" in status.upgrade_error
    assert status.repaired == ["added column attendance_sessions.title"]
    assert status.ok and status.revision == status.head, status
