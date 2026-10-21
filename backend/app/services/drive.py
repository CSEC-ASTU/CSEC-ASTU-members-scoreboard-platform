"""Profile picture upload to Google Drive (service account)."""

from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import Settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _build_drive_service(settings: Settings):
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Drive client libraries not available",
        ) from exc

    scopes = ["https://www.googleapis.com/auth/drive.file"]
    if settings.google_service_account_json:
        info = json.loads(settings.google_service_account_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    elif settings.google_service_account_file:
        path = Path(settings.google_service_account_file)
        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Drive service account file missing",
            )
        creds = service_account.Credentials.from_service_account_file(str(path), scopes=scopes)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Drive is not configured",
        )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


import logging

logger = logging.getLogger(__name__)


async def upload_profile_picture(settings: Settings, file: UploadFile, member_id: str) -> str:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    data = await file.read()
    if len(data) > settings.profile_picture_max_bytes:
        raise HTTPException(status_code=400, detail="Image exceeds size limit")

    filename = f"profile_{member_id}_{file.filename or 'photo.jpg'}"

    gas_error = None
    # Priority 1: Google Apps Script Web App (Executes under user's 1 TB personal/school quota)
    if settings.apps_script_webhook_url and settings.apps_script_secret:
        from app.services.apps_script import upload_file_to_gas

        try:
            return await upload_file_to_gas(
                settings=settings,
                file_bytes=data,
                filename=filename,
                mime_type=file.content_type,
                folder_id=settings.google_drive_folder_id,
            )
        except Exception as gas_exc:
            gas_error = str(gas_exc)
            logger.warning(
                "Google Apps Script upload failed (%s), attempting service account fallback...",
                gas_exc,
            )

    # Priority 2: Direct Google Service Account upload (falls back to service account credentials if configured)
    if settings.google_service_account_json or settings.google_service_account_file:
        try:
            from googleapiclient.http import MediaIoBaseUpload

            service = _build_drive_service(settings)
            metadata = {
                "name": filename,
                "parents": [settings.google_drive_folder_id] if settings.google_drive_folder_id else [],
            }
            media = MediaIoBaseUpload(io.BytesIO(data), mimetype=file.content_type, resumable=False)
            created = (
                service.files()
                .create(body=metadata, media_body=media, fields="id", supportsAllDrives=True)
                .execute()
            )
            file_id = created["id"]
            # Make readable via link for profile display
            service.permissions().create(
                fileId=file_id,
                body={"type": "anyone", "role": "reader"},
                supportsAllDrives=True,
            ).execute()
            return f"https://lh3.googleusercontent.com/d/{file_id}"
        except Exception as drive_exc:
            err_msg = str(drive_exc)
            logger.error("Direct Google Drive upload failed: %s", drive_exc)
            if "storageQuotaExceeded" in err_msg:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Google Service Account quota limit reached (GCP service accounts have 0 GB quota). "
                        f"Google Apps Script failed with: '{gas_error or 'Not configured'}'. "
                        "Please update gas/Code.gs in your Google Apps Script project."
                    ),
                )
            raise HTTPException(
                status_code=502,
                detail=f"Google Drive upload error: {err_msg}. Apps Script error: {gas_error or 'None'}",
            )

    # Neither GAS succeeded nor is Service Account configured
    raise HTTPException(
        status_code=502,
        detail=(
            f"Google Drive upload failed. Google Apps Script Web App error: {gas_error or 'APPS_SCRIPT_WEBHOOK_URL not configured'}. "
            "Please paste the updated gas/Code.gs into script.google.com and deploy a New Version."
        ),
    )


async def delete_drive_file_from_url(settings: Settings, url: str | None) -> None:
    if not url:
        return

    file_id = None
    if "googleusercontent.com/d/" in url:
        file_id = url.split("googleusercontent.com/d/")[-1].split("=")[0].split("/")[0]
    elif "id=" in url:
        file_id = url.split("id=")[-1].split("&")[0]

    if not file_id:
        return

    try:
        service = _build_drive_service(settings)
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
    except Exception:
        # Best-effort cleanup — don't fail the API call if Drive delete fails
        return
