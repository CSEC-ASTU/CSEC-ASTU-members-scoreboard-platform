import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.models import AttendanceSession, Division, Member, PointEvent, Task
from app.models.enums import MemberRole, PointEventStatus, PointEventType
from app.services.attendance_analytics import get_attendance_matrix


@pytest.mark.asyncio
async def test_attendance_matrix_on_time_and_late_detection():
    db = AsyncMock()

    now = datetime.now(UTC)
    session_start = now - timedelta(days=2)

    division_id = uuid.uuid4()
    div = Division(id=division_id, name="Cybersecurity")
    task = Task(id=uuid.uuid4(), title="Intro to Wireshark", base_points=10)

    # 1 session
    session = AttendanceSession(
        id=uuid.uuid4(),
        task_id=task.id,
        division_id=division_id,
        code="123456",
        is_active=False,
        created_at=session_start,
        expires_at=session_start + timedelta(minutes=60),
    )
    session.task = task
    session.division = div

    # 3 members:
    # Member 1: On-time (claimed 5 mins after session created)
    # Member 2: Late (claimed 20 mins after session created - >15 min threshold)
    # Member 3: Absent (no claim)
    m1 = Member(
        id=uuid.uuid4(),
        full_name="Abebe OnTime",
        email="ontime@astu.edu.et",
        role=MemberRole.MEMBER,
        division_id=division_id,
        is_active=True,
    )
    m1.division = div

    m2 = Member(
        id=uuid.uuid4(),
        full_name="Biruk Late",
        email="late@astu.edu.et",
        role=MemberRole.MEMBER,
        division_id=division_id,
        is_active=True,
    )
    m2.division = div

    m3 = Member(
        id=uuid.uuid4(),
        full_name="Chala Absent",
        email="absent@astu.edu.et",
        role=MemberRole.MEMBER,
        division_id=division_id,
        is_active=True,
    )
    m3.division = div

    # Event 1: On time (+5 min)
    ev1 = PointEvent(
        id=uuid.uuid4(),
        member_id=m1.id,
        attendance_session_id=session.id,
        event_type=PointEventType.CLAIM,
        points_delta=10,
        status=PointEventStatus.APPROVED,
        created_at=session_start + timedelta(minutes=5),
    )

    # Event 2: Late (+20 min > 15 min rule)
    ev2 = PointEvent(
        id=uuid.uuid4(),
        member_id=m2.id,
        attendance_session_id=session.id,
        event_type=PointEventType.CLAIM,
        points_delta=10,
        status=PointEventStatus.APPROVED,
        created_at=session_start + timedelta(minutes=20),
    )

    # Mock execute results:
    # Call 1: sessions
    # Call 2: members
    # Call 3: point events
    res_sessions = MagicMock()
    res_sessions.scalars.return_value.all.return_value = [session]

    res_members = MagicMock()
    res_members.scalars.return_value.all.return_value = [m1, m2, m3]

    res_events = MagicMock()
    res_events.scalars.return_value.all.return_value = [ev1, ev2]

    db.execute.side_effect = [res_sessions, res_members, res_events]

    matrix = await get_attendance_matrix(db, division_id=division_id, days=30)

    # Validate Columns
    assert len(matrix["columns"]) == 1
    assert matrix["columns"][0]["task_title"] == "Intro to Wireshark"

    # Validate KPI
    assert matrix["kpi"]["total_sessions"] == 1
    assert matrix["kpi"]["total_members"] == 3
    assert matrix["kpi"]["total_checkins"] == 2
    assert matrix["kpi"]["total_late_checkins"] == 1
    # 2 checkins out of 3 possible = 66.7%
    assert matrix["kpi"]["average_turnout_rate"] == 66.7
    # 1 on-time out of 2 checkins = 50.0%
    assert matrix["kpi"]["on_time_rate"] == 50.0

    # Validate Member Rows
    rows_by_id = {r["member_id"]: r for r in matrix["rows"]}

    # Member 1: On-Time
    row1 = rows_by_id[str(m1.id)]
    rec1 = row1["sessions"][str(session.id)]
    assert rec1["status"] == "present"
    assert rec1["delay_minutes"] == 5
    assert rec1["points_awarded"] == 10
    assert row1["stats"]["attended_count"] == 1
    assert row1["stats"]["late_count"] == 0

    # Member 2: Late (>15 mins)
    row2 = rows_by_id[str(m2.id)]
    rec2 = row2["sessions"][str(session.id)]
    assert rec2["status"] == "late"
    assert rec2["delay_minutes"] == 20
    assert rec2["points_awarded"] == 10  # Full points preserved!
    assert row2["stats"]["attended_count"] == 1
    assert row2["stats"]["late_count"] == 1

    # Member 3: Absent
    row3 = rows_by_id[str(m3.id)]
    rec3 = row3["sessions"][str(session.id)]
    assert rec3["status"] == "absent"
    assert rec3["delay_minutes"] is None
    assert rec3["points_awarded"] == 0
    assert row3["stats"]["attended_count"] == 0


async def test_attendance_matrix_club_wide_and_custom_title():
    db = AsyncMock()
    now = datetime.now(UTC)

    # 1. Club-wide session with custom title
    club_session = MagicMock()
    club_session.id = uuid.uuid4()
    club_session.division_id = None
    club_session.title = "General Assembly #1"
    club_session.task = MagicMock()
    club_session.task.title = "Club-Wide General Meeting Attendance"
    club_session.division = None
    club_session.created_at = now - timedelta(days=2)
    club_session.is_active = False

    # Mock member
    m = MagicMock()
    m.id = uuid.uuid4()
    m.full_name = "Alice Leader"
    m.email = "alice@example.com"
    m.profile_image_url = None
    m.division_id = None
    m.division = None
    m.role = "president"

    res_sessions = MagicMock()
    res_sessions.scalars.return_value.all.return_value = [club_session]

    res_members = MagicMock()
    res_members.scalars.return_value.all.return_value = [m]

    res_events = MagicMock()
    res_events.scalars.return_value.all.return_value = []

    db.execute.side_effect = [res_sessions, res_members, res_events]

    matrix = await get_attendance_matrix(db, division_id=None, days=30)

    assert len(matrix["columns"]) == 1
    assert matrix["columns"][0]["task_title"] == "General Assembly #1"
    assert matrix["columns"][0]["division_name"] == "Club-wide"

