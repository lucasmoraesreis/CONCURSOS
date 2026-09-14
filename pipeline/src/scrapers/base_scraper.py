"""
Classe base abstrata para scrapers de bancas de concurso.
Cada banca deve implementar sua própria subclasse.
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings


@dataclass
class ConcursoInfo:
    """Informações de um concurso encontrado pelo scraper."""
    orgao: str
    cargo: str
    ano: int
    nivel: str = "Superior"
    edital_url: str = ""
    prova_urls: list[str] = field(default_factory=list)
    gabarito_urls: list[str] = field(default_factory=list)


class BaseScraper(ABC):
    """
    Classe base para scrapers de bancas de concurso.

    Implementa:
    - HTTP client com headers adequados
    - Rate limiting
    - Retry com backoff exponencial
    - Download de PDFs com progresso

    Cada subclasse deve implementar:
    - search_concursos(): buscar concursos no site da banca
    - _parse_concurso_page(): extrair links de provas/gabaritos
    """

    BANCA_NOME: str = ""
    BANCA_SLUG: str = ""
    BASE_URL: str = ""

    def __init__(self):
        self.client = httpx.Client(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/125.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            },
        )
        self._last_request_time = 0.0

    def _rate_limit(self):
        """Aplica rate limiting entre requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < settings.scraper_rate_limit:
            time.sleep(settings.scraper_rate_limit - elapsed)
        self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        reraise=True,
    )
    def fetch_page(self, url: str) -> str:
        """Faz GET em uma URL e retorna o HTML."""
        self._rate_limit()
        logger.debug(f"Fetching: {url}")
        response = self.client.get(url)
        response.raise_for_status()
        return response.text

    def download_pdf(self, url: str, dest_dir: Path, filename: str = "") -> Path:
        """
        Faz download de um PDF.

        Args:
            url: URL do PDF.
            dest_dir: Diretório de destino.
            filename: Nome do arquivo (auto-gerado se vazio).

        Returns:
            Path do arquivo salvo.
        """
        dest_dir.mkdir(parents=True, exist_ok=True)

        if not filename:
            filename = url.split("/")[-1].split("?")[0]
            if not filename.endswith(".pdf"):
                filename += ".pdf"

        dest_path = dest_dir / filename
        if dest_path.exists():
            logger.info(f"PDF já existe: {dest_path.name}")
            return dest_path

        self._rate_limit()
        logger.info(f"Baixando: {url} → {dest_path.name}")

        with self.client.stream("GET", url) as response:
            response.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=8192):
                    f.write(chunk)

        logger.info(f"Download concluído: {dest_path.name} ({dest_path.stat().st_size / 1024:.1f} KB)")
        return dest_path

    @abstractmethod
    def search_concursos(
        self, ano_inicio: int = 2015, ano_fim: int = 2025
    ) -> list[ConcursoInfo]:
        """
        Busca concursos no site da banca.

        Args:
            ano_inicio: Ano mínimo para busca.
            ano_fim: Ano máximo para busca.

        Returns:
            Lista de concursos encontrados com links de provas e gabaritos.
        """
        ...

    def close(self):
        """Fecha o HTTP client."""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
