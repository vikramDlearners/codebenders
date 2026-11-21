from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./carecircle_dev.db"
    secret_key: str = "dev-only-change-me"
    login_link_base_url: str = "http://localhost:5173/auth/verify"
    login_token_minutes: int = 15

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None

    sms_provider: str = "mock"

    gemini_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None

    intent_mode: str = "offline_rules"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
