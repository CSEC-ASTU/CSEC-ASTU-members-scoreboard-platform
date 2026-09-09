"""CSV member import from Google Form export."""

from __future__ import annotations

import csv
import io
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Division, Member
from app.models.enums import MemberRole
from app.schemas import ImportErrorRow, ImportResult, ImportUnmatchedDivision


REQUIRED_COLUMNS = {"full_name", "email", "department", "joining_year", "division"}


async def import_members_csv(
    db: AsyncSession,
    raw: bytes,
    *,
    importer_id: UUID,
    dry_run: bool = False,
) -> ImportResult:
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return ImportResult(
            created=0,
            updated=0,
            errors=[ImportErrorRow(row=0, email="", issue="file is not valid UTF-8")],
            unmatched_divisions=[],
        )

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return ImportResult(
            created=0,
            updated=0,
            errors=[ImportErrorRow(row=0, email="", issue="empty CSV")],
            unmatched_divisions=[],
        )

    normalized_fields = {f.strip().lower(): f for f in reader.fieldnames}
    missing = REQUIRED_COLUMNS - set(normalized_fields)
    if missing:
        return ImportResult(
            created=0,
            updated=0,
            errors=[
                ImportErrorRow(
                    row=0,
                    email="",
                    issue=f"missing required columns: {', '.join(sorted(missing))}",
                )
            ],
            unmatched_divisions=[],
        )

    div_result = await db.execute(select(Division))
    divisions_by_name = {d.name.strip().lower(): d for d in div_result.scalars()}

    created = 0
    updated = 0
    errors: list[ImportErrorRow] = []
    unmatched: list[ImportUnmatchedDivision] = []

    for idx, raw_row in enumerate(reader, start=2):  # header is row 1
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}
        email = row.get("email", "").lower()
        full_name = row.get("full_name", "")
        department = row.get("department") or None
        division_name = row.get("division", "")
        joining_raw = row.get("joining_year", "")

        if not email:
            errors.append(ImportErrorRow(row=idx, email="", issue="missing required field: email"))
            continue
        if not full_name:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: full_name"))
            continue

        joining_year: int | None = None
        if joining_raw:
            try:
                joining_year = int(joining_raw)
            except ValueError:
                errors.append(
                    ImportErrorRow(row=idx, email=email, issue=f"invalid joining_year: {joining_raw}")
                )
                continue

        division_id = None
        if division_name:
            div = divisions_by_name.get(division_name.lower())
            if div is None:
                unmatched.append(
                    ImportUnmatchedDivision(row=idx, email=email, division_name=division_name)
                )
            else:
                division_id = div.id

        sec_division_name = row.get("secondary_division") or row.get("secondary division") or ""
        sec_division_id = None
        if sec_division_name:
            sec_div = divisions_by_name.get(sec_division_name.lower())
            if sec_div is not None:
                sec_division_id = sec_div.id

        existing = await db.execute(select(Member).where(Member.email == email))
        member = existing.scalar_one_or_none()

        if dry_run:
            if member is None:
                created += 1
            else:
                updated += 1
            continue

        if member is None:
            member = Member(
                full_name=full_name,
                email=email,
                department=department,
                joining_year=joining_year,
                division_id=division_id,
                secondary_division_id=sec_division_id,
                role=MemberRole.MEMBER,
                imported_by=importer_id,
            )
            db.add(member)
            created += 1
        else:
            # Refresh import fields only — never touch google_id, role, is_active, scores
            member.department = department
            member.joining_year = joining_year
            if division_id is not None:
                member.division_id = division_id
            if sec_division_id is not None:
                member.secondary_division_id = sec_division_id
            # Optionally refresh name if still unclaimed
            if member.google_id is None:
                member.full_name = full_name
            updated += 1

    if not dry_run:
        await db.flush()

    return ImportResult(
        created=created,
        updated=updated,
        errors=errors,
        unmatched_divisions=unmatched,
    )
