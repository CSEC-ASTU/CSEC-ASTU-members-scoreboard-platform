"""Google Apps Script Webhook Service for PDF Generation & Email Delivery.

Offloads headless vector PDF generation and Gmail dispatch to Google Cloud,
protecting Render Free Tier's 512 MB RAM from OOM crashes and storing certificates
directly in Google Drive at $0 cost.
"""

from __future__ import annotations

import base64
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
    *,
    template_slide_id: str | None = None,
    include_all_recipients: bool = False,
    send_email_notifications: bool = True,
) -> dict[str, Any]:
    """Format batch certificate payload matching Code.gs webhook specification."""
    base_frontend = settings.frontend_url.rstrip("/")
    attendees = []
    for cert in certificates:
        if not cert.recipient_email and not include_all_recipients:
            continue

        issue_date_str = cert.issued_at.strftime("%B %d, %Y")
        verify_url = f"{base_frontend}/verify/certificate/{cert.cert_code}"
        attendees.append(
            {
                "recipient_name": cert.recipient_name,
                "recipient_email": cert.recipient_email or "",
                "certificate_code": cert.cert_code,
                "verify_url": verify_url,
                "issue_date": issue_date_str,
                "custom_attributes": cert.custom_attributes or {},
            }
        )

    payload: dict[str, Any] = {
        "action": "generate_certificates",
        "secret": settings.apps_script_secret,
        "event_name": event_name,
        "frontend_base_url": base_frontend,
        "output_folder_id": settings.google_drive_folder_id,
        "send_email_notifications": send_email_notifications,
        "attendees": attendees,
    }
    if template_slide_id:
        payload["template_slide_id"] = template_slide_id

    return payload


async def dispatch_certificate_batch_to_gas(
    settings: Settings,
    event_name: str,
    certificates: list[Certificate],
    *,
    template_slide_id: str | None = None,
    send_email_notifications: bool = True,
) -> dict[str, Any]:
    """Asynchronously post issued certificates to Google Apps Script Web App.

    Updates certificates in-place with Google Drive view links and file IDs
    upon successful generation.
    """
    if not settings.apps_script_webhook_url:
        logger.info("Google Apps Script webhook URL not configured; skipping cloud PDF generation.")
        return {"status": "skipped", "reason": "apps_script_webhook_url not set"}

    CHUNK_SIZE = 10  # Safe batch size: ~80s per chunk, well within GAS 6-min limit and httpx timeout
    all_results: list[dict[str, Any]] = []
    total_processed = 0

    try:
        # Apps Script handles vector PDF rendering in Google Slides; allow up to 180s per chunk
        async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
            for i in range(0, len(certificates), CHUNK_SIZE):
                chunk = certificates[i : i + CHUNK_SIZE]
                payload = build_apps_script_payload(
                    settings,
                    event_name,
                    chunk,
                    template_slide_id=template_slide_id,
                    include_all_recipients=True,
                    send_email_notifications=send_email_notifications,
                )
                if not payload["attendees"]:
                    continue

                response = await client.post(
                    settings.apps_script_webhook_url,
                    json=payload,
                )

                if response.status_code != 200:
                    logger.warning(
                        "Google Apps Script returned status %d for chunk %d: %s",
                        response.status_code,
                        i // CHUNK_SIZE + 1,
                        response.text[:500],
                    )
                    return {"status": "error", "code": response.status_code, "detail": response.text[:200]}

                data = response.json()
                if data.get("status") != "success":
                    logger.warning(
                        "Google Apps Script reported failure on chunk %d: %s",
                        i // CHUNK_SIZE + 1,
                        data.get("message"),
                    )
                    return {"status": "error", "message": data.get("message")}

                chunk_results = data.get("results", [])
                all_results.extend(chunk_results)
                total_processed += data.get("total_processed", len(chunk_results))

                code_to_result = {r["certificate_code"]: r for r in chunk_results if "certificate_code" in r}
                for cert in chunk:
                    res_item = code_to_result.get(cert.cert_code)
                    if res_item:
                        if res_item.get("pdf_drive_url"):
                            cert.drive_view_link = res_item["pdf_drive_url"]
                        if res_item.get("file_id"):
                            cert.drive_file_id = res_item["file_id"]
                        if res_item.get("slide_drive_url"):
                            attrs = dict(cert.custom_attributes or {})
                            attrs["slide_drive_url"] = res_item["slide_drive_url"]
                            cert.custom_attributes = attrs

        return {
            "status": "success",
            "total_processed": total_processed,
            "results": all_results,
        }

    except Exception as exc:
        logger.warning("Failed to dispatch certificates to Google Apps Script: %s", exc)
        return {"status": "exception", "detail": str(exc)}


