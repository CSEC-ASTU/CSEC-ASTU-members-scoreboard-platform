"""Integration tests against a real, migrated Postgres database.

Opt-in: they only run with RUN_DB_TESTS=1 and write real rows, so point
DATABASE_URL at a throwaway database (CI provides one; never your dev DB).
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

import httpx
import pytest

if os.environ.get("RUN_DB_TESTS") != "1":
    pytest.skip("set RUN_DB_TESTS=1 (and a throwaway DATABASE_URL) to run DB integration tests", allow_module_level=True)

from app.config import get_settings  # noqa: E402
from app.core.rate_limit import default_storage  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.database import AsyncSessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Division, Member  # noqa: E402
from app.models.enums import MemberRole  # noqa: E402


@pytest.fixture(autouse=True)
async def _fresh_engine():
    default_storage.reset()
    yield
    # asyncpg connections are bound to the per-test event loop
    await engine.dispose()


@pytest.fixture
async def division() -> Division:
    async with AsyncSessionLocal() as db:
        div = Division(name=f"Div {uuid.uuid4().hex[:8]}")
        db.add(div)
        await db.commit()
        await db.refresh(div)
        return div


@pytest.fixture
def make_member():
    async def _make(role: MemberRole = MemberRole.MEMBER, division_id=None) -> Member:
        async with AsyncSessionLocal() as db:
            m = Member(
                full_name=f"{role.value} {uuid.uuid4().hex[:6]}",
                email=f"{uuid.uuid4().hex[:10]}@it.test",
                role=role,
                division_id=division_id,
                google_id=f"g-{uuid.uuid4().hex}",
                first_login_at=datetime.now(UTC),
                is_active=True,
            )
            db.add(m)
            await db.commit()
            await db.refresh(m)
            return m

    return _make


@pytest.fixture
def client_for():
    def _client(member: Member | None) -> httpx.AsyncClient:
        cookies = {}
        if member is not None:
            cookies[get_settings().access_cookie_name] = create_access_token(member.id)
        return httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1", cookies=cookies
        )

    return _client
