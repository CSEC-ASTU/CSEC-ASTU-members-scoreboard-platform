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


async def upload_profile_picture(settings: Settings, file: UploadFile, member_id: str) -> str:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    data = await file.read()
    if len(data) > settings.profile_picture_max_bytes:
        raise HTTPException(status_code=400, detail="Image exceeds size limit")
    if not settings.google_drive_folder_id:
        raise HTTPException(status_code=503, detail="Drive folder not configured")

    from googleapiclient.http import MediaIoBaseUpload

    service = _build_drive_service(settings)
    metadata = {
        "name": f"profile_{member_id}_{file.filename or 'photo'}",
        "parents": [settings.google_drive_folder_id],
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
