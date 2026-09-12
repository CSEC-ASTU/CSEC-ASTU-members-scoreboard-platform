import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.services.weekly_performers import (
    get_weekly_top_performers,
    format_weekly_digest_message,
)


@pytest.mark.asyncio
async def test_get_weekly_top_performers_aggregation():
    db = AsyncMock()

    # Mock database rows: (member_id, full_name, telegram_username, division_id, division_name, weekly_points)
    Row = MagicMock
    row1 = Row()
    row1.member_id = uuid.uuid4()
    row1.full_name = "Chala Bekele"
    row1.telegram_username = "chala_b"
    row1.division_id = uuid.uuid4()
    row1.division_name = "Cybersecurity"
    row1.weekly_points = 65

    row2 = Row()
    row2.member_id = uuid.uuid4()
    row2.full_name = "Abebe Kebede"
    row2.telegram_username = "abebe_k"
    row2.division_id = uuid.uuid4()
    row2.division_name = "Development"
    row2.weekly_points = 50

    row3 = Row()
    row3.member_id = uuid.uuid4()
    row3.full_name = "Biruk Tesfaye"
    row3.telegram_username = "biruk_t"
    row3.division_id = row1.division_id  # Same division as Chala, but fewer points
    row3.division_name = "Cybersecurity"
    row3.weekly_points = 30

    mock_result = MagicMock()
    mock_result.all.return_value = [row1, row2, row3]
    db.execute.return_value = mock_result

    data = await get_weekly_top_performers(db, days=7)

    assert data["total_active_earners"] == 3
    # Club-wide MVP should be Chala
    assert data["club_wide_top"][0]["full_name"] == "Chala Bekele"
    assert data["club_wide_top"][0]["weekly_points"] == 65

    # Division top:
    # Cybersecurity should be Chala (65), not Biruk (30)
    assert data["division_top"]["Cybersecurity"]["full_name"] == "Chala Bekele"
    # Development should be Abebe
    assert data["division_top"]["Development"]["full_name"] == "Abebe Kebede"

    # Message formatting
    msg = format_weekly_digest_message(data)
    assert "Club-Wide MVP of the Week" in msg
    assert "Chala Bekele" in msg
    assert "+65 pts" in msg
    assert "Development:" in msg
    assert "Abebe Kebede" in msg


def test_format_weekly_digest_empty():
    empty_data = {"club_wide_top": [], "division_top": {}}
    msg = format_weekly_digest_message(empty_data)
    assert "No points were recorded" in msg
