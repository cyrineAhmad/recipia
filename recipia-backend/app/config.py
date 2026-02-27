from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str | None = None
    groq_api_key: str
    allowed_origins: str = "http://localhost:5173"
    app_env: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()