from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.enums import PermissionScopeType


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    description: str
    scope_type: PermissionScopeType


class MemberPermissionCreate(BaseModel):
    member_id: UUID
    permission_key: str
    scope_value: str | None = None


class MemberPermissionUpdate(BaseModel):
    is_enabled: bool


class MemberPermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    permission_key: str
    scope_value: str | None
    granted_by: UUID
    granted_at: datetime
    is_enabled: bool
    updated_at: datetime
