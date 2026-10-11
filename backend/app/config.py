from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Values that have appeared in this public repo; never accept them as real secrets.
_PLACEHOLDER_SECRETS = {"dev-only-change-me", "change-me-to-a-long-random-string"}
_GENERATE_HINT = 'generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Never echo setting values (secrets) into validation errors / logs.
        hide_input_in_errors=True,
    )

    app_name: str = "CSEC ASTU Member Management"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # Required, no defaults: a missing value must fail at startup rather than fall back
    # to credentials that are visible in the repository.
    database_url: str
    jwt_secret_key: str
    # Apply Alembic migrations (and repair missing tables/columns) when the app starts.
    run_migrations_on_startup: bool = True
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

    # Google Apps Script PDF Engine & Email Webhook
    apps_script_webhook_url: str = ""
    apps_script_secret: str = ""

    profile_picture_max_bytes: int = 2 * 1024 * 1024

    # Telegram bot integration
    telegram_bot_url: str = ""
    internal_api_secret: str = ""
    telegram_bot_username: str = ""

    # Number of reverse proxies in front of the API that append to X-Forwarded-For.
    # 1 = Render only; 2 = Vercel rewrite -> Render (the /api/proxy setup).
    trusted_proxy_hops: int = 1

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

    @model_validator(mode="after")
    def require_real_secrets(self) -> "Settings":
        # Enforced in every environment: APP_ENV defaults to "development", so an
        # environment-based exemption would let a misconfigured deploy use a public key.
        if self.jwt_secret_key in _PLACEHOLDER_SECRETS:
            raise ValueError(f"JWT_SECRET_KEY is a public placeholder; {_GENERATE_HINT}")
        if len(self.jwt_secret_key) < 32:
            raise ValueError(f"JWT_SECRET_KEY must be at least 32 characters; {_GENERATE_HINT}")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings from .env."""
    return Settings()
