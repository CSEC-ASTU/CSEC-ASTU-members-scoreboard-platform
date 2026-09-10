import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import Division, Member
from app.services.import_members import import_members_csv


@pytest.mark.asyncio
async def test_import_csv_with_google_form_aliases():
    db = AsyncMock()
    dev_id = uuid.uuid4()
    dev_div = Division(id=dev_id, name="Development")

    mock_scalars = MagicMock()
    mock_scalars.__iter__.return_value = [dev_div]
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_res.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_res

    # CSV with Google Forms exact headers:
    # "Full Name", "Student ID", "Personal Email (use one you check regularly)", "Phone Number (+251)",
    # "Department", "Club Joining Year", "Club Division (Primary)",
    # "Telegram Profile URL (https://t.me/username)", "Github Profile URL (https://github.com/username)",
    # "Upload a clear, front-facing selfie"
    csv_content = (
        'Timestamp,Full Name,Student ID,University/Student Email,"Personal Email (use one you check regularly)","Phone Number (+251)",Department,Club Joining Year,Club Division (Primary),Telegram Profile URL (https://t.me/username),Github Profile URL (https://github.com/username),"Upload a clear, front-facing selfie"\n'
        "2026-09-01,Test Student,UGR/12345/14,student@astu.edu.et,testpersonal@gmail.com,+251912345678,Software Engineering,2025,Development,https://t.me/teststudent,https://github.com/teststudent,https://drive.google.com/open?id=12345\n"
    ).encode("utf-8")

    res = await import_members_csv(
        db,
        csv_content,
        importer_id=uuid.uuid4(),
        dry_run=False,
    )

    assert len(res.errors) == 0
    assert res.created == 1
    assert len(res.unmatched_divisions) == 0

    # Verify db.add received member with personal email, student ID, phone number, and github URL
    added_member = db.add.call_args[0][0]
    assert added_member.email == "testpersonal@gmail.com"
    assert added_member.student_id == "UGR/12345/14"
    assert added_member.phone_number == "+251912345678"
    assert added_member.github_url == "https://github.com/teststudent"
    assert added_member.telegram_username == "teststudent"
    assert added_member.profile_image_url == "https://drive.google.com/open?id=12345"


@pytest.mark.asyncio
async def test_import_csv_with_optional_secondary_division():
    db = AsyncMock()
    dev_id = uuid.uuid4()
    sec_id = uuid.uuid4()
    dev_div = Division(id=dev_id, name="Development")
    cyber_div = Division(id=sec_id, name="Cybersecurity")

    mock_scalars = MagicMock()
    mock_scalars.__iter__.return_value = [dev_div, cyber_div]
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_res.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_res

    # CSV with Secondary Division included and all 10 required fields
    csv_content = (
        'Full Name,Student ID,"Personal Email (use one you check regularly)","Phone Number (+251)",Department,Club Joining Year,Club Division (Primary),"Club Division (Secondary, if you have one)",Telegram Profile URL (https://t.me/username),Github Profile URL (https://github.com/username),"Upload a clear, front-facing selfie"\n'
        "Alice Smith,UGR/11111/14,alice@gmail.com,0911223344,Computer Science,2024,Development,Cybersecurity,https://t.me/alicesmith,https://github.com/alicesmith,https://drive.google.com/open?id=abc1\n"
        "Bob Jones,UGR/22222/14,bob@gmail.com,0922334455,Software Engineering,2025,Cybersecurity,,@bobjones,bobjones,https://drive.google.com/open?id=abc2\n"
    ).encode("utf-8")

    res = await import_members_csv(
        db,
        csv_content,
        importer_id=uuid.uuid4(),
        dry_run=True,
    )

    assert len(res.errors) == 0
    assert res.created == 2
    assert len(res.unmatched_divisions) == 0


@pytest.mark.asyncio
async def test_import_csv_missing_required_column():
    db = AsyncMock()
    # Missing github and phone number
    csv_content = (
        "Full Name,Student ID,Personal Email,Department,Joining Year,Primary Division\n"
        "Alice Smith,UGR/11111/14,alice@gmail.com,Computer Science,2024,Development\n"
    ).encode("utf-8")

    res = await import_members_csv(
        db,
        csv_content,
        importer_id=uuid.uuid4(),
        dry_run=True,
    )

    assert len(res.errors) == 1
    assert "missing required columns" in res.errors[0].issue

