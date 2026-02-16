"""
Configuration settings for the Policy Analysis API
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server
    PORT: int = 8000  # Railway provides this dynamically

    # API Keys
    ANTHROPIC_API_KEY: str = ""
    WEBHOOK_SECRET: str = ""

    # Service URLs
    CALLBACK_TIMEOUT: int = 30  # seconds

    # Supabase (for report storage + persistent status)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Storage
    TEMP_DIR: str = "temp"
    REPORTS_DIR: str = "reports"

    # Claude API Settings
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    EXTRACTION_MODEL: str = "claude-haiku-4-5-20251001"
    CLAUDE_MAX_TOKENS: int = 16384
    USE_TWO_PHASE: bool = True  # Use two-phase extract→analyze pipeline

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Environment
    ENVIRONMENT: str = "development"

    # Branding
    COMPANY_NAME: str = "Rhône Risk Advisory"
    PRIMARY_COLOR: str = "#162B4D"
    ACCENT_COLOR: str = "#0CBDDB"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
