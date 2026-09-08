from sqlalchemy import Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import PermissionScopeType


class Permission(Base):
    __tablename__ = "permissions"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scope_type: Mapped[PermissionScopeType] = mapped_column(
        Enum(
            PermissionScopeType,
            name="permission_scope_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
