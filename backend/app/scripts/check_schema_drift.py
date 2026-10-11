"""Fail if the SQLAlchemy models and the migrated database schema disagree.

Run after `alembic upgrade head`:  python -m app.scripts.check_schema_drift
Catches model columns/tables that were added without a migration.
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import text

import app.models  # noqa: F401  (registers all models on Base.metadata)
from app.database import Base, engine


async def find_drift() -> list[str]:
    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT table_name, column_name FROM information_schema.columns "
                    "WHERE table_schema = 'public'"
                )
            )
        ).all()
    db_columns: dict[str, set[str]] = {}
    for table, column in rows:
        db_columns.setdefault(table, set()).add(column)

    problems = []
    for table in Base.metadata.sorted_tables:
        if table.name not in db_columns:
            problems.append(f"table '{table.name}' is defined in models but missing from the database")
            continue
        for column in table.columns:
            if column.name not in db_columns[table.name]:
                problems.append(f"column '{table.name}.{column.name}' is in the model but has no migration")
    return problems


def main() -> int:
    problems = asyncio.run(find_drift())
    for problem in problems:
        print(f"SCHEMA DRIFT: {problem}")
    if problems:
        print("Add an Alembic migration for the items above.")
        return 1
    print(f"Schema OK: {len(Base.metadata.sorted_tables)} tables match the migrations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
