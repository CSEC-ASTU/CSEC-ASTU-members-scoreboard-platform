import uuid
import time
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException, Request

from app.core.rate_limit import (
    InMemorySlidingWindowStorage,
    RateLimiter,
    PinLockoutManager,
    get_user_or_ip_key,
    get_client_ip,
)


@pytest.fixture
def storage():
    s = InMemorySlidingWindowStorage()
    s.reset()
    return s


@pytest.fixture
def lockout_manager():
    m = PinLockoutManager()
    m.reset()
    return m


def test_sliding_window_storage_basic_limit(storage):
    key = "test:route:member1"
    # Allow 3 requests per 60 seconds
    assert storage.is_allowed(key, max_requests=3, window_seconds=60)[0] is True
    assert storage.is_allowed(key, max_requests=3, window_seconds=60)[0] is True
    assert storage.is_allowed(key, max_requests=3, window_seconds=60)[0] is True

    # 4th request must be rejected
    allowed, retry_after = storage.is_allowed(key, max_requests=3, window_seconds=60)
    assert allowed is False
    assert retry_after > 0


def test_nat_ip_shared_router_isolation(storage):
    """Critical verification for university computer lab:
    Two students behind the same NAT IP router (e.g. 196.189.1.50)
    MUST NOT block each other. Member A reaching the limit leaves Member B unaffected.
    """
    router_ip = "196.189.1.50"
    member_a_id = uuid.uuid4()
    member_b_id = uuid.uuid4()

    # Simulate Member A making requests
    req_a = MagicMock(spec=Request)
    req_a.method = "POST"
    req_a.url.path = "/api/v1/point-events"
    req_a.client.host = router_ip
    req_a.headers = {}
    req_a.cookies = {}
    user_a = MagicMock()
    user_a.member.id = member_a_id
    req_a.state.user = user_a

    # Simulate Member B making requests
    req_b = MagicMock(spec=Request)
    req_b.method = "POST"
    req_b.url.path = "/api/v1/point-events"
    req_b.client.host = router_ip
    req_b.headers = {}
    req_b.cookies = {}
    user_b = MagicMock()
    user_b.member.id = member_b_id
    req_b.state.user = user_b

    limiter = RateLimiter(times=3, seconds=60, storage=storage)

    # Member A exhausts their quota (3 requests)
    import asyncio
    asyncio.run(limiter(req_a))
    asyncio.run(limiter(req_a))
    asyncio.run(limiter(req_a))

    # Member A 4th request -> 429
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(limiter(req_a))
    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers

    # Member B behind the EXACT same router IP -> allowed!
    asyncio.run(limiter(req_b))
    asyncio.run(limiter(req_b))
    asyncio.run(limiter(req_b))

    # Member B 4th request -> 429
    with pytest.raises(HTTPException) as exc_b:
        asyncio.run(limiter(req_b))
    assert exc_b.value.status_code == 429


def test_ip_fallback_when_unauthenticated(storage):
    req = MagicMock(spec=Request)
    req.method = "GET"
    req.url.path = "/api/v1/auth/google/login"
    req.client.host = "203.0.113.195"
    req.headers = {}
    req.cookies = {}
    req.state = MagicMock()
    req.state.user = None

    key = get_user_or_ip_key(req)
    assert key == "ip:203.0.113.195"


def test_x_forwarded_for_extraction():
    req = MagicMock(spec=Request)
    req.headers = {"X-Forwarded-For": "198.51.100.4, 10.0.0.1"}
    assert get_client_ip(req) == "198.51.100.4"


def test_pin_lockout_manager_five_failures_triggers_lockout(lockout_manager):
    member_id = uuid.uuid4()

    # 4 failures: should not be locked out yet
    for _ in range(4):
        lockout_manager.record_failure(member_id)
        lockout_manager.check_lockout(member_id)

    # 5th failure: triggers lockout
    lockout_manager.record_failure(member_id)
    with pytest.raises(HTTPException) as exc:
        lockout_manager.check_lockout(member_id)

    assert exc.value.status_code == 429
    assert "locked for" in exc.value.detail
    assert "Retry-After" in exc.value.headers
    assert int(exc.value.headers["Retry-After"]) > 0


def test_pin_lockout_success_resets_counter(lockout_manager):
    member_id = uuid.uuid4()

    # 4 failures recorded
    for _ in range(4):
        lockout_manager.record_failure(member_id)

    # Successful PIN entry
    lockout_manager.record_success(member_id)

    # Check that lockout does NOT occur on the next failure
    lockout_manager.record_failure(member_id)
    lockout_manager.check_lockout(member_id)  # passes with only 1 failure in window


def test_pin_lockout_member_isolation(lockout_manager):
    member_a = uuid.uuid4()
    member_b = uuid.uuid4()

    # Member A fails 5 times and is locked out
    for _ in range(5):
        lockout_manager.record_failure(member_a)

    with pytest.raises(HTTPException):
        lockout_manager.check_lockout(member_a)

    # Member B is NOT locked out
    lockout_manager.check_lockout(member_b)


@pytest.mark.asyncio
async def test_create_claim_pin_lockout_integration(lockout_manager):
    """Verify that repeated invalid PIN attempts during claim creation trigger account lockout."""
    from app.services.point_events import create_claim
    from app.models import Member, Task
    from app.models.enums import MemberRole
    from unittest.mock import AsyncMock

    member = Member(
        id=uuid.uuid4(),
        email="student@astu.edu.et",
        full_name="Lab Student",
        role=MemberRole.MEMBER,
    )
    task = Task(
        id=uuid.uuid4(),
        title="Session",
        category="division_session",
        base_points=10,
        active=True,
    )

    db = AsyncMock()
    db.get.return_value = task
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    db.execute.return_value = mock_res
    settings = MagicMock()

    # Fail 4 times -> 400 Bad Request
    for _ in range(4):
        with pytest.raises(HTTPException) as exc:
            await create_claim(
                db,
                member=member,
                task_id=task.id,
                reason=None,
                settings=settings,
                verification_code="000000",
            )
        assert exc.value.status_code == 400

    # 5th attempt: recorded failure -> next attempt (or check) triggers 429 lockout
    with pytest.raises(HTTPException) as exc:
        await create_claim(
            db,
            member=member,
            task_id=task.id,
            reason=None,
            settings=settings,
            verification_code="000000",
        )
    # The 5th failure records 5 failures and returns 400 or locks out.
    # The subsequent 6th attempt is blocked immediately at lockout check (HTTP 429)
    with pytest.raises(HTTPException) as exc_lockout:
        await create_claim(
            db,
            member=member,
            task_id=task.id,
            reason=None,
            settings=settings,
            verification_code="000000",
        )
    assert exc_lockout.value.status_code == 429
    assert "locked for" in exc_lockout.value.detail

