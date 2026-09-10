from __future__ import annotations

from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_chat_ids(value: object) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(x) for x in value if str(x).strip()]
    if isinstance(value, str):
        import json

        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(x) for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            pass
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CSEC ASTU Telegram Bot"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8001

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/csec_astu"

    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    internal_api_secret: str = "change-me-internal-secret"
    telegram_motivational_min_points: int = 40
    # Typed as Any so empty .env values are not JSON-decoded by pydantic-settings
    telegram_admin_chat_ids: Any = Field(default_factory=list)

    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    @field_validator("telegram_admin_chat_ids", mode="before")
    @classmethod
    def parse_admin_chats(cls, value: object) -> list[str]:
        return _parse_chat_ids(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()
