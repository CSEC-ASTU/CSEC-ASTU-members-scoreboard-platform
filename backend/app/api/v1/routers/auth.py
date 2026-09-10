from __future__ import annotations

import secrets
from datetime import UTC, datetime
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.permissions import get_effective_permissions
from app.core.security import (
    create_access_token,
    issue_refresh_token,
    revoke_all_member_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.dependencies import AppSettings, DbSession, RequireUser
from app.models import Division, LoginAttemptFailure, Member
from app.schemas import MeOut
from app.services.google_oauth import (
    build_google_login_url,
    exchange_code_for_tokens,
    fetch_google_userinfo,
)
from app.services.settings import fetch_member_scores

router = APIRouter()


def _set_auth_cookies(response: Response, settings, access: str, refresh: str) -> None:
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
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


@router.get("/google/login")
async def google_login(settings: AppSettings) -> RedirectResponse:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = secrets.token_urlsafe(24)
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
    return response


import logging
logger = logging.getLogger(__name__)


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
    logger.info(
        "google_callback hit: code_present=%s, state=%s, expected_cookie=%s, cookies=%s",
        bool(code),
        state,
        expected,
        list(request.cookies.keys()),
    )
    if not code or not state or not expected or state != expected:
        logger.warning(
            "google_callback invalid_state: code_present=%s, state=%s, expected=%s",
            bool(code),
            state,
            expected,
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

    logger.info("google_callback login success for %s! Redirecting to %s/dashboard", email, frontend)
    response = RedirectResponse(f"{frontend}/dashboard", status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(response, settings, access, refresh)
    response.delete_cookie("oauth_state", path="/")
    return response


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: DbSession, settings: AppSettings) -> dict:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        raise HTTPException(status_code=401, detail="Refresh cookie missing")
    rotated = await rotate_refresh_token(db, raw, settings)
    if rotated is None:
        _clear_auth_cookies(response, settings)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    member, new_refresh = rotated
    access = create_access_token(member.id, settings)
    _set_auth_cookies(response, settings, access, new_refresh)
    return {"detail": "refreshed"}


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
        onboarded=m.first_login_at is not None,
        cycle_score=scores["cycle_score"],
        display_score=scores["display_score"],
        career_score=scores["career_score"],
        permissions=perms,
    )
