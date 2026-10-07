from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request

from app.api.v1.routers.auth import generate_signed_state, google_callback, verify_signed_state
from app.config import Settings

def test_signed_state_with_redirect():
    secret = "super-secret-key-for-test"
    target = "/members/m-target-123"

    state = generate_signed_state(secret, redirect=target)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect == target

def test_signed_state_without_redirect():
    secret = "super-secret-key-for-test"

    state = generate_signed_state(secret)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect is None

def test_signed_state_tampering_fails():
    secret = "super-secret-key-for-test"
    target = "/members/m-target-123"

    state = generate_signed_state(secret, redirect=target)
    parts = state.split(":")
    # Tamper with the redirect payload
    tampered_redirect = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
    tampered = f"{parts[0]}:{parts[1]}:{tampered_redirect}:{parts[3]}"
    valid, redirect = verify_signed_state(tampered, secret)

    assert valid is False
    assert redirect is None

def test_open_redirect_prevention():
    secret = "super-secret-key-for-test"
    malicious = "//evil.com/phish"

    # Should not treat double slash as valid internal path
    state = generate_signed_state(secret, redirect=malicious)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect is None


# --- Callback state binding (login CSRF protection) ---



def _callback_request(cookies: dict[str, str]) -> Request:
    cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/auth/google/callback",
        "headers": [(b"cookie", cookie_header.encode())] if cookie_header else [],
        "query_string": b"",
    }
    return Request(scope)


@pytest.fixture
def oauth_settings():
    return Settings(jwt_secret_key="x" * 32, frontend_url="http://front.test")


async def test_callback_rejects_signed_state_without_matching_cookie(oauth_settings):
    # A validly signed state obtained by an attacker must not work in another browser.
    state = generate_signed_state(oauth_settings.jwt_secret_key)
    with patch("app.api.v1.routers.auth.exchange_code_for_tokens", new=AsyncMock()) as exchange:
        resp = await google_callback(
            request=_callback_request({}),
            db=MagicMock(),
            settings=oauth_settings,
            code="attacker-code",
            state=state,
        )
    assert resp.headers["location"] == "http://front.test/login?error=invalid_state"
    exchange.assert_not_called()


async def test_callback_rejects_unsigned_state_even_if_cookie_matches(oauth_settings):
    forged = "nonce:123:abc"
    with patch("app.api.v1.routers.auth.exchange_code_for_tokens", new=AsyncMock()) as exchange:
        resp = await google_callback(
            request=_callback_request({"oauth_state": forged}),
            db=MagicMock(),
            settings=oauth_settings,
            code="code",
            state=forged,
        )
    assert resp.headers["location"] == "http://front.test/login?error=invalid_state"
    exchange.assert_not_called()


async def test_callback_accepts_signed_state_bound_to_cookie(oauth_settings):
    state = generate_signed_state(oauth_settings.jwt_secret_key)
    with patch(
        "app.api.v1.routers.auth.exchange_code_for_tokens",
        new=AsyncMock(side_effect=RuntimeError("stop after state check")),
    ) as exchange:
        resp = await google_callback(
            request=_callback_request({"oauth_state": state}),
            db=MagicMock(),
            settings=oauth_settings,
            code="code",
            state=state,
        )
    exchange.assert_awaited_once()
    assert resp.headers["location"] == "http://front.test/login?error=oauth_failed"


async def test_callback_error_param_is_url_encoded(oauth_settings):
    resp = await google_callback(
        request=_callback_request({}),
        db=MagicMock(),
        settings=oauth_settings,
        error="access_denied&next=//evil",
    )
    assert resp.headers["location"] == (
        "http://front.test/login?error=access_denied%26next%3D%2F%2Fevil"
    )
