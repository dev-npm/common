"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MINI_ADK_", extra="ignore")

    app_env: str = "dev"
    llm_provider: str = "mock"  # mock or openai
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    max_tool_iterations: int = 4


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cache settings so we do not rebuild them every request."""
    return Settings()
