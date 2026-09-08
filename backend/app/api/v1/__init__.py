from fastapi import APIRouter

from app.api.v1.routers import (
    admin,
    annual,
    auth,
    divisions,
    health,
    leaderboard,
    member_permissions,
    members,
    permissions,
    point_events,
    settings,
    tasks,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(divisions.router, prefix="/divisions", tags=["divisions"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(point_events.router, prefix="/point-events", tags=["point-events"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(
    member_permissions.router, prefix="/member-permissions", tags=["member-permissions"]
)
api_router.include_router(annual.router, prefix="/annual-summaries", tags=["annual-summaries"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
