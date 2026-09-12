from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.permissions import get_effective_permissions
from app.core.rate_limit import RateLimiter, get_client_ip
from app.core.security import (

    create_access_token,
    issue_refresh_token,
    revoke_all_member_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.dependencies import AppSettings, DbSession, RequireUser
from app.models import Division, LoginAttemptFailure, Member
from app.schemas import MeOut, TelegramConnectOut
from app.services.google_oauth import (
    build_google_login_url,
    exchange_code_for_tokens,
    fetch_google_userinfo,
)
from app.services.settings import (
    badge_for_score,
    fetch_member_scores,
    get_badge_multipliers,
    get_score_cap,
)

router = APIRouter()


def _set_auth_cookies(response: Response, settings, access: str, refresh: str) -> None:
    is_secure = settings.cookie_secure or settings.app_env in ("production", "staging")
    common = {
        "httponly": True,
        "secure": is_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(
        settings.access_cookie_name,
        access,
        max_age=settings.access_token_expire_minutes * 60,
        **common,
    )
    response.set_cookie(
        settings.refresh_cookie_name,
        refresh,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        **common,
    )


def _clear_auth_cookies(response: Response, settings) -> None:
    response.delete_cookie(settings.access_cookie_name, path="/")
    response.delete_cookie(settings.refresh_cookie_name, path="/")


import base64
import hashlib
import hmac
import logging
import time

logger = logging.getLogger(__name__)


def generate_signed_state(secret: str, redirect: str | None = None) -> str:
    """Generate a tamper-proof time-bounded OAuth state parameter including optional redirect path."""
    nonce = secrets.token_urlsafe(16)
    timestamp = str(int(time.time()))
    redirect_hex = ""
    if redirect and redirect.startswith("/") and not redirect.startswith("//"):
        redirect_hex = redirect.encode("utf-8").hex()
    payload = f"{nonce}:{timestamp}:{redirect_hex}"
    signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"


def verify_signed_state(state: str, secret: str, max_age_seconds: int = 600) -> tuple[bool, str | None]:
    """Verify the HMAC signature and timestamp of an OAuth state parameter and extract redirect path."""
    try:
        parts = state.split(":")
        redirect_path = None
        if len(parts) == 4:
            nonce, timestamp_str, redirect_encoded, signature = parts
            payload = f"{nonce}:{timestamp_str}:{redirect_encoded}"
            if redirect_encoded:
                try:
                    decoded = bytes.fromhex(redirect_encoded).decode("utf-8")
                except ValueError:
                    padded = redirect_encoded + "=" * (-len(redirect_encoded) % 4)
                    decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
                if decoded.startswith("/") and not decoded.startswith("//"):
                    redirect_path = decoded
        elif len(parts) == 3:
            nonce, timestamp_str, signature = parts
            payload = f"{nonce}:{timestamp_str}"
        else:
            return False, None

        expected_sig = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return False, None
        timestamp = int(timestamp_str)
        now = int(time.time())
        if (now - timestamp) > max_age_seconds or (timestamp - now) > 60:
            return False, None
        return True, redirect_path
    except Exception:
        return False, None


@router.get("/google/login", dependencies=[Depends(RateLimiter(times=20, seconds=60, key_func=get_client_ip))])
async def google_login(settings: AppSettings, redirect: str | None = None) -> RedirectResponse:

    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = generate_signed_state(settings.jwt_secret_key, redirect=redirect)
    url = build_google_login_url(settings, state)
    response = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=600,
        path="/",
    )
    if redirect and redirect.startswith("/"):
        response.set_cookie(
            "post_login_redirect",
            redirect,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            max_age=600,
            path="/",
        )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: DbSession,
    settings: AppSettings,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    frontend = settings.frontend_url.rstrip("/")
    if error:
        logger.warning("google_callback received oauth error param: %s", error)
        return RedirectResponse(f"{frontend}/login?error={error}")

    expected = request.cookies.get("oauth_state")
    signed_valid, redirect_from_state = verify_signed_state(state or "", settings.jwt_secret_key)
    cookie_valid = bool(expected and state and hmac.compare_digest(state, expected))
    state_valid = signed_valid or cookie_valid

    logger.info(
        "google_callback hit: code_present=%s, state=%s, signed_valid=%s, cookie_valid=%s, cookies=%s",
        bool(code),
        state,
        signed_valid,
        cookie_valid,
        list(request.cookies.keys()),
    )
    if not code or not state or not state_valid:
        logger.warning(
            "google_callback invalid_state: code_present=%s, state=%s, signed_valid=%s, cookie_valid=%s",
            bool(code),
            state,
            signed_valid,
            cookie_valid,
        )
        return RedirectResponse(f"{frontend}/login?error=invalid_state")

    try:
        tokens = await exchange_code_for_tokens(settings, code)
        info = await fetch_google_userinfo(tokens["access_token"])
    except Exception as exc:
        logger.exception("google_callback exchange/userinfo failed: %s", exc)
        return RedirectResponse(f"{frontend}/login?error=oauth_failed")

    email = (info.get("email") or "").lower().strip()
    google_id = info.get("sub")
    logger.info("google_callback profile fetched: email=%s, google_id=%s", email, google_id)
    if not email or not google_id:
        logger.warning("google_callback missing profile fields: email=%s, google_id=%s", email, google_id)
        return RedirectResponse(f"{frontend}/login?error=missing_profile")

    result = await db.execute(select(Member).where(Member.email == email))
    member = result.scalar_one_or_none()

    if member is None:
        logger.warning("google_callback member not found: %s", email)
        db.add(
            LoginAttemptFailure(
                email=email,
                google_id=google_id,
                reason="not_registered",
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None,
            )
        )
        await db.flush()
        return RedirectResponse(f"{frontend}/not-registered?{urlencode({'email': email})}")

    if not member.is_active:
        logger.warning("google_callback member is inactive: %s", email)
        return RedirectResponse(f"{frontend}/login?error=inactive")

    if member.google_id is None:
        member.google_id = google_id
        member.first_login_at = datetime.now(UTC)
        if info.get("name"):
            member.full_name = info["name"]
    elif member.google_id != google_id:
        logger.warning(
            "google_callback google_id mismatch: email=%s, db=%s, incoming=%s",
            email,
            member.google_id,
            google_id,
        )
        return RedirectResponse(f"{frontend}/login?error=google_mismatch")

    access = create_access_token(member.id, settings)
    refresh = await issue_refresh_token(db, member.id, settings)
    await db.flush()

    post_redirect = redirect_from_state or request.cookies.get("post_login_redirect")
    target_url = (
        f"{frontend}{post_redirect}"
        if post_redirect and post_redirect.startswith("/") and not post_redirect.startswith("//")
        else f"{frontend}/dashboard"
    )
    logger.info(
        "google_callback login success for %s! Redirecting to %s (redirect_from_state=%s)",
        email,
        target_url,
        redirect_from_state,
    )
    response = RedirectResponse(target_url, status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(response, settings, access, refresh)
    response.delete_cookie("oauth_state", path="/")
    response.delete_cookie("post_login_redirect", path="/")
    return response


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: DbSession, settings: AppSettings) -> dict:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        logger.warning("POST /auth/refresh failed: refresh cookie missing")
        raise HTTPException(status_code=401, detail="Refresh cookie missing")
    rotated = await rotate_refresh_token(db, raw, settings)
    if rotated is None:
        logger.warning("POST /auth/refresh failed: invalid or expired refresh token")
        _clear_auth_cookies(response, settings)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    member, new_refresh = rotated
    access = create_access_token(member.id, settings)
    _set_auth_cookies(response, settings, access, new_refresh)
    logger.info("POST /auth/refresh success for member_id=%s (%s)", member.id, member.email)
    return {"status": "ok", "detail": "refreshed"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: DbSession,
    settings: AppSettings,
    user: RequireUser,
) -> dict:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if raw:
        await revoke_refresh_token(db, raw)
    await revoke_all_member_tokens(db, user.id)
    _clear_auth_cookies(response, settings)
    return {"detail": "logged out"}


@router.get("/me", response_model=MeOut)
async def me(db: DbSession, user: RequireUser) -> MeOut:
    scores = await fetch_member_scores(db, user.id)
    perms = await get_effective_permissions(db, user.member)
    m = user.member

    div_name = None
    if m.division_id:
        div = await db.get(Division, m.division_id)
        if div:
            div_name = div.name

    sec_div_name = None
    if m.secondary_division_id:
        sec_div = await db.get(Division, m.secondary_division_id)
        if sec_div:
            sec_div_name = sec_div.name

    multipliers = await get_badge_multipliers(db)
    cap = await get_score_cap(db)
    badge = badge_for_score(scores["cycle_score"], cap, multipliers)

    return MeOut(
        id=m.id,
        full_name=m.full_name,
        email=m.email,
        profile_image_url=m.profile_image_url,
        division_id=m.division_id,
        division_name=div_name,
        secondary_division_id=m.secondary_division_id,
        secondary_division_name=sec_div_name,
        role=m.role,
        department=m.department,
        joining_year=m.joining_year,
        student_id=m.student_id,
        phone_number=m.phone_number,
        github_url=m.github_url,
        telegram_username=m.telegram_username,
        telegram_connected=m.telegram_chat_id is not None,
        onboarded=m.first_login_at is not None,
        cycle_score=scores["cycle_score"],
        display_score=scores["display_score"],
        career_score=scores["career_score"],
        badge=badge,
        permissions=perms,
    )


@router.post("/telegram/connect", response_model=TelegramConnectOut, dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def connect_telegram(

    db: DbSession,
    user: RequireUser,
    settings: AppSettings,
) -> TelegramConnectOut:
    """Generate a one-time token for linking the member's Telegram account."""
    token = secrets.token_urlsafe(32)
    m = user.member
    m.telegram_connect_token = token
    m.telegram_token_expires_at = datetime.now(UTC) + timedelta(minutes=10)
    await db.flush()

    link = None
    if settings.telegram_bot_username:
        clean_username = settings.telegram_bot_username.lstrip("@")
        link = f"https://t.me/{clean_username}?start={token}"

    return TelegramConnectOut(token=token, link=link)
