from app.config import Settings
from app.models import PointEventStatus, PointEventType
from app.services.bot import format_admin_digest, normalize_username, should_notify_for_event
from types import SimpleNamespace


def test_normalize_username():
    assert normalize_username("@Foo") == "foo"


def test_should_notify_warnings():
    settings = Settings(telegram_motivational_min_points=40)
    event = SimpleNamespace(
        status=PointEventStatus.APPROVED,
        event_type=PointEventType.YELLOW_WARNING,
        points_delta=-25,
        reason="x",
    )
    assert should_notify_for_event(event, None, settings) is True


def test_format_admin_digest():
    report = {
        "no_username": [],
        "pending_handshake": [],
        "failed_delivery": [],
        "totals": {"no_username": 0, "pending_handshake": 0, "failed_delivery": 0},
    }
    assert "No username set: 0" in format_admin_digest(report)
