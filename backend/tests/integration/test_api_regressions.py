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
