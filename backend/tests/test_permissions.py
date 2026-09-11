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


def test_member_visibility_and_sensitive_masking():
    from app.core.permissions import can_see_member, can_view_sensitive_info

    class _FullMember:
        def __init__(self, id, role, division_id=None, secondary_division_id=None):
            self.id = id
            self.role = role
            self.division_id = division_id
            self.secondary_division_id = secondary_division_id

    member_a = _FullMember(1, MemberRole.MEMBER, division_id="div-dev")
    member_b = _FullMember(2, MemberRole.MEMBER, division_id="div-cp")
    pres = _FullMember(10, MemberRole.PRESIDENT)
    vp = _FullMember(11, MemberRole.VICE_PRESIDENT)
    head_dev = _FullMember(20, MemberRole.DIVISION_HEAD, division_id="div-dev")

    # All members can view public profiles
    assert can_see_member(member_a, member_b, []) is True
    assert can_see_member(member_b, member_a, []) is True

    # Viewing self allows sensitive info
    assert can_view_sensitive_info(member_a, member_a, []) is True

    # Ordinary member viewing another member CANNOT view sensitive info
    assert can_view_sensitive_info(member_a, member_b, []) is False

    # President & VP can view sensitive info of any member
    assert can_view_sensitive_info(pres, member_a, []) is True
    assert can_view_sensitive_info(vp, member_b, []) is True

    # Division head can view sensitive info for members in their division
    assert can_view_sensitive_info(head_dev, member_a, []) is True
    # But not for members in another division
    assert can_view_sensitive_info(head_dev, member_b, []) is False

    # Delegated view_division_members permission allows viewing
    delegated = ["view_division_members:club"]
    assert can_view_sensitive_info(member_a, member_b, delegated) is True
