"""Telegram connect token endpoint helpers."""

from __future__ import annotations

from app.api.v1.routers.members import _normalize_telegram_username


def test_normalize_telegram_username_strips_at_and_urls():
    assert _normalize_telegram_username("@Alice_Dev") == "alice_dev"
    assert _normalize_telegram_username("https://t.me/Alice_Dev") == "alice_dev"
    assert _normalize_telegram_username("https://t.me/Alice_Dev?start=1") == "alice_dev"
    assert _normalize_telegram_username("telegram.me/Bob") == "bob"
