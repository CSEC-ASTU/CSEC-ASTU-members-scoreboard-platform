"""In-memory rate limiting and brute-force lockout engine (Clean Architecture).

Designed for university campus and lab networks (NAT-safe):
- Authenticated requests are keyed strictly by member ID to avoid throttling shared-IP routers.
- Unauthenticated requests fall back to client IP.
- Attendance session codes are guarded by an account-level PIN lockout manager.
"""

from collections import defaultdict
import threading
import time
from typing import Callable, Protocol
from uuid import UUID

from fastapi import HTTPException, Request, status


class RateLimitStorage(Protocol):
    """Abstract interface for rate limit storage (Clean Architecture)."""

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        """Check if request is permitted under sliding window.

        Returns (is_allowed, retry_after_seconds).
        """
        ...


class InMemorySlidingWindowStorage:
    """Thread-safe, sliding-window rate limit storage with automatic TTL cleanup."""

    def __init__(self, cleanup_interval_seconds: int = 300) -> None:
        self._lock = threading.Lock()
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.monotonic()
        self._cleanup_interval = cleanup_interval_seconds

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            # Periodic lazy cleanup of completely expired keys
            if now - self._last_cleanup > self._cleanup_interval:
                self._cleanup(now)

            timestamps = self._requests[key]
            # Discard timestamps outside the current sliding window
            cutoff = now - window_seconds
            valid_timestamps = [t for t in timestamps if t > cutoff]

            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(window_seconds - (now - earliest)))
                self._requests[key] = valid_timestamps
                return False, retry_after

            valid_timestamps.append(now)
            self._requests[key] = valid_timestamps
            return True, 0

    def _cleanup(self, now: float) -> None:
        """Prune keys with no active timestamps."""
        keys_to_remove = []
        for k, timestamps in self._requests.items():
            active = [t for t in timestamps if now - t < 3600]
            if not active:
                keys_to_remove.append(k)
            else:
                self._requests[k] = active
        for k in keys_to_remove:
            self._requests.pop(k, None)
        self._last_cleanup = now

    def reset(self) -> None:
        """Clear all stored state (primarily for test isolation)."""
        with self._lock:
            self._requests.clear()
            self._last_cleanup = time.monotonic()


# Global in-memory storage instance
default_storage = InMemorySlidingWindowStorage()


def get_client_ip(request: Request) -> str:
    """Extract client IP address, handling proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_or_ip_key(request: Request) -> str:
    """Key on authenticated member ID if available, otherwise fall back to client IP."""
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "member") and user.member and user.member.id:
        return f"member:{user.member.id}"
    if user and hasattr(user, "id") and user.id:
        return f"member:{user.id}"

    # Cookie decode fallback if require_user has not executed yet
    token = request.cookies.get("csec_access")
    if token:
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                return f"member:{payload['sub']}"
        except Exception:
            pass

    return f"ip:{get_client_ip(request)}"



class RateLimiter:
    """FastAPI dependency for declarative rate limiting."""

    def __init__(
        self,
        times: int,
        seconds: int,
        key_func: Callable[[Request], str] = get_user_or_ip_key,
        storage: RateLimitStorage = default_storage,
    ) -> None:
        self.times = times
        self.seconds = seconds
        self.key_func = key_func
        self.storage = storage

    async def __call__(self, request: Request) -> None:
        key = self.key_func(request)
        route_key = f"{request.method}:{request.url.path}:{key}"
        allowed, retry_after = self.storage.is_allowed(route_key, self.times, self.seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )


class PinLockoutManager:
    """Tracks failed 6-digit whiteboard PIN attempts per member to defeat brute-force attacks.

    If a member fails 5 PIN verification attempts within 15 minutes, they are locked out
    for the remainder of the window. Correct PIN entry clears the failure count.
    """

    MAX_FAILURES = 5
    LOCKOUT_SECONDS = 900  # 15 minutes

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._failures: dict[str, list[float]] = defaultdict(list)

    def check_lockout(self, member_id: UUID | str) -> None:
        """Verify the member is not currently locked out of PIN verification."""
        mid = str(member_id)
        now = time.monotonic()
        with self._lock:
            cutoff = now - self.LOCKOUT_SECONDS
            recent = [t for t in self._failures[mid] if t > cutoff]
            self._failures[mid] = recent

            if len(recent) >= self.MAX_FAILURES:
                earliest = recent[0]
                remaining = max(1, int(self.LOCKOUT_SECONDS - (now - earliest)))
                mins = max(1, remaining // 60)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Too many incorrect PIN attempts ({len(recent)}/{self.MAX_FAILURES}). "
                        f"Session verification locked for {mins} minute(s) to protect attendance integrity."
                    ),
                    headers={"Retry-After": str(remaining)},
                )

    def record_failure(self, member_id: UUID | str) -> int:
        """Record an incorrect PIN attempt and return current failure count in window."""
        mid = str(member_id)
        now = time.monotonic()
        with self._lock:
            cutoff = now - self.LOCKOUT_SECONDS
            recent = [t for t in self._failures[mid] if t > cutoff]
            recent.append(now)
            self._failures[mid] = recent
            return len(recent)

    def record_success(self, member_id: UUID | str) -> None:
        """Clear failed attempts upon successful verification."""
        mid = str(member_id)
        with self._lock:
            self._failures.pop(mid, None)

    def reset(self) -> None:
        """Reset all PIN lockout state (for test isolation)."""
        with self._lock:
            self._failures.clear()


pin_lockout_manager = PinLockoutManager()
