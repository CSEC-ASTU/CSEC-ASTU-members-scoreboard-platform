from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload

from app.core.permissions import is_officer
from app.dependencies import AppSettings, DbSession, OptionalUser, RequireUser
from app.models import Alumni, Division
from app.schemas.alumni import AlumniCreate, AlumniOut, AlumniUpdate

router = APIRouter()


@router.post("/upload-photo")
async def upload_alumni_photo(
    user: RequireUser,
    settings: AppSettings,
    file: UploadFile = File(...),
) -> dict[str, str]:
    """Upload an alumni profile photo directly to Google Drive (officers only)."""
    if not is_officer(user.member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer privileges required to upload alumni photos",
        )
    import uuid
    from app.services.drive import upload_profile_picture

    photo_url = await upload_profile_picture(settings, file, f"alumni_{uuid.uuid4().hex[:8]}")
    return {"photo_url": photo_url}


@router.get("", response_model=list[AlumniOut])
async def list_alumni(
    db: DbSession,
    user: OptionalUser = None,
    featured_only: bool = Query(False, description="Filter only featured alumni"),
    include_inactive: bool = Query(False, description="Include inactive records (officers only)"),
    limit: int = Query(50, ge=1, le=100),
) -> list[Alumni]:
    """List alumni profiles. Public requests only see active alumni."""
    query = select(Alumni).options(selectinload(Alumni.division))

    is_user_officer = user is not None and is_officer(user.member)

    if not (include_inactive and is_user_officer):
        query = query.where(Alumni.is_active.is_(True))

    if featured_only:
        query = query.where(Alumni.is_featured.is_(True))

    query = query.order_by(
        Alumni.sort_order.asc(),
        desc(Alumni.graduation_year),
        desc(Alumni.created_at),
    ).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{alumni_id}", response_model=AlumniOut)
async def get_alumni(alumni_id: UUID, db: DbSession) -> Alumni:
    result = await db.execute(
        select(Alumni).options(selectinload(Alumni.division)).where(Alumni.id == alumni_id)
    )
    alumni = result.scalar_one_or_none()
    if not alumni or not alumni.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni profile not found")
    return alumni


@router.get("/{alumni_id}/photo")
async def get_alumni_photo(alumni_id: UUID, db: DbSession) -> Response:
    """Proxy endpoint to securely stream alumni photo with caching, bypassing browser hotlink barriers."""
    result = await db.execute(select(Alumni).where(Alumni.id == alumni_id))
    alumni = result.scalar_one_or_none()
    if not alumni or not alumni.photo_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni photo not found")

    import httpx

    target_url = alumni.photo_url.strip()
    # Normalize Google Drive view links to direct CDN endpoints
    if "drive.google.com" in target_url:
        import re
        m = re.search(r"id=([a-zA-Z0-9_-]+)", target_url) or re.search(r"/d/([a-zA-Z0-9_-]+)", target_url)
        if m:
            target_url = f"https://lh3.googleusercontent.com/d/{m.group(1)}"

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(target_url)
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "image/jpeg")
                return Response(
                    content=resp.content,
                    media_type=media_type,
                    headers={
                        "Cache-Control": "public, max-age=86400, immutable",
                        "Access-Control-Allow-Origin": "*",
                    },
                )
    except Exception:
        pass

    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to retrieve alumni photo")


@router.post("", response_model=AlumniOut, status_code=status.HTTP_201_CREATED)
async def create_alumni(
    payload: AlumniCreate,
    db: DbSession,
    user: RequireUser,
) -> Alumni:
    if not is_officer(user.member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer privileges required to manage alumni profiles",
        )

    division_name = payload.division_name
    if payload.division_id and not division_name:
        div_res = await db.execute(select(Division).where(Division.id == payload.division_id))
        div = div_res.scalar_one_or_none()
        if div:
            division_name = div.name

    alumni = Alumni(
        full_name=payload.full_name.strip(),
        photo_url=payload.photo_url.strip() if payload.photo_url else None,
        current_role=payload.current_role.strip(),
        division_id=payload.division_id,
        division_name=division_name,
        graduation_year=payload.graduation_year,
        description=payload.description.strip(),
        profile_url=payload.profile_url.strip() if payload.profile_url else None,
        is_featured=payload.is_featured,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(alumni)
    await db.commit()
    await db.refresh(alumni)
    return alumni


@router.put("/{alumni_id}", response_model=AlumniOut)
async def update_alumni(
    alumni_id: UUID,
    payload: AlumniUpdate,
    db: DbSession,
    user: RequireUser,
) -> Alumni:
    if not is_officer(user.member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer privileges required to manage alumni profiles",
        )

    result = await db.execute(select(Alumni).where(Alumni.id == alumni_id))
    alumni = result.scalar_one_or_none()
    if not alumni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni profile not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "division_id" in update_data and update_data["division_id"]:
        if "division_name" not in update_data or not update_data["division_name"]:
            div_res = await db.execute(select(Division).where(Division.id == update_data["division_id"]))
            div = div_res.scalar_one_or_none()
            if div:
                update_data["division_name"] = div.name

    for field, val in update_data.items():
        if isinstance(val, str):
            val = val.strip()
        setattr(alumni, field, val)

    await db.commit()
    await db.refresh(alumni)
    return alumni


@router.delete("/{alumni_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_alumni(
    alumni_id: UUID,
    db: DbSession,
    user: RequireUser,
) -> Response:
    if not is_officer(user.member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer privileges required to manage alumni profiles",
        )

    result = await db.execute(select(Alumni).where(Alumni.id == alumni_id))
    alumni = result.scalar_one_or_none()
    if not alumni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni profile not found")

    await db.delete(alumni)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
