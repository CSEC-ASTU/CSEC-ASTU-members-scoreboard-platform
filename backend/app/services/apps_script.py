"""Google Apps Script Webhook Service for PDF Generation & Email Delivery.

Offloads headless vector PDF generation and Gmail dispatch to Google Cloud,
protecting Render Free Tier's 512 MB RAM from OOM crashes and storing certificates
directly in Google Drive at $0 cost.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import httpx

from app.config import Settings

if TYPE_CHECKING:
    from app.models import Certificate

logger = logging.getLogger(__name__)


def build_apps_script_payload(
    settings: Settings,
    event_name: str,
    certificates: list[Certificate],
) -> dict[str, Any]:
    """Format batch certificate payload matching Code.gs webhook specification."""
    attendees = []
    for cert in certificates:
        if not cert.recipient_email:
            continue

        issue_date_str = cert.issued_at.strftime("%B %d, %Y")
        attendees.append(
            {
                "recipient_name": cert.recipient_name,
                "recipient_email": cert.recipient_email,
                "certificate_code": cert.cert_code,
                "issue_date": issue_date_str,
                "custom_attributes": cert.custom_attributes or {},
            }
        )

    return {
        "secret": settings.apps_script_secret,
        "event_name": event_name,
        "attendees": attendees,
    }


async def dispatch_certificate_batch_to_gas(
    settings: Settings,
    event_name: str,
    certificates: list[Certificate],
) -> dict[str, Any]:
    """Asynchronously post issued certificates to Google Apps Script Web App.

    Updates certificates in-place with Google Drive view links and file IDs
    upon successful generation.
    """
    if not settings.apps_script_webhook_url:
        logger.info("Google Apps Script webhook URL not configured; skipping cloud PDF generation.")
        return {"status": "skipped", "reason": "apps_script_webhook_url not set"}

    payload = build_apps_script_payload(settings, event_name, certificates)
    if not payload["attendees"]:
        return {"status": "skipped", "reason": "no recipient emails provided"}

    try:
        # Apps Script handles vector PDF rendering in Google Slides; allow up to 120s timeout
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            response = await client.post(
                settings.apps_script_webhook_url,
                json=payload,
            )

        if response.status_code != 200:
            logger.warning(
                "Google Apps Script returned status %d: %s",
                response.status_code,
                response.text[:500],
            )
            return {"status": "error", "code": response.status_code, "detail": response.text[:200]}

        data = response.json()
        if data.get("status") == "success":
            results = data.get("results", [])
            code_to_result = {r["certificate_code"]: r for r in results if "certificate_code" in r}

            for cert in certificates:
                res_item = code_to_result.get(cert.cert_code)
                if res_item:
                    if res_item.get("pdf_drive_url"):
                        cert.drive_view_link = res_item["pdf_drive_url"]
                    if res_item.get("file_id"):
                        cert.drive_file_id = res_item["file_id"]

            return {
                "status": "success",
                "total_processed": data.get("total_processed", len(results)),
                "results": results,
            }
        else:
            logger.warning("Google Apps Script reported failure: %s", data.get("message"))
            return {"status": "error", "message": data.get("message")}

    except Exception as exc:
        logger.warning("Failed to dispatch certificates to Google Apps Script: %s", exc)
        return {"status": "exception", "detail": str(exc)}
