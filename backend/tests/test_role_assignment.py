import uuid
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException

from app.api.v1.routers.members import update_member
from app.models.enums import MemberRole
from app.models.member import Member
from app.schemas import MemberAdminUpdate


class DummyUser:
    def __init__(self, member):
        self.member = member
        self.id = member.id
        self.permissions = []


def make_dummy_member(role: MemberRole, division_id=None, full_name="Test User"):
    m = MagicMock(spec=Member)
    m.id = uuid.uuid4()
    m.role = role
    m.division_id = division_id
    m.secondary_division_id = None
    m.department = "Software Engineering"
    m.student_id = "UGR/1234/14"
    m.phone_number = "+251911223344"
    m.github_url = None
    m.telegram_username = None
    m.full_name = full_name
    m.email = f"{full_name.lower().replace(' ', '.')}@example.com"
    m.profile_image_url = None
    m.is_active = True
    m.joining_year = 2024
    m.created_at = None
    m.updated_at = None
    m.division = None
    return m


@pytest.mark.asyncio
async def test_president_assigns_vice_president():
    president = make_dummy_member(MemberRole.PRESIDENT, full_name="President Alice")
    target = make_dummy_member(MemberRole.MEMBER, full_name="Bob")

    db = AsyncMock()
    db.get.return_value = target
    db.add = MagicMock()
    db.flush = AsyncMock()

    body = MemberAdminUpdate(role=MemberRole.VICE_PRESIDENT)
    user = DummyUser(president)

    # We mock get_member call at end of update_member
    from unittest.mock import patch
    with patch("app.api.v1.routers.members.get_member", new=AsyncMock(return_value=MagicMock())):
        await update_member(member_id=target.id, body=body, db=db, user=user)

    assert target.role == MemberRole.VICE_PRESIDENT
    assert db.add.call_count == 1
    grant_record = db.add.call_args[0][0]
    assert grant_record.permission_key == "role:vice_president"
    assert grant_record.action == "role_assigned"


@pytest.mark.asyncio
async def test_president_succession_transfer():
    president = make_dummy_member(MemberRole.PRESIDENT, full_name="Alice OldPresident")
    target = make_dummy_member(MemberRole.VICE_PRESIDENT, full_name="Bob NewPresident")

    db = AsyncMock()
    db.get.return_value = target
    db.add = MagicMock()
    db.flush = AsyncMock()

    body = MemberAdminUpdate(role=MemberRole.PRESIDENT)
    user = DummyUser(president)

    from unittest.mock import patch
    with patch("app.api.v1.routers.members.get_member", new=AsyncMock(return_value=MagicMock())):
        await update_member(member_id=target.id, body=body, db=db, user=user)

    # Target becomes president
    assert target.role == MemberRole.PRESIDENT
    # Previous president transitions to vice president
    assert president.role == MemberRole.VICE_PRESIDENT
    # Two audit history records: actor step-down, target promotion
    assert db.add.call_count == 2


@pytest.mark.asyncio
async def test_vp_assigns_division_head_with_division():
    vp = make_dummy_member(MemberRole.VICE_PRESIDENT, full_name="VP Alice")
    target = make_dummy_member(MemberRole.MEMBER, full_name="Member Charlie")
    division_id = uuid.uuid4()

    db = AsyncMock()
    db.get.return_value = target
    db.add = MagicMock()
    db.flush = AsyncMock()

    body = MemberAdminUpdate(role=MemberRole.DIVISION_HEAD, division_id=division_id)
    user = DummyUser(vp)

    from unittest.mock import patch
    with patch("app.api.v1.routers.members.get_member", new=AsyncMock(return_value=MagicMock())):
        await update_member(member_id=target.id, body=body, db=db, user=user)

    assert target.role == MemberRole.DIVISION_HEAD
    assert target.division_id == division_id


@pytest.mark.asyncio
async def test_division_head_requires_division():
    president = make_dummy_member(MemberRole.PRESIDENT, full_name="President Alice")
    target = make_dummy_member(MemberRole.MEMBER, full_name="Member Charlie", division_id=None)

    db = AsyncMock()
    db.get.return_value = target

    body = MemberAdminUpdate(role=MemberRole.DIVISION_HEAD)
    user = DummyUser(president)

    with pytest.raises(HTTPException) as exc_info:
        await update_member(member_id=target.id, body=body, db=db, user=user)

    assert exc_info.value.status_code == 400
    assert "Division Head role requires selecting a primary division" in exc_info.value.detail


@pytest.mark.asyncio
async def test_vp_cannot_assign_executive_roles():
    vp = make_dummy_member(MemberRole.VICE_PRESIDENT, full_name="VP Alice")
    target = make_dummy_member(MemberRole.MEMBER, full_name="Member Charlie")

    db = AsyncMock()
    db.get.return_value = target

    user = DummyUser(vp)

    # Cannot assign Vice President
    with pytest.raises(HTTPException) as exc_info:
        await update_member(
            member_id=target.id,
            body=MemberAdminUpdate(role=MemberRole.VICE_PRESIDENT),
            db=db,
            user=user,
        )
    assert exc_info.value.status_code == 403

    # Cannot assign President
    with pytest.raises(HTTPException) as exc_info:
        await update_member(
            member_id=target.id,
            body=MemberAdminUpdate(role=MemberRole.PRESIDENT),
            db=db,
            user=user,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_vp_cannot_modify_executive_members():
    vp = make_dummy_member(MemberRole.VICE_PRESIDENT, full_name="VP Alice")
    president = make_dummy_member(MemberRole.PRESIDENT, full_name="President Bob")

    db = AsyncMock()
    db.get.return_value = president

    user = DummyUser(vp)

    with pytest.raises(HTTPException) as exc_info:
        await update_member(
            member_id=president.id,
            body=MemberAdminUpdate(department="New Dept"),
            db=db,
            user=user,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_division_head_cannot_assign_roles():
    div_id = uuid.uuid4()
    head = make_dummy_member(MemberRole.DIVISION_HEAD, division_id=div_id, full_name="Head Alice")
    target = make_dummy_member(MemberRole.MEMBER, division_id=div_id, full_name="Member Bob")

    db = AsyncMock()
    db.get.return_value = target

    user = DummyUser(head)

    with pytest.raises(HTTPException) as exc_info:
        await update_member(
            member_id=target.id,
            body=MemberAdminUpdate(role=MemberRole.DIVISION_HEAD),
            db=db,
            user=user,
        )
    assert exc_info.value.status_code == 403
