"""Bot internal notify auth + should_notify helpers."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app
from app.models import PointEventStatus, PointEventType
from app.services.bot import should_notify_for_event


def test_should_notify_warnings_and_thresholds():
    settings = Settings(telegram_motivational_min_points=40)
    warning = SimpleNamespace(
        status=PointEventStatus.APPROVED,
        event_type=PointEventType.YELLOW_WARNING,
        points_delta=-25,
        reason="late",
    )
    assert should_notify_for_event(warning, None, settings) is True

    small = SimpleNamespace(
        status=PointEventStatus.APPROVED,
        event_type=PointEventType.CLAIM,
        points_delta=10,
        reason="cleaning",
    )
    assert should_notify_for_event(small, None, settings) is False

    big = SimpleNamespace(
        status=PointEventStatus.APPROVED,
        event_type=PointEventType.CLAIM,
        points_delta=50,
        reason="project",
    )
    assert should_notify_for_event(big, None, settings) is True


def test_internal_notify_requires_secret(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("INTERNAL_API_SECRET", "correct-secret")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://csec:csec@localhost:5432/csec_astu")
    get_settings.cache_clear()

    app = create_app()
    client = TestClient(app)

    resp = client.post("/internal/notify", json={"point_event_id": str(uuid4())})
    assert resp.status_code == 401

    resp2 = client.post(
        "/internal/notify",
        json={"point_event_id": str(uuid4())},
        headers={"X-Internal-Secret": "wrong"},
    )
    assert resp2.status_code == 401
