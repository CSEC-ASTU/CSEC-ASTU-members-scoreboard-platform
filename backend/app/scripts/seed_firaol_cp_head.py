"""Seed Firaol Kefeni as Competitive Programming division head.

Run from this backend directory:
  python -m app.scripts.seed_firaol_cp_head
"""

from __future__ import annotations

import asyncio
import json

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Division, Member
from app.models.enums import MemberRole

EMAIL = "firaolkef@gmail.com"
FULL_NAME = "Firaol Kefeni"
DEPARTMENT = "Computer Science and Engineering (CSE)"
JOINING_YEAR = 2025
DIVISION_NAME = "Competitive Programming"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        div = (
            await db.execute(select(Division).where(Division.name == DIVISION_NAME))
        ).scalar_one_or_none()
        created_div = False
        if div is None:
            div = Division(name=DIVISION_NAME, description="CP / contest training")
            db.add(div)
            await db.flush()
            created_div = True

        member = (
            await db.execute(select(Member).where(Member.email == EMAIL.lower()))
        ).scalar_one_or_none()
        created = member is None
        if member is None:
            member = Member(
                full_name=FULL_NAME,
                email=EMAIL.lower(),
                department=DEPARTMENT,
                joining_year=JOINING_YEAR,
                division_id=div.id,
                role=MemberRole.DIVISION_HEAD,
                is_active=True,
            )
            db.add(member)
        else:
            member.full_name = FULL_NAME
            member.department = DEPARTMENT
            member.joining_year = JOINING_YEAR
            member.division_id = div.id
            member.role = MemberRole.DIVISION_HEAD
            member.is_active = True

        await db.flush()
        await db.commit()
        print(
            json.dumps(
                {
                    "created_member": created,
                    "created_division": created_div,
                    "member_id": str(member.id),
                    "email": member.email,
                    "role": member.role.value,
                    "division": DIVISION_NAME,
                    "division_id": str(member.division_id),
                    "google_claimed": member.google_id is not None,
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    asyncio.run(main())
