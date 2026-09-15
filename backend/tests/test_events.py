from datetime import UTC, datetime
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.routers.events import _extract_luma_event_id, _slugify, preview_luma_csv
from app.config import Settings
from app.models import Division, Event, Member
from app.models.enums import MemberRole
from app.schemas.events import LumaCSVPreviewRequest


def test_slugify_and_luma_id_extraction():
    slug = _slugify("Hands-on Reverse Engineering 101!")
    assert "hands-on-reverse-engineering-101" in slug

    assert _extract_luma_event_id("https://lu.ma/re-101") == "re-101"
    assert _extract_luma_event_id("https://lu.ma/event/evt-abcdef12345") == "evt-abcdef12345"
    assert _extract_luma_event_id("evt-999888") == "evt-999888"
    assert _extract_luma_event_id(None) is None


@pytest.mark.asyncio
async def test_preview_luma_csv_matching():
    # Mock active members in database
    member_alice = Member(
        id=uuid.uuid4(),
        full_name="Alice Smith",
        email="alice@astu.edu.et",
        student_id="UGR/1234/15",
        is_active=True,
    )
    div = Division(id=uuid.uuid4(), name="Cybersecurity")
    member_alice.division = div

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [member_alice]
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_result

    # Current user is President
    mock_officer = MagicMock()
    mock_officer.member = Member(
        id=uuid.uuid4(),
        full_name="President Officer",
        role=MemberRole.PRESIDENT,
        is_active=True,
    )

    csv_data = """Name,Email,Check-in Status,University / Organization,Track
Alice Smith,alice@astu.edu.et,Checked In,ASTU,Cybersecurity
Bob External,bob@gmail.com,Checked In,Addis Ababa University,AI & Data Science
Charlie NoShow,charlie@gmail.com,Registered,AAU,Software
"""

    req = LumaCSVPreviewRequest(csv_text=csv_data)
    res = await preview_luma_csv(req, mock_db, mock_officer)

    assert res.total_rows == 3
    assert res.checked_in_rows == 2
    assert res.detected_members == 1
    assert res.detected_externals == 2

    # Check Alice (Member)
    alice_row = next(a for a in res.attendees if a.name == "Alice Smith")
    assert alice_row.is_member is True
    assert alice_row.member_id == member_alice.id
    assert alice_row.member_student_id == "UGR/1234/15"
    assert alice_row.checked_in is True
    assert alice_row.custom_attributes.get("track") == "Cybersecurity"

    # Check Bob (External)
    bob_row = next(a for a in res.attendees if a.name == "Bob External")
    assert bob_row.is_member is False
    assert bob_row.member_id is None
    assert bob_row.checked_in is True
    assert "addis ababa university" in bob_row.custom_attributes.get("university___organization", "").lower()

    # Check Charlie (No show)
    charlie_row = next(a for a in res.attendees if a.name == "Charlie NoShow")
    assert charlie_row.checked_in is False
