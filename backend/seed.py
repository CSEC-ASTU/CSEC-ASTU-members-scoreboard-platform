"""Database Seed Script for CSEC ASTU Platform."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Division, Member, Permission, PlatformSetting, Task
from app.models.enums import MemberRole, PermissionScopeType

DIVISIONS_DATA = [
    {"name": "Competitive Programming", "description": "Algorithms, ICPC, data structures, and problem-solving."},
    {"name": "Development", "description": "Full-stack web, mobile applications, and software engineering."},
    {"name": "Cyber Security", "description": "Network security, CTFs, penetration testing, and ethical hacking."},
    {"name": "Data Science", "description": "Machine learning, AI, analytics, and data visualization."},
    {"name": "Capacity Building", "description": "Workshops, mentoring, external outreach, and leadership."},
]

PERMISSIONS_DATA = [
    {"key": "approve_task", "description": "Approve task completion claims within designated scope", "scope_type": PermissionScopeType.TASK_CATEGORY},
    {"key": "manage_tasks", "description": "Create and edit task catalog entries", "scope_type": PermissionScopeType.CLUB},
    {"key": "cbd_head", "description": "Capacity building division coordination & delegation", "scope_type": PermissionScopeType.DIVISION},
    {"key": "social_media_manager", "description": "Manage social media claims and promotion tasks", "scope_type": PermissionScopeType.TASK_CATEGORY},
    {"key": "cleaning_duty_coordinator", "description": "Manage and approve lab cleaning duties", "scope_type": PermissionScopeType.TASK_CATEGORY},
    {"key": "import_members", "description": "Import member batches via Google Form CSV", "scope_type": PermissionScopeType.CLUB},
]

SETTINGS_DATA = [
    {"key": "score_cap", "value": 2500},
    {"key": "initial_buffer", "value": 50},
    {"key": "current_academic_year", "value": 2026},
    {
        "key": "badge_tier_multipliers",
        "value": {"gold": 1.0, "platinum": 1.5, "diamond": 2.0},
    },
]

TASKS_DATA = [
    {"title": "Attend Weekly Division Session", "category": "division_session", "base_points": 10, "description": "Attend your division's scheduled weekly technical session."},
    {"title": "Weekly Lab Cleaning Duty", "category": "lab_cleaning", "base_points": 15, "description": "Complete assigned lab cleaning duty for the week (confirmed)."},
    {"title": "Lead Organizer, Club-Wide Event", "category": "event_organizing", "base_points": 125, "description": "Lead club-wide seminar or hackathon as assigned by VP/President."},
    {"title": "Lead Organizer, Division Event", "category": "event_organizing", "base_points": 75, "description": "Lead division-specific technical workshop or seminar."},
    {"title": "Event Co-Organizer / Support", "category": "event_organizing", "base_points": 50, "description": "Support logistics, registration, and operations during events."},
    {"title": "Deliver Bootcamp Lecture", "category": "internal_bootcamp", "base_points": 75, "description": "Prepare and deliver an internal technical lecture or workshop."},
    {"title": "Prepare Bootcamp Material", "category": "internal_bootcamp", "base_points": 40, "description": "Create exercises, slides, or starter repos for internal bootcamps."},
    {"title": "Attend Bootcamp Session", "category": "internal_bootcamp", "base_points": 10, "description": "Participate actively as a learner in an internal bootcamp."},
    {"title": "External Event Representation", "category": "external_activity", "base_points": 75, "description": "Represent CSEC ASTU at an external hackathon, ICPC, or CTF."},
    {"title": "Game Night Attendance", "category": "game_night", "base_points": 25, "description": "Attend bi-weekly community bonding and game night."},
    {"title": "Game Night 3x Streak Bonus", "category": "game_night", "base_points": 25, "description": "Bonus for attending 3 consecutive game nights."},
    {"title": "Organize Game Night", "category": "game_night", "base_points": 60, "description": "Plan, prepare games, and host the bi-weekly game night."},
    {"title": "Deliver External Academic Lecture Support", "category": "academic_support", "base_points": 75, "description": "Deliver tutorial or lecture support assigned by CBD."},
    {"title": "Social Media Design Asset", "category": "social_media", "base_points": 25, "description": "Create promotional poster, motion graphic, or UI visual."},
    {"title": "Social Media Video Edit", "category": "social_media", "base_points": 40, "description": "Edit highlight reel, session recap, or promotional video."},
]

PRESIDENT_EMAIL = "milkessahabtamukebu@gmail.com"
PRESIDENT_NAME = "Milkessa Habtamu"


async def run_seed() -> None:
    print("Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # 1. Seed Divisions
        divisions_map = {}
        for div_data in DIVISIONS_DATA:
            res = await db.execute(select(Division).where(Division.name == div_data["name"]))
            div = res.scalar_one_or_none()
            if not div:
                div = Division(name=div_data["name"], description=div_data["description"])
                db.add(div)
                await db.flush()
                print(f"  [+] Created Division: {div.name}")
            else:
                print(f"  [*] Existing Division: {div.name}")
            divisions_map[div.name] = div

        # 2. Seed Permissions Catalog
        for perm_data in PERMISSIONS_DATA:
            res = await db.execute(select(Permission).where(Permission.key == perm_data["key"]))
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(
                    key=perm_data["key"],
                    description=perm_data["description"],
                    scope_type=perm_data["scope_type"],
                )
                db.add(perm)
                print(f"  [+] Created Permission: {perm.key}")

        # 3. Seed Platform Settings
        for setting_data in SETTINGS_DATA:
            res = await db.execute(select(PlatformSetting).where(PlatformSetting.key == setting_data["key"]))
            setting = res.scalar_one_or_none()
            if not setting:
                setting = PlatformSetting(key=setting_data["key"], value=setting_data["value"])
                db.add(setting)
                print(f"  [+] Created Setting: {setting.key}")

        # 4. Seed Tasks Catalog
        for task_data in TASKS_DATA:
            res = await db.execute(select(Task).where(Task.title == task_data["title"]))
            task = res.scalar_one_or_none()
            if not task:
                task = Task(
                    title=task_data["title"],
                    category=task_data["category"],
                    base_points=task_data["base_points"],
                    description=task_data["description"],
                    active=True,
                    is_repeatable=True,
                    is_penalty=False,
                )
                db.add(task)
                print(f"  [+] Created Task: {task.title} ({task.base_points} pts)")

        # 5. Seed President Member
        res = await db.execute(select(Member).where(Member.email == PRESIDENT_EMAIL))
        president = res.scalar_one_or_none()
        dev_division = divisions_map.get("Development")

        if not president:
            president = Member(
                full_name=PRESIDENT_NAME,
                email=PRESIDENT_EMAIL,
                role=MemberRole.PRESIDENT,
                department="Software Engineering",
                joining_year=2022,
                division_id=dev_division.id if dev_division else None,
                is_active=True,
            )
            db.add(president)
            print(f"  [+] Created President Member: {president.full_name} <{president.email}>")
        else:
            president.role = MemberRole.PRESIDENT
            president.is_active = True
            print(f"  [*] Updated President Member: {president.full_name} <{president.email}>")

        await db.commit()
    print("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_seed())
