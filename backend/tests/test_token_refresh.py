import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config import Settings
from app.core.security import hash_token, issue_refresh_token, rotate_refresh_token
from app.models import Member, RefreshToken
from app.models.enums import MemberRole


@pytest.fixture
def mock_settings():
    settings = MagicMock(spec=Settings)
    settings.refresh_token_expire_days = 14
    return settings


@pytest.fixture
def active_member():
    return Member(
        id=uuid.uuid4(),
        email="test_refresh@astu.edu.et",
        full_name="Refresh Test User",
        role=MemberRole.MEMBER,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_rotate_refresh_token_success(mock_settings, active_member):
    raw_token = "valid_raw_token_xyz"
    token_hash = hash_token(raw_token)

    stored_token = RefreshToken(
        id=uuid.uuid4(),
        member_id=active_member.id,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) + timedelta(days=14),
        revoked_at=None,
    )

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = stored_token
    db.execute.return_value = mock_result
    db.get.return_value = active_member

    rotated = await rotate_refresh_token(db, raw_token, mock_settings)

    assert rotated is not None
    member, new_raw = rotated
    assert member.id == active_member.id
    assert new_raw != raw_token
    assert stored_token.revoked_at is not None
    assert db.add.called


@pytest.mark.asyncio
async def test_rotate_refresh_token_expired(mock_settings, active_member):
    raw_token = "expired_raw_token"
    token_hash = hash_token(raw_token)

    stored_token = RefreshToken(
        id=uuid.uuid4(),
        member_id=active_member.id,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) - timedelta(hours=1),
        revoked_at=None,
    )

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = stored_token
    db.execute.return_value = mock_result

    rotated = await rotate_refresh_token(db, raw_token, mock_settings)

    assert rotated is None
    assert stored_token.revoked_at is not None


@pytest.mark.asyncio
async def test_rotate_refresh_token_concurrent_grace_window(mock_settings, active_member):
    """If a token was already revoked within 15s (race condition/multiple tabs), it should succeed."""
    raw_token = "recently_rotated_raw_token"
    token_hash = hash_token(raw_token)

    stored_token = RefreshToken(
        id=uuid.uuid4(),
        member_id=active_member.id,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) + timedelta(days=14),
        revoked_at=datetime.now(UTC) - timedelta(seconds=2),  # Revoked 2s ago
    )

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = stored_token
    db.execute.return_value = mock_result
    db.get.return_value = active_member

    rotated = await rotate_refresh_token(db, raw_token, mock_settings)

    assert rotated is not None
    member, new_raw = rotated
    assert member.id == active_member.id
    assert db.add.called


@pytest.mark.asyncio
async def test_rotate_refresh_token_stale_revoked_rejected(mock_settings, active_member):
    """Tokens revoked more than 15s ago should be firmly rejected."""
    raw_token = "old_revoked_raw_token"
    token_hash = hash_token(raw_token)

    stored_token = RefreshToken(
        id=uuid.uuid4(),
        member_id=active_member.id,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) + timedelta(days=14),
        revoked_at=datetime.now(UTC) - timedelta(seconds=60),  # Revoked 60s ago
    )

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = stored_token
    db.execute.return_value = mock_result
    db.get.return_value = active_member

    rotated = await rotate_refresh_token(db, raw_token, mock_settings)

    assert rotated is None
