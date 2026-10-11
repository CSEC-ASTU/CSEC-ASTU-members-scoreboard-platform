"""Bring the database schema up to date when the app starts.

Production has no shell access, so migrations run from code on every boot:

1. ``alembic upgrade head`` (normal path; a no-op when already current).
2. Compare the models with the real tables/columns. If anything the code needs is
   missing (e.g. a migration was skipped, or the database was created outside
   Alembic so the upgrade itself failed), create the missing tables and add missing
   nullable/defaulted columns.
3. If the upgrade failed but the schema now matches, stamp the database at head so
   future migrations apply normally.

A Postgres advisory lock serialises concurrent boots. Never raises: the outcome is
logged and exposed on /api/v1/health so it can be checked without database access.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import Connection, create_engine, inspect, pool, text

from app.config import Settings, get_settings

logger = logging.getLogger("app.migrations")

BACKEND_DIR = Path(__file__).resolve().parent.parent
_ADVISORY_LOCK_ID = 7_202_610  # arbitrary, app-specific


@dataclass
class SchemaStatus:
    checked: bool = False
    ok: bool = False
    revision: str | None = None
    head: str | None = None
    upgrade_error: str | None = None
    repaired: list[str] = field(default_factory=list)
    remaining_drift: list[str] = field(default_factory=list)


schema_status = SchemaStatus()


def sync_database_url(async_url: str) -> str:
    """Alembic and the startup check use the sync psycopg2 driver."""
    return (
        async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        .replace("ssl=require", "sslmode=require")
        .replace("?ssl=", "?sslmode=")
        .replace("&ssl=", "&sslmode=")
    )


def _alembic_config(settings: Settings):
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", sync_database_url(settings.database_url))
    # Keep the app's logging configuration (alembic.ini's fileConfig would disable it).
    cfg.attributes["configure_logger"] = False
    return cfg


def find_drift(conn: Connection) -> tuple[list, list]:
    """Return (missing_tables, missing_columns) for the models vs the live database."""
    import app.models  # noqa: F401  (register all models)
    from app.database import Base

    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())
    missing_tables, missing_columns = [], []
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            missing_tables.append(table)
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
        missing_columns.extend(col for col in table.columns if col.name not in existing_cols)
    return missing_tables, missing_columns


def _repair(conn: Connection, missing_tables: list, missing_columns: list) -> list[str]:
    from app.database import Base

    repaired: list[str] = []
    if missing_tables:
        Base.metadata.create_all(conn, tables=missing_tables, checkfirst=True)
        repaired += [f"created table {t.name}" for t in missing_tables]

    preparer = conn.dialect.identifier_preparer
    for col in missing_columns:
        default_sql = None
        if col.server_default is not None and hasattr(col.server_default, "arg"):
            arg = col.server_default.arg
            default_sql = arg.text if hasattr(arg, "text") else str(arg)
        if not col.nullable and default_sql is None:
            logger.error(
                "Cannot auto-add NOT NULL column %s.%s without a default; add a migration",
                col.table.name,
                col.name,
            )
            continue
        ddl = (
            f"ALTER TABLE {preparer.quote(col.table.name)} ADD COLUMN IF NOT EXISTS "
            f"{preparer.quote(col.name)} {col.type.compile(dialect=conn.dialect)}"
        )
        if default_sql is not None:
            ddl += f" DEFAULT {default_sql}"
        conn.execute(text(ddl))
        repaired.append(f"added column {col.table.name}.{col.name}")
    return repaired


def ensure_schema(settings: Settings | None = None) -> SchemaStatus:
    """Upgrade, verify and (if needed) repair the schema. Safe to call on every boot."""
    from alembic import command
    from alembic.runtime.migration import MigrationContext
    from alembic.script import ScriptDirectory

    settings = settings or get_settings()
    status = SchemaStatus(checked=True)
    cfg = _alembic_config(settings)
    status.head = ScriptDirectory.from_config(cfg).get_current_head()
    engine = create_engine(sync_database_url(settings.database_url), poolclass=pool.NullPool)
    try:
        with engine.connect() as lock_conn:
            lock_conn.execute(text("SELECT pg_advisory_lock(:id)"), {"id": _ADVISORY_LOCK_ID})
            lock_conn.commit()
            try:
                try:
                    command.upgrade(cfg, "head")
                except Exception as exc:  # e.g. tables exist but alembic_version doesn't
                    status.upgrade_error = f"{type(exc).__name__}: {str(exc).splitlines()[0][:300]}"
                    logger.warning("alembic upgrade failed, will verify and repair: %s", status.upgrade_error)

                with engine.begin() as conn:
                    missing_tables, missing_columns = find_drift(conn)
                    if missing_tables or missing_columns:
                        status.repaired = _repair(conn, missing_tables, missing_columns)
                        logger.warning("Schema repaired: %s", "; ".join(status.repaired) or "nothing repairable")

                with engine.connect() as conn:
                    missing_tables, missing_columns = find_drift(conn)
                    status.remaining_drift = [f"table {t.name}" for t in missing_tables] + [
                        f"column {c.table.name}.{c.name}" for c in missing_columns
                    ]

                if status.upgrade_error and not status.remaining_drift:
                    # purge: replace an unknown/foreign revision id (e.g. from an unmerged branch)
                    command.stamp(cfg, "head", purge=True)
                    logger.warning("Schema matches the models; stamped database at %s", status.head)

                with engine.connect() as conn:
                    status.revision = MigrationContext.configure(conn).get_current_revision()
            finally:
                lock_conn.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": _ADVISORY_LOCK_ID})
                lock_conn.commit()
    except Exception:
        logger.exception("Startup schema check failed")
    finally:
        engine.dispose()

    status.ok = bool(status.revision) and status.revision == status.head and not status.remaining_drift
    log = logger.info if status.ok else logger.error
    log(
        "Database schema %s (revision=%s head=%s repaired=%s remaining=%s)",
        "OK" if status.ok else "NOT OK",
        status.revision,
        status.head,
        status.repaired,
        status.remaining_drift,
    )
    schema_status.__dict__.update(status.__dict__)
    return status
