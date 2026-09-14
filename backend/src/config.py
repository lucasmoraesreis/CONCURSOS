"""
Configurações do backend API.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Database (async)
    database_url: str = "postgresql+asyncpg://questoes_admin:questoes_secret_2024@localhost:5432/questoes_concursos"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    model_config = {
        "env_file": [str(PROJECT_ROOT / ".env"), str(Path(__file__).resolve().parent.parent / ".env")],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def async_database_url(self) -> str:
        """Garante prefixo postgresql+asyncpg:// para conexões assíncronas."""
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_database_url(self) -> str:
        """Garante prefixo postgresql:// para migrações síncronas do Alembic."""
        url = self.database_url.strip()
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
