"""
Configurações centralizadas do pipeline.
Carrega variáveis do .env na raiz do projeto.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


# Raiz do projeto (d:\QUESTÕES)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configurações do pipeline carregadas do .env"""

    # Banco de Dados
    postgres_user: str = "questoes_admin"
    postgres_password: str = "questoes_secret_2024"
    postgres_db: str = "questoes_concursos"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url_sync: str = "postgresql://questoes_admin:questoes_secret_2024@localhost:5432/questoes_concursos"

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Pipeline
    pdf_download_dir: str = str(PROJECT_ROOT / "data" / "pdfs")
    scraper_rate_limit: float = 2.0
    log_level: str = "INFO"

    model_config = {
        "env_file": str(PROJECT_ROOT / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def pdf_dir(self) -> Path:
        path = Path(self.pdf_download_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
