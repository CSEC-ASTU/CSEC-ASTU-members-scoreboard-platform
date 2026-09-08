"""Dev seed: sample divisions + catalog tasks from PRD §5.

Usage (with DATABASE_URL set and migrations applied):

    python -m app.scripts.seed_dev
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Division, Task
from app.models.enums import MemberRole
from app.models.member import Member


SAMPLE_DIVISIONS = [
    ("Competitive Programming", "CP / contest training"),
    ("Development", "Web & software projects"),
    ("Social Media", "Content and outreach"),
    ("CBD", "Capacity building & lectures"),
]

# (title, category, base_points, is_penalty)
SAMPLE_TASKS = [
    ("Attend scheduled division session", "attendance", 10, False),
    ("Late to session (>15 min)", "attendance", 5, False),
    ("No-show, no notice", "attendance", -15, True),
    ("Completed lab cleaning duty", "cleaning_duty", 15, False),
    ("Missed cleaning duty, no swap", "cleaning_duty", -25, True),
    ("Lead organizer — club-wide seminar", "event_organizing", 125, False),
    ("Lead organizer — division seminar", "event_organizing", 75, False),
    ("Deliver bootcamp lecture", "bootcamp", 75, False),
    ("Attend bootcamp session", "bootcamp", 10, False),
    ("Game Night attendance", "game_night", 25, False),
    ("Game Night organizing", "game_night", 60, False),
    ("Yellow warning", "warning", -25, True),
    ("Red warning", "warning", -50, True),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for name, desc in SAMPLE_DIVISIONS:
            existing = await db.execute(select(Division).where(Division.name == name))
            if existing.scalar_one_or_none() is None:
                db.add(Division(name=name, description=desc))
        await db.flush()

        for title, category, points, is_penalty in SAMPLE_TASKS:
            existing = await db.execute(select(Task).where(Task.title == title))
            if existing.scalar_one_or_none() is None:
                db.add(
                    Task(
                        title=title,
                        category=category,
                        base_points=points,
                        is_penalty=is_penalty,
                        is_repeatable=True,
                        active=True,
                    )
                )

        # Optional bootstrap president (unclaimed until Google login)
        email = "president@astu.edu.et"
        existing = await db.execute(select(Member).where(Member.email == email))
        if existing.scalar_one_or_none() is None:
            db.add(
                Member(
                    full_name="Bootstrap President",
                    email=email,
                    role=MemberRole.PRESIDENT,
                    department="CSE",
                    joining_year=2024,
                )
            )
        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