async def dispatch_presidential_announcement_to_gas(
    settings: Settings,
    *,
    subject: str,
    title: str,
    message_body: str,
    recipients: list[dict[str, str]],
    badge: str = "OFFICIAL NOTICE",
    cta_text: str | None = None,
    cta_url: str | None = None,
    sender_title: str = "Office of the President",
) -> dict[str, Any]:
    """Post presidential announcement to Google Apps Script Web App for Gmail delivery."""
    if not settings.apps_script_webhook_url:
        logger.info("Google Apps Script webhook URL not configured.")
        return {"status": "skipped", "reason": "apps_script_webhook_url not configured in environment"}

    if not recipients:
        return {"status": "skipped", "reason": "no recipients provided"}

    payload: dict[str, Any] = {
        "action": "send_announcement",
        "secret": settings.apps_script_secret,
        "subject": subject,
        "title": title,
        "message_body": message_body,
        "recipients": recipients,
        "badge": badge,
        "sender_title": sender_title,
    }
    if cta_text and cta_url:
        payload["cta_text"] = cta_text
        payload["cta_url"] = cta_url

    try:
        async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
            response = await client.post(
                settings.apps_script_webhook_url,
                json=payload,
            )

        if response.status_code != 200:
            logger.warning("Google Apps Script announcement returned status %d: %s", response.status_code, response.text[:400])
            return {"status": "error", "code": response.status_code, "detail": response.text[:200]}

        return response.json()
    except Exception as exc:
        logger.exception("Failed to dispatch announcement to Google Apps Script: %s", exc)
        return {"status": "exception", "detail": str(exc)}


async def upload_file_to_gas(
    settings: Settings,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    folder_id: str | None = None,
) -> str:
    """Upload a file to Google Drive via Google Apps Script Web App.

    This executes using the user's personal/school Google Drive quota (1 TB),
    completely bypassing the service account 0 GB quota limit.
    """
    import base64

    if not settings.apps_script_webhook_url:
        raise ValueError("APPS_SCRIPT_WEBHOOK_URL is not configured in environment")

    b64_str = base64.b64encode(file_bytes).decode("utf-8")
    payload = {
        "action": "upload_file",
        "secret": settings.apps_script_secret,
        "file_base64": b64_str,
        "file_name": filename,
        "mime_type": mime_type,
        "folder_id": folder_id or settings.google_drive_folder_id,
    }

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.post(
            settings.apps_script_webhook_url,
            json=payload,
        )

    if response.status_code != 200:
        logger.error("Apps Script upload returned HTTP %d: %s", response.status_code, response.text[:300])
        raise RuntimeError(f"Google Apps Script error: HTTP {response.status_code}")

    data = response.json()
    if data.get("status") != "success" or not data.get("url"):
        error_msg = data.get("message", "Upload failed")
        logger.error("Apps Script upload failed: %s", error_msg)
        raise RuntimeError(f"Google Apps Script upload failed: {error_msg}")

    return data["url"]


async def upload_template_file_to_gas(
    settings: Settings,
    *,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    folder_id: str | None = None,
) -> dict[str, Any]:
    """Upload a template or media file to Google Drive via Google Apps Script Web App."""
    if not settings.apps_script_webhook_url:
        raise RuntimeError("apps_script_webhook_url not configured")

    payload = {
        "action": "upload_file",
        "secret": settings.apps_script_secret,
        "file_base64": base64.b64encode(file_bytes).decode("ascii"),
        "file_name": filename,
        "mime_type": mime_type,
        "folder_id": folder_id or settings.google_drive_folder_id,
    }

    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
        response = await client.post(
            settings.apps_script_webhook_url,
            json=payload,
        )

    if response.status_code != 200:
        logger.error("Apps Script upload returned HTTP %d: %s", response.status_code, response.text[:300])
        raise RuntimeError(f"Google Apps Script error: HTTP {response.status_code}")

    data = response.json()
    if data.get("status") != "success":
        error_msg = data.get("message", "Upload failed")
        logger.error("Apps Script upload failed: %s", error_msg)
        raise RuntimeError(f"Google Apps Script upload failed: {error_msg}")

    file_id = data.get("file_id")
    google_slide_id = data.get("google_slide_id") or file_id
    drive_url = data.get("drive_url") or (f"https://drive.google.com/file/d/{file_id}/view?usp=drivesdk" if file_id else "")
    google_slide_url = data.get("google_slide_url") or drive_url
    return {
        "status": "success",
        "file_id": file_id,
        "google_slide_id": google_slide_id,
        "url": data.get("url"),
        "drive_url": drive_url,
        "google_slide_url": google_slide_url,
        "file_name": data.get("name", filename),
    }


