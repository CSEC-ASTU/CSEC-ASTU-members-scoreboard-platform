"""Published placeholder secrets must never authenticate a request."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.routers.api import require_internal_secret

REAL = "r" * 40


@pytest.mark.parametrize("configured", ["", "change-me-internal-secret"])
def test_internal_secret_rejects_unset_or_placeholder(configured):
    settings = Settings(internal_api_secret=configured)
    with pytest.raises(HTTPException) as exc:
        require_internal_secret(settings, configured)
    assert exc.value.status_code == 401


def test_internal_secret_accepts_only_the_real_value():
    settings = Settings(internal_api_secret=REAL)
    require_internal_secret(settings, REAL)
    with pytest.raises(HTTPException):
        require_internal_secret(settings, "r" * 39 + "x")
    with pytest.raises(HTTPException):
        require_internal_secret(settings, None)


@pytest.mark.parametrize(
    ("configured", "sent", "expected"),
    [
        ("", "anything", 503),
        ("change-me-long-random-secret", "change-me-long-random-secret", 503),
        (REAL, "wrong", 401),
        (REAL, None, 401),
    ],
)
def test_webhook_secret(configured, sent, expected):
    app.dependency_overrides[get_settings] = lambda: Settings(telegram_webhook_secret=configured)
    try:
        headers = {"X-Telegram-Bot-Api-Secret-Token": sent} if sent else {}
        resp = TestClient(app).post("/webhook", json={"update_id": 1}, headers=headers)
        assert resp.status_code == expected
    finally:
        app.dependency_overrides.clear()


def test_webhook_accepts_real_secret_for_non_message_update():
    app.dependency_overrides[get_settings] = lambda: Settings(telegram_webhook_secret=REAL)
    try:
        resp = TestClient(app).post("/webhook", json={"update_id": 1}, headers={"X-Telegram-Bot-Api-Secret-Token": REAL})
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.clear()
