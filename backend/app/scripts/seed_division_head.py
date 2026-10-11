"""Create or promote a member to Division Head.

Run from the backend directory:
  python -m app.scripts.seed_division_head --email someone@astu.edu.et \
      --name "Full Name" --division "Competitive Programming" \
      [--department "Computer Science and Engineering (CSE)"] [--joining-year 2025]

No personal data lives in this file; everything is passed on the command line.
"""

from __future__ import annotations

import argparse
import asyncio
import json

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Division, Member
from app.models.enums import MemberRole


async def seed_division_head(
    email: str, name: str, division_name: str, department: str | None, joining_year: int | None
) -> dict:
    email = email.strip().lower()
    async with AsyncSessionLocal() as db:
        div = (await db.execute(select(Division).where(Division.name == division_name))).scalar_one_or_none()
        created_div = div is None
        if div is None:
            div = Division(name=division_name)
            db.add(div)
            await db.flush()

        member = (await db.execute(select(Member).where(Member.email == email))).scalar_one_or_none()
        created = member is None
        if member is None:
            member = Member(email=email, full_name=name, is_active=True)
            db.add(member)
        member.full_name = name
        member.division_id = div.id
        member.role = MemberRole.DIVISION_HEAD
        member.is_active = True
        if department:
            member.department = department
        if joining_year:
            member.joining_year = joining_year

        await db.commit()
        return {
            "created_member": created,
            "created_division": created_div,
            "member_id": str(member.id),
            "email": member.email,
            "role": member.role.value,
            "division": division_name,
            "google_claimed": member.google_id is not None,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote a Division Head")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--division", required=True, help='Division name, e.g. "Competitive Programming"')
    parser.add_argument("--department")
    parser.add_argument("--joining-year", type=int)
    args = parser.parse_args()
    result = asyncio.run(
        seed_division_head(args.email, args.name, args.division, args.department, args.joining_year)
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
