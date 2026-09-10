"""In-memory sliding-window rate limiting as a FastAPI dependency.

Keyed by authenticated member id (JWT `sub`) when present, otherwise client IP.
Fine for single-process / single-replica deploys. For multi-replica production,
swap the store for Redis.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt

from app.config import Settings, get_settings


class _SlidingWindowStore:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, limit: int, window_seconds: int) -> bool:
        if limit <= 0:
            return True
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


_STORE = _SlidingWindowStore()


def reset_rate_limit_store() -> None:
    """Test helper."""
    _STORE.reset()


def _client_key(request: Request, settings: Settings) -> str:
    token = request.cookies.get(settings.access_cookie_name)
    if token:
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            sub = payload.get("sub")
            if sub:
                return f"member:{sub}"
        except JWTError:
            pass
    client = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client = forwarded.split(",")[0].strip() or client
    return f"ip:{client}"


def _parse_limit(spec: str) -> tuple[int, int]:
    """Parse slowapi-style '30/minute' or '20/minute' into (limit, window_seconds)."""
    raw = (spec or "").strip().lower()
    if not raw:
        return 1000, 3600
    count_str, _, period = raw.partition("/")
    try:
        count = int(count_str.strip())
    except ValueError:
        return 1000, 3600
    period = period.strip()
    windows = {
        "second": 1,
        "seconds": 1,
        "minute": 60,
        "minutes": 60,
        "hour": 3600,
        "hours": 3600,
        "day": 86400,
        "days": 86400,
    }
    return count, windows.get(period, 60)


def require_rate_limit(scope: str):
    """
    FastAPI dependency factory.

    scope: 'point_events' | 'auth' | 'attendance'
    """

    async def _dependency(
        request: Request,
        settings: Settings = Depends(get_settings),
    ) -> None:
        spec_map = {
            "point_events": settings.rate_limit_point_events,
            "auth": settings.rate_limit_auth,
            "attendance": settings.rate_limit_attendance,
        }
        spec = spec_map.get(scope) or "1000/hour"
        limit, window = _parse_limit(spec)
        key = f"{scope}:{_client_key(request, settings)}"
        if not _STORE.allow(key, limit=limit, window_seconds=window):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({spec}). Slow down and try again.",
                headers={"Retry-After": str(window)},
            )

    return _dependency
