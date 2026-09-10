from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CSEC ASTU Member Management"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/csec_astu"

    jwt_secret_key: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    access_cookie_name: str = "csec_access"
    refresh_cookie_name: str = "csec_refresh"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    google_drive_folder_id: str = ""
    google_service_account_file: str = ""
    google_service_account_json: str = ""

    # Improvement: auto-approve routine low-point claims (PRD §12)
    auto_approve_claim_max_points: int = 10
    profile_picture_max_bytes: int = 2 * 1024 * 1024

    # Telegram bot service (backend → bot glue)
    # Example: http://localhost:8001 or http://telegram_bot:8001 in Compose
    telegram_bot_base_url: str = "http://localhost:8001"
    telegram_bot_username: str = ""
    internal_api_secret: str = ""
    telegram_notify_timeout_seconds: float = 15.0
    telegram_connect_token_ttl_hours: int = 24

    # Rate limits (e.g. "30/minute"). Empty falls back to a high default.
    rate_limit_point_events: str = "30/minute"
    rate_limit_auth: str = "20/minute"
    rate_limit_attendance: str = "20/minute"

    # Observability
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, value: object) -> object:
        if isinstance(value, str):
            import json

            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return [part.strip() for part in value.split(",") if part.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
