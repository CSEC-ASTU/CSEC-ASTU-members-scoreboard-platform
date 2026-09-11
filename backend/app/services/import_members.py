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


REQUIRED_COLUMNS = {
    "full_name",
    "email",
    "student_id",
    "phone_number",
    "department",
    "joining_year",
    "division",
    "telegram_username",
    "github_url",
    "profile_image_url",
}

EXCLUDED_EMAIL_HEADERS = {
    "university student email",
    "university/student email",
    "student email",
    "university email",
    "astu email",
    "astu student email",
}

HEADER_ALIASES = {
    "email": [
        "personal email (use one you check regularly)",
        "personal email use one you check regularly",
        "personal email",
        "personal_email",
        "email address",
        "email",
        "e-mail",
        "mail",
    ],
    "student_id": [
        "student id",
        "student_id",
        "student id number",
        "id number",
        "id",
        "astu id",
        "student identification",
    ],
    "phone_number": [
        "phone number (+251)",
        "phone number +251",
        "phone number",
        "phone_number",
        "phone",
        "mobile number",
        "mobile",
        "phone no",
        "tel",
        "telephone",
    ],
    "full_name": [
        "full_name",
        "full name",
        "name",
        "student name",
        "fullname",
        "your name",
        "first and last name",
        "member name",
    ],
    "department": [
        "department",
        "dept",
        "academic department",
        "field of study",
        "program",
        "stream",
        "major",
    ],
    "joining_year": [
        "club joining year",
        "joining_year",
        "joining year",
        "year",
        "batch",
        "entry year",
        "club entry year",
        "batch year",
    ],
    "division": [
        "club division (primary)",
        "club division primary",
        "primary division",
        "club division",
        "division",
        "track",
        "assigned division",
        "division choice",
        "preferred division",
        "first division",
        "division 1",
    ],
    "secondary_division": [
        "club division (secondary, if you have one)",
        "club division secondary if you have one",
        "club division (secondary)",
        "club division secondary",
        "secondary_division",
        "secondary division",
        "second division",
        "secondary track",
        "optional second division",
        "secondary choice",
        "division 2",
        "track 2",
        "minor division",
    ],
    "telegram_username": [
        "telegram profile url (https://t.me/username)",
        "telegram profile url",
        "telegram profile",
        "telegram url",
        "telegram",
        "telegram handle",
        "telegram username",
        "telegram_username",
        "@telegram",
    ],
    "github_url": [
        "github profile url (https://github.com/username)",
        "github profile url",
        "github profile",
        "github url",
        "github",
        "github_url",
        "github username",
        "github link",
    ],
    "profile_image_url": [
        "upload a clear, front-facing selfie",
        "upload a clear front-facing selfie",
        "upload a clear front facing selfie",
        "clear, front-facing selfie",
        "front-facing selfie",
        "selfie",
        "profile_image_url",
        "profile image",
        "profile picture",
        "profile photo",
        "photo",
        "avatar",
        "picture",
        "upload selfie",
    ],
}


