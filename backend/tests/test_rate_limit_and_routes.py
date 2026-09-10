"""Rate-limit + OpenAPI contract smoke tests."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.core.rate_limit import require_rate_limit, reset_rate_limit_store
from app.main import create_app
from fastapi import Depends


def test_openapi_exposes_telegram_and_point_event_routes():
    get_settings.cache_clear()
    app = create_app()
    client = TestClient(app)
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    assert "/api/v1/point-events" in paths
    assert "/api/v1/members/me/telegram" in paths
    assert "/api/v1/admin/telegram/report" in paths
    assert "/api/v1/admin/telegram/digest" in paths


def test_rate_limit_dependency_blocks_after_burst():
    reset_rate_limit_store()
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/limited", dependencies=[Depends(require_rate_limit("auth"))])
    async def limited(request: Request) -> dict:
        return {"ok": True}

    # Force a tiny limit for this test
    original = get_settings

    def tiny_settings() -> Settings:
        return Settings(rate_limit_auth="3/minute")

    app.dependency_overrides[get_settings] = tiny_settings
    # require_rate_limit closes over get_settings via Depends — override works

    client = TestClient(app)
    assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 200
    blocked = client.get("/limited")
    assert blocked.status_code == 429
    assert "Rate limit exceeded" in blocked.json()["detail"]
