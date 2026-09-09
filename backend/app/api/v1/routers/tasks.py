from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, or_, select

from app.core.permissions import has_permission, is_club_wide_officer
from app.dependencies import DbSession, RequireUser
from app.models import Task
from app.models.enums import MemberRole
from app.schemas import Paginated, TaskCreate, TaskOut, TaskUpdate

router = APIRouter()


def _can_manage_task(user, task: Task | None = None, division_id: UUID | None = None) -> bool:
    if user.member.role == MemberRole.PRESIDENT or is_club_wide_officer(user.member):
        return True
    scope_div = division_id or (task.division_id if task else None) or user.member.division_id
    category = task.category if task else None
    return has_permission(user.permissions, "manage_tasks", division_id=scope_div, category=category)


@router.get("", response_model=Paginated[TaskOut])
async def list_tasks(
    db: DbSession,
    user: RequireUser,
    page: int = 1,
    page_size: int = 25,
    division_id: UUID | None = None,
    category: str | None = None,
    active: bool | None = None,
    is_penalty: bool | None = None,
) -> Paginated[TaskOut]:
    q = select(Task)
    cq = select(func.count()).select_from(Task)

    # Server-side division visibility scope:
    # Members and division heads only see tasks belonging to their enrolled divisions (primary & secondary) or club-wide tasks
    if not (user.member.role in {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT} or is_club_wide_officer(user.member)):
        enrolled_divs = {d for d in (user.member.division_id, user.member.secondary_division_id) if d is not None}
        if enrolled_divs:
            div_visibility = or_(Task.division_id.is_(None), Task.division_id.in_(enrolled_divs))
        else:
            div_visibility = Task.division_id.is_(None)
        q = q.where(div_visibility)
        cq = cq.where(div_visibility)

    if division_id is not None:
        q = q.where(Task.division_id == division_id)
        cq = cq.where(Task.division_id == division_id)
    if category is not None:
        q = q.where(Task.category == category)
        cq = cq.where(Task.category == category)
    if active is not None:
        q = q.where(Task.active == active)
        cq = cq.where(Task.active == active)
    if is_penalty is not None:
        q = q.where(Task.is_penalty == is_penalty)
        cq = cq.where(Task.is_penalty == is_penalty)

    total = int((await db.execute(cq)).scalar() or 0)
    rows = (
        await db.execute(
            q.order_by(Task.title).offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()
    return Paginated(
        items=[TaskOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate, db: DbSession, user: RequireUser) -> TaskOut:
    if not _can_manage_task(user, division_id=body.division_id):
        raise HTTPException(status_code=403, detail="Missing manage_tasks permission")
    if user.member.role == MemberRole.DIVISION_HEAD and body.division_id not in {
        None,
        user.member.division_id,
    }:
        raise HTTPException(status_code=403, detail="Cannot create tasks outside your division")

    task = Task(**body.model_dump())
    if user.member.role == MemberRole.DIVISION_HEAD and task.division_id is None:
        task.division_id = user.member.division_id
    db.add(task)
    await db.flush()
    return TaskOut.model_validate(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: UUID, db: DbSession, user: RequireUser) -> TaskOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: UUID, body: TaskUpdate, db: DbSession, user: RequireUser) -> TaskOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _can_manage_task(user, task=task):
        raise HTTPException(status_code=403, detail="Missing manage_tasks permission")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.flush()
    return TaskOut.model_validate(task)
