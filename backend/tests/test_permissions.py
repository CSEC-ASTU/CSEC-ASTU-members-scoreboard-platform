from app.core.permissions import ROLE_DEFAULTS, can_approve_submitter, format_permission, has_permission
from app.models.enums import MemberRole


class _M:
    def __init__(self, id, role):
        self.id = id
        self.role = role


def test_no_self_approval():
    a = _M(1, MemberRole.PRESIDENT)
    assert can_approve_submitter(a, a) is False


def test_president_vp_cross_approve():
    p = _M(1, MemberRole.PRESIDENT)
    v = _M(2, MemberRole.VICE_PRESIDENT)
    assert can_approve_submitter(p, v) is True
    assert can_approve_submitter(v, p) is True


def test_no_lateral_peers():
    a = _M(1, MemberRole.DIVISION_HEAD)
    b = _M(2, MemberRole.DIVISION_HEAD)
    assert can_approve_submitter(a, b) is False


def test_senior_can_approve():
    head = _M(1, MemberRole.DIVISION_HEAD)
    member = _M(2, MemberRole.MEMBER)
    assert can_approve_submitter(head, member) is True


def test_permission_format_and_lookup():
    perms = [format_permission("approve_task", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")]
    assert has_permission(
        perms, "approve_task", division_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    )
    assert not has_permission(perms, "approve_task")


def test_role_defaults_include_layoff_for_president_only():
    assert "execute_layoff" in ROLE_DEFAULTS[MemberRole.PRESIDENT]
    assert "execute_layoff" not in ROLE_DEFAULTS[MemberRole.VICE_PRESIDENT]
