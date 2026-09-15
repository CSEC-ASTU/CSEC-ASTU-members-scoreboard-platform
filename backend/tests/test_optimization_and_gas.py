from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
import uuid

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.config import Settings
from app.main import app
from app.models import Certificate
from app.services.apps_script import (
    build_apps_script_payload,
    dispatch_certificate_batch_to_gas,
)


@pytest.mark.asyncio
async def test_in_memory_ping_endpoint():
    """Verify /ping responds instantly without touching the database."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET request
        res = await client.get("/ping")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "alive"
        assert data["server"] == "csec-astu-backend"

        # HEAD request (for pingers that use HEAD to save bandwidth)
        head_res = await client.head("/ping")
        assert head_res.status_code == 200


def test_build_apps_script_payload():
    settings = Settings(
        apps_script_webhook_url="https://script.google.com/test",
        apps_script_secret="my-super-secret",
    )
    now = datetime(2026, 10, 18, 14, 0, 0, tzinfo=UTC)
    cert1 = Certificate(
        id=uuid.uuid4(),
        cert_code="CSEC-2026-CYBER-A1B2C3",
        recipient_name="Dawit Bekele",
        recipient_email="dawit@astu.edu.et",
        issued_at=now,
        custom_attributes={"TRACK": "Cybersecurity", "ORGANIZATION": "ASTU"},
        title="Hands-on Reverse Engineering 101",
        academic_year=2026,
        signature_hash="fake-hash",
    )
    cert2_no_email = Certificate(
        id=uuid.uuid4(),
        cert_code="CSEC-2026-CYBER-D4E5F6",
        recipient_name="Guest No Email",
        recipient_email=None,
        issued_at=now,
        title="Hands-on Reverse Engineering 101",
        academic_year=2026,
        signature_hash="fake-hash-2",
    )

    payload = build_apps_script_payload(settings, "Hands-on Reverse Engineering 101", [cert1, cert2_no_email])

    assert payload["secret"] == "my-super-secret"
    assert payload["event_name"] == "Hands-on Reverse Engineering 101"
    assert len(payload["attendees"]) == 1

    attendee = payload["attendees"][0]
    assert attendee["recipient_name"] == "Dawit Bekele"
    assert attendee["recipient_email"] == "dawit@astu.edu.et"
    assert attendee["certificate_code"] == "CSEC-2026-CYBER-A1B2C3"
    assert attendee["issue_date"] == "October 18, 2026"
    assert attendee["custom_attributes"]["TRACK"] == "Cybersecurity"


@pytest.mark.asyncio
async def test_dispatch_certificate_batch_to_gas_success():
    settings = Settings(
        apps_script_webhook_url="https://script.google.com/macros/s/test/exec",
        apps_script_secret="test-secret",
    )
    now = datetime(2026, 10, 18, 14, 0, 0, tzinfo=UTC)
    cert = Certificate(
        id=uuid.uuid4(),
        cert_code="CSEC-2026-TEST-999",
        recipient_name="Test Recipient",
        recipient_email="test@astu.edu.et",
        issued_at=now,
        title="Test Workshop",
        academic_year=2026,
        signature_hash="hash",
    )

    mock_response = Response(
        status_code=200,
        json={
            "status": "success",
            "total_processed": 1,
            "results": [
                {
                    "certificate_code": "CSEC-2026-TEST-999",
                    "recipient_email": "test@astu.edu.et",
                    "pdf_drive_url": "https://drive.google.com/file/d/test12345/view",
                    "file_id": "test12345",
                    "status": "sent",
                }
            ],
        },
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await dispatch_certificate_batch_to_gas(settings, "Test Workshop", [cert])

        assert result["status"] == "success"
        assert result["total_processed"] == 1
        assert cert.drive_view_link == "https://drive.google.com/file/d/test12345/view"
        assert cert.drive_file_id == "test12345"
