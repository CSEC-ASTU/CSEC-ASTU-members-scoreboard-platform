"""Regression tests for bugs found in the Oct 2026 system test."""

from __future__ import annotations

from app.models.enums import MemberRole


async def test_toggle_permission_grant_returns_updated_grant(make_member, client_for):
    vp = await make_member(MemberRole.VICE_PRESIDENT)
    target = await make_member()
    async with client_for(vp) as api:
        perms = (await api.get("/permissions")).json()
        key = next(p["key"] for p in perms if p.get("scope_type", "club") == "club")
        grant = await api.post("/member-permissions", json={"member_id": str(target.id), "permission_key": key})
        assert grant.status_code in (200, 201), grant.text

        toggled = await api.patch(f"/member-permissions/{grant.json()['id']}", json={"is_enabled": False})
        assert toggled.status_code == 200, toggled.text
        assert toggled.json()["is_enabled"] is False

        # The change must actually persist (it used to roll back with the 500)
        listed = (await api.get("/member-permissions", params={"member_id": str(target.id)})).json()
        assert any(g["id"] == grant.json()["id"] and g["is_enabled"] is False for g in listed["items"])


async def test_revoke_certificate_returns_full_certificate(make_member, client_for):
    vp = await make_member(MemberRole.VICE_PRESIDENT)
    recipient = await make_member()
    async with client_for(vp) as api:
        issued = await api.post(
            "/certificates",
            json={
                "template_id": "dev-workshop",
                "title": "Integration Workshop",
                "member_ids": [str(recipient.id)],
                "external_recipients": [{"name": "Guest Person", "email": "guest@example.com"}],
            },
        )
        assert issued.status_code == 201, issued.text
        for cert in issued.json():
            revoked = await api.post(f"/certificates/{cert['id']}/revoke", json={"reason": "issued by mistake"})
            assert revoked.status_code == 200, revoked.text
            body = revoked.json()
            assert body["is_revoked"] is True
            assert body["recipient_name"] == cert["recipient_name"]
            assert body["is_external"] == cert["is_external"]

        verify = (await api.get(f"/certificates/verify/{issued.json()[0]['cert_code']}")).json()
        assert verify["is_valid"] is False and verify["is_revoked"] is True


async def test_event_end_must_be_after_start(make_member, client_for):
    from datetime import UTC, datetime, timedelta

    vp = await make_member(MemberRole.VICE_PRESIDENT)
    start = datetime.now(UTC) + timedelta(days=2)
    body = {"title": "Order Test", "description": "checking times", "start_time": start.isoformat()}
    async with client_for(vp) as api:
        bad = await api.post("/events", json={**body, "end_time": (start - timedelta(hours=1)).isoformat()})
        assert bad.status_code == 422
        same = await api.post("/events", json={**body, "end_time": start.isoformat()})
        assert same.status_code == 422
        ok = await api.post("/events", json={**body, "end_time": (start + timedelta(hours=2)).isoformat()})
        assert ok.status_code == 201, ok.text
        # An edit that moves only the end before the existing start is rejected too
        bad_edit = await api.put(f"/events/{ok.json()['id']}", json={"end_time": (start - timedelta(hours=3)).isoformat()})
        assert bad_edit.status_code == 422
        good_edit = await api.put(f"/events/{ok.json()['id']}", json={"end_time": (start + timedelta(hours=5)).isoformat()})
        assert good_edit.status_code == 200, good_edit.text


async def test_task_points_sign_matches_task_kind(make_member, client_for):
    vp = await make_member(MemberRole.VICE_PRESIDENT)
    async with client_for(vp) as api:
        base = {"title": "Points rule", "category": "general"}
        assert (await api.post("/tasks", json={**base, "base_points": -10})).status_code == 422
        assert (await api.post("/tasks", json={**base, "base_points": 0})).status_code == 422
        assert (await api.post("/tasks", json={**base, "base_points": 5, "is_penalty": True})).status_code == 422
        assert (await api.post("/tasks", json={**base, "base_points": -5, "is_penalty": True})).status_code == 201
        ok = await api.post("/tasks", json={**base, "base_points": 15})
        assert ok.status_code == 201
        assert (await api.patch(f"/tasks/{ok.json()['id']}", json={"base_points": -3})).status_code == 422
        assert (await api.patch(f"/tasks/{ok.json()['id']}", json={"base_points": 20})).status_code == 200


async def test_unusual_stored_email_does_not_break_directory_or_me(make_member, client_for):
    """A single stored email that strict validators reject used to 500 /members for everyone."""
    from app.database import AsyncSessionLocal
    from app.models import Member

    odd = await make_member()
    async with AsyncSessionLocal() as db:
        m = await db.get(Member, odd.id)
        m.email = f"odd-{odd.id.hex[:6]}@club.test"  # reserved TLD, rejected by EmailStr
        await db.commit()
    viewer = await make_member()
    async with client_for(viewer) as api:
        listing = await api.get("/members", params={"page_size": 100})
        assert listing.status_code == 200, listing.text
    async with client_for(odd) as api:
        me = await api.get("/auth/me")
        assert me.status_code == 200, me.text
