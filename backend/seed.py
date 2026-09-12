"""Database Seed Script for CSEC ASTU Platform."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy import delete, select, func

from app.database import AsyncSessionLocal
from app.models import Division, Member, Permission, PlatformSetting, Task, PointEvent
from app.models.enums import MemberRole, PermissionScopeType, PointEventStatus, PointEventType

DIVISIONS_DATA = [
    {"name": "Capacity Building", "description": "Workshops, mentoring, external outreach, peer tutoring, and club leadership."},
    {"name": "Development", "description": "Full-stack web, mobile applications, cloud infrastructure, and software engineering."},
    {"name": "Competitive Programming", "description": "Algorithms, ICPC, data structures, competitive mathematics, and problem-solving."},
    {"name": "Data Science", "description": "Machine learning, AI, predictive modeling, analytics, and data engineering."},
    {"name": "Cybersecurity", "description": "Network security, CTFs, penetration testing, reverse engineering, and ethical hacking."},
    {"name": "Social Media", "description": "Content creation, graphic design, photography, video production, and public branding."},
    {"name": "Blockchain team", "description": "Smart contracts, Web3, decentralized applications, cryptography, and protocol research."},
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

CLUB_WIDE_TASKS = [
    {
        "title": "Weekly Lab Cleaning Duty",
        "category": "lab_cleaning",
        "base_points": 15,
        "description": "Complete assigned weekly lab cleaning, workspace maintenance, and hardware care.",
    },
    {
        "title": "Game Night Attendance",
        "category": "game_night",
        "base_points": 25,
        "description": "Attend scheduled bi-weekly community bonding and club game night.",
    },
    {
        "title": "Event Co-Organizer",
        "category": "event_organizing",
        "base_points": 50,
        "description": "Support logistics, registration, participant onboarding, or technical operations for a club-wide event.",
    },
    {
        "title": "Lead Event Organizer",
        "category": "event_organizing",
        "base_points": 125,
        "description": "Lead end-to-end planning, coordination, and execution of a major club-wide seminar, hackathon, or conference.",
    },
    {
        "title": "Game Night Organizer",
        "category": "game_night",
        "base_points": 60,
        "description": "Plan, prepare games, coordinate refreshments, and host the bi-weekly community game night.",
    },
    {
        "title": "External Event Representation",
        "category": "external_activity",
        "base_points": 75,
        "description": "Represent CSEC ASTU at an external hackathon, national competition, ICPC round, or tech conference.",
    },
]

# Track-specific additional bonus tasks per division
EXTRA_DIVISION_TASKS: dict[str, list[dict]] = {
    "Development": [
        {
            "title": "Development Open-Source Contribution",
            "category": "internal_bootcamp",
            "base_points": 40,
            "description": "Submit a merged pull request or feature addition to club platforms or division open-source repositories.",
        },
        {
            "title": "Development Code Review & Mentorship",
            "category": "academic_support",
            "base_points": 25,
            "description": "Conduct constructive code reviews and mentor junior developers during division development sprints.",
        },
    ],
    "Competitive Programming": [
        {
            "title": "CP Problem Setting & Editorial",
            "category": "academic_support",
            "base_points": 50,
            "description": "Author, test, and prepare test cases/editorials for internal division practice contests.",
        },
        {
            "title": "CP Contest Top Performer",
            "category": "external_activity",
            "base_points": 35,
            "description": "Place in top quartile in internal division algorithmic contest or speed-coding sprint.",
        },
    ],
    "Cybersecurity": [
        {
            "title": "Cybersecurity CTF Challenge Authoring",
            "category": "internal_bootcamp",
            "base_points": 45,
            "description": "Create a Jeopardy-style CTF challenge (pwn, web, reverse, forensics) with full writeup and flag verify.",
        },
        {
            "title": "Cybersecurity Lab Vulnerability Assessment",
            "category": "academic_support",
            "base_points": 30,
            "description": "Participate in internal security audits, penetration testing exercises, and write remediation reports.",
        },
    ],
    "Data Science": [
        {
            "title": "Data Science Dataset & Baseline Notebook",
            "category": "internal_bootcamp",
            "base_points": 40,
            "description": "Clean, document, and publish a machine learning dataset with an exploratory data analysis (EDA) notebook.",
        },
        {
            "title": "Data Science Kaggle / Challenge Sprint",
            "category": "event_organizing",
            "base_points": 45,
            "description": "Organize or place in the top leaderboard bracket of a division machine learning challenge sprint.",
        },
    ],
    "Capacity Building": [
        {
            "title": "Capacity Building Peer Tutoring Series",
            "category": "academic_support",
            "base_points": 40,
            "description": "Conduct scheduled peer tutoring or academic mentorship sessions for club members.",
        },
        {
            "title": "Capacity Building External Outreach Support",
            "category": "external_activity",
            "base_points": 60,
            "description": "Coordinate external speaker invites, sponsor partnerships, or high school tech outreach sessions.",
        },
    ],
    "Social Media": [
        {
            "title": "Social Media Promotional Graphic / Poster",
            "category": "social_media",
            "base_points": 25,
            "description": "Design an official promotional poster, carousel, or motion graphic for upcoming events or announcements.",
        },
        {
            "title": "Social Media Video Reel / Highlight Edit",
            "category": "social_media",
            "base_points": 40,
            "description": "Film, edit, and publish a high-quality event recap video, member spotlight, or promotional reel.",
        },
    ],
    "Blockchain team": [
        {
            "title": "Blockchain Smart Contract / DApp Demo",
            "category": "internal_bootcamp",
            "base_points": 45,
            "description": "Build, test, and deploy a verifiable smart contract or Web3 application prototype for division study.",
        },
        {
            "title": "Blockchain Protocol Deep-Dive Breakdown",
            "category": "internal_bootcamp",
            "base_points": 35,
            "description": "Deliver a technical deep dive on consensus mechanisms, ZK-rollups, Layer-2 scaling, or cryptography.",
        },
    ],
}

PRESIDENT_EMAIL = "milkessahabtamukebu@gmail.com"
PRESIDENT_NAME = "Milkessa Habtamu"
PRESIDENT_GOOGLE_ID = "103201334684228447710"


async def run_seed() -> None:
    print("Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # 1. Seed / Update Divisions
        # Handle rename of "Cyber Security" -> "Cybersecurity" if it exists
        old_cyber = (await db.execute(select(Division).where(Division.name == "Cyber Security"))).scalar_one_or_none()
        if old_cyber:
            old_cyber.name = "Cybersecurity"
            print("  [*] Renamed 'Cyber Security' to 'Cybersecurity'")

        divisions_map: dict[str, Division] = {}
        for div_data in DIVISIONS_DATA:
            res = await db.execute(select(Division).where(Division.name == div_data["name"]))
            div = res.scalar_one_or_none()
            if not div:
                div = Division(name=div_data["name"], description=div_data["description"])
                db.add(div)
                await db.flush()
                print(f"  [+] Created Division: {div.name}")
            else:
                div.description = div_data["description"]
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

        # 4. Remove all currently available tasks as requested
        print("  [-] Removing existing tasks from catalog...")
        await db.execute(delete(Task))
        await db.flush()

        # 5. Seed Club-Wide Tasks
        print("  [+] Seeding Club-Wide Tasks...")
        for t in CLUB_WIDE_TASKS:
            task = Task(
                title=t["title"],
                category=t["category"],
                base_points=t["base_points"],
                description=t["description"],
                division_id=None,
                active=True,
                is_repeatable=True,
                is_penalty=False,
            )
            db.add(task)
            print(f"      - [Club-Wide] {task.title} ({task.base_points} pts)")

        # 6. Seed Division-Specific Tasks under each division
        print("  [+] Seeding Division-Specific Tasks...")
        for div_name, div in divisions_map.items():
            print(f"    -> Division: {div_name}")

            # Standard division-specific trifecta
            standard_div_tasks = [
                {
                    "title": f"{div_name} Session Attendance",
                    "category": "division_session",
                    "base_points": 10,
                    "description": f"Attend scheduled weekly technical training and project session for {div_name}.",
                },
                {
                    "title": f"Deliver {div_name} Lecture",
                    "category": "internal_bootcamp",
                    "base_points": 75,
                    "description": f"Prepare and deliver an internal technical workshop, tutorial, or bootcamp lecture for {div_name}.",
                },
                {
                    "title": f"{div_name} Event Co-Organizer",
                    "category": "event_organizing",
                    "base_points": 50,
                    "description": f"Support operations, judging, or coordination for a {div_name} specific workshop or contest.",
                },
            ]

            # Combine with extra specialized tasks
            all_for_div = standard_div_tasks + EXTRA_DIVISION_TASKS.get(div_name, [])

            for t in all_for_div:
                task = Task(
                    title=t["title"],
                    category=t["category"],
                    base_points=t["base_points"],
                    description=t["description"],
                    division_id=div.id,
                    active=True,
                    is_repeatable=True,
                    is_penalty=False,
                )
                db.add(task)
                print(f"        * {task.title} ({task.base_points} pts)")

        # 7. Seed President Member
        res = await db.execute(select(Member).where(Member.email == PRESIDENT_EMAIL))
        president = res.scalar_one_or_none()
        dev_division = divisions_map.get("Development")

        if not president:
            president = Member(
                full_name=PRESIDENT_NAME,
                email=PRESIDENT_EMAIL,
                google_id=PRESIDENT_GOOGLE_ID,
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
            president.google_id = PRESIDENT_GOOGLE_ID
            president.division_id = dev_division.id if dev_division else president.division_id
            print(f"  [*] Updated President Member: {president.full_name} <{president.email}>")

        # 8. Seed Sample Audit Trail Point Events if none exist
        pe_count = (await db.execute(select(func.count()).select_from(PointEvent))).scalar() or 0
        if pe_count == 0 and president:
            print("  [+] Seeding Initial Sample Audit Log Point Events...")
            cleaning_task = (await db.execute(select(Task).where(Task.title == "Weekly Lab Cleaning Duty"))).scalars().first()
            gamenight_task = (await db.execute(select(Task).where(Task.title == "Game Night Attendance"))).scalars().first()

            sample_events = [
                PointEvent(
                    member_id=president.id,
                    task_id=cleaning_task.id if cleaning_task else None,
                    event_type=PointEventType.CLAIM,
                    points_delta=15,
                    reason="Completed scheduled weekly lab hardware & desk cleaning",
                    status=PointEventStatus.APPROVED,
                    approved_by=president.id,
                    academic_year=2026,
                ),
                PointEvent(
                    member_id=president.id,
                    task_id=gamenight_task.id if gamenight_task else None,
                    event_type=PointEventType.CLAIM,
                    points_delta=25,
                    reason="Attended bi-weekly club game night session",
                    status=PointEventStatus.APPROVED,
                    approved_by=president.id,
                    academic_year=2026,
                ),
                PointEvent(
                    member_id=president.id,
                    task_id=None,
                    event_type=PointEventType.MANUAL_ADJUSTMENT,
                    points_delta=50,
                    reason="Initial officer orientation buffer points grant",
                    status=PointEventStatus.APPROVED,
                    approved_by=president.id,
                    academic_year=2026,
                ),
            ]
            for ev in sample_events:
                db.add(ev)
            print("  [+] Added 3 initial audit trail ledger records.")

        await db.commit()
    print("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_seed())