def extract_telegram_username(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned:
        return ""
    cleaned = cleaned.rstrip("/")
    if "t.me/" in cleaned.lower():
        cleaned = cleaned.split("t.me/")[-1]
    elif "telegram.me/" in cleaned.lower():
        cleaned = cleaned.split("telegram.me/")[-1]
    cleaned = cleaned.split("?")[0].lstrip("@").strip()
    return cleaned


def extract_github_url(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned:
        return ""
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned
    cleaned = cleaned.lstrip("@").strip()
    return f"https://github.com/{cleaned}"


def normalize_drive_image_url(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned:
        return ""
    import re
    m = re.search(r"drive\.google\.com/(?:open\?id=|file/d/|uc\?.*id=)([a-zA-Z0-9_-]+)", cleaned)
    if m:
        return f"https://lh3.googleusercontent.com/d/{m.group(1)}"
    return cleaned


DIVISION_ALIASES: dict[str, str] = {
    # Form export division names mapped to internal canonical names
    "competitive programming division": "competitive programming",
    "competitive programming": "competitive programming",
    "development division": "development",
    "development": "development",
    "cybersecurity division": "cybersecurity",
    "cybersecurity": "cybersecurity",
    "cyber security division": "cybersecurity",
    "cyber security": "cybersecurity",
    "data science division": "data science",
    "data science": "data science",
    "social media division": "social media",
    "social media": "social media",
    "blockchain team": "blockchain team",
    "blockchain division": "blockchain team",
    "blockchain": "blockchain team",
    "capacity building division": "capacity building",
    "capacity building": "capacity building",
    "cbd": "capacity building",
    "cp": "competitive programming",
    "dev": "development",
}


def resolve_division(raw_name: str, divisions_by_name: dict[str, Division]) -> Division | None:
    if not raw_name:
        return None
    cleaned = " ".join(raw_name.strip().lower().split())
    if not cleaned:
        return None

    # 1. Exact match in DB
    if cleaned in divisions_by_name:
        return divisions_by_name[cleaned]

    # 2. Known alias mapping
    canonical = DIVISION_ALIASES.get(cleaned)
    if canonical and canonical in divisions_by_name:
        return divisions_by_name[canonical]

    # 3. Strip trailing suffix like ' division', ' team', ' track'
    stripped = cleaned
    for suffix in (" division", " team", " track"):
        if stripped.endswith(suffix):
            candidate = stripped[: -len(suffix)].strip()
            if candidate in divisions_by_name:
                return divisions_by_name[candidate]
            if candidate in DIVISION_ALIASES and DIVISION_ALIASES[candidate] in divisions_by_name:
                return divisions_by_name[DIVISION_ALIASES[candidate]]

    # 4. Substring / word boundary containment fallback
    for div_name, div in divisions_by_name.items():
        if div_name in cleaned or cleaned in div_name:
            return div

    return None


async def import_members_csv(
    db: AsyncSession,
    content: bytes,
    importer_id: UUID,
    dry_run: bool = False,
) -> ImportResult:
    try:
        text = content.decode("utf-8-sig")
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

    # Intelligent header mapping supporting Google Form export synonyms
    col_map: dict[str, str] = {}
    for raw_f in reader.fieldnames:
        clean = raw_f.strip().lower()
        clean_simple = " ".join(
            clean.replace("(", " ")
            .replace(")", " ")
            .replace("/", " ")
            .replace("_", " ")
            .replace("-", " ")
            .replace(",", " ")
            .split()
        )
        if clean_simple in EXCLUDED_EMAIL_HEADERS or clean in EXCLUDED_EMAIL_HEADERS:
            continue

        for canonical, aliases in HEADER_ALIASES.items():
            if clean == canonical or clean in aliases or clean_simple in aliases:
                # If canonical is 'email' and we already mapped something, personal email takes precedence
                if canonical == "email" and "email" in col_map:
                    if "personal" in clean_simple and "personal" not in col_map["email"].lower():
                        col_map["email"] = raw_f
                elif canonical not in col_map:
                    col_map[canonical] = raw_f
                break

    missing = REQUIRED_COLUMNS - set(col_map.keys())
    if missing:
        return ImportResult(
            created=0,
            updated=0,
            errors=[
                ImportErrorRow(
                    row=0,
                    email="",
                    issue=f"missing required columns: {', '.join(sorted(missing))}. Expected headers like: Full Name, Personal Email (use one you check regularly), Student ID, Phone Number (+251), Department, Club Joining Year, Club Division (Primary), Telegram Profile URL, Github Profile URL, Upload a clear, front-facing selfie. Optional: Club Division (Secondary)",
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
        email = (raw_row.get(col_map["email"]) or "").strip().lower()
        full_name = (raw_row.get(col_map["full_name"]) or "").strip()
        student_id = (raw_row.get(col_map.get("student_id", "")) or "").strip()
        phone_number = (raw_row.get(col_map.get("phone_number", "")) or "").strip()
        department = (raw_row.get(col_map.get("department", "")) or "").strip()
        division_name = (raw_row.get(col_map.get("division", "")) or "").strip()
        joining_raw = (raw_row.get(col_map.get("joining_year", "")) or "").strip()

        tele_col = col_map.get("telegram_username")
        telegram_val = (raw_row.get(tele_col) or "").strip() if tele_col else ""
        telegram_raw = extract_telegram_username(telegram_val)

        github_col = col_map.get("github_url")
        github_val = (raw_row.get(github_col) or "").strip() if github_col else ""
        github_raw = extract_github_url(github_val)

        photo_col = col_map.get("profile_image_url")
        photo_raw = normalize_drive_image_url(raw_row.get(photo_col) or "") if photo_col else ""

        if not email:
            errors.append(ImportErrorRow(row=idx, email="", issue="missing required field: email (personal email)"))
            continue
        if not full_name:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: full_name"))
            continue
        if not student_id:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: student_id"))
            continue
        if not phone_number:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: phone_number"))
            continue
        if not department:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: department"))
            continue
        if not joining_raw:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: joining_year"))
            continue
        if not division_name:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: division"))
            continue
        if not telegram_raw:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: telegram_username"))
            continue
        if not github_raw:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: github_url"))
            continue
        if not photo_raw:
            errors.append(ImportErrorRow(row=idx, email=email, issue="missing required field: profile_image_url (Selfie URL)"))
            continue

        try:
            joining_year = int(joining_raw)
        except ValueError:
            errors.append(
                ImportErrorRow(row=idx, email=email, issue=f"invalid joining_year: {joining_raw}")
            )
            continue

        division_id = None
        div = resolve_division(division_name, divisions_by_name)
        if div is None:
            unmatched.append(
                ImportUnmatchedDivision(row=idx, email=email, division_name=division_name)
            )
        else:
            division_id = div.id

        # Secondary division is optional
        sec_col = col_map.get("secondary_division")
        sec_division_name = (raw_row.get(sec_col) or "").strip() if sec_col else ""
        sec_division_id = None
        if sec_division_name:
            sec_div = resolve_division(sec_division_name, divisions_by_name)
            if sec_div is not None:
                # Disallow selecting same division as primary
                if sec_div.id != division_id:
                    sec_division_id = sec_div.id
            else:
                unmatched.append(
                    ImportUnmatchedDivision(row=idx, email=email, division_name=f"Secondary: {sec_division_name}")
                )

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
                student_id=student_id,
                phone_number=phone_number,
                github_url=github_raw,
                profile_image_url=photo_raw or None,
                department=department,
                joining_year=joining_year,
                division_id=division_id,
                secondary_division_id=sec_division_id,
                telegram_username=telegram_raw,
                role=MemberRole.MEMBER,
                imported_by=importer_id,
            )
            db.add(member)
            created += 1
        else:
            # Refresh import fields only — never touch google_id, role, is_active, scores
            member.department = department
            member.joining_year = joining_year
            if student_id:
                member.student_id = student_id
            if phone_number:
                member.phone_number = phone_number
            if github_raw:
                member.github_url = github_raw
            if photo_raw and not member.profile_image_url:
                member.profile_image_url = photo_raw
            if division_id is not None:
                member.division_id = division_id
            if sec_division_id is not None:
                member.secondary_division_id = sec_division_id
            if telegram_raw and not member.telegram_username:
                member.telegram_username = telegram_raw
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
