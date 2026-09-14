"""
Scraper para o Cebraspe (antigo CESPE/UnB).
Site oficial: https://www.cebraspe.org.br

Navega a área de concursos anteriores para baixar provas e gabaritos.
"""

import re
from bs4 import BeautifulSoup
from loguru import logger

from src.scrapers.base_scraper import BaseScraper, ConcursoInfo


class CebraspeScraper(BaseScraper):
    """Scraper específico para o site do Cebraspe."""

    BANCA_NOME = "Cebraspe"
    BANCA_SLUG = "cebraspe"
    BASE_URL = "https://www.cebraspe.org.br"

    def search_concursos(
        self, ano_inicio: int = 2015, ano_fim: int = 2025
    ) -> list[ConcursoInfo]:
        """
        Busca concursos no site do Cebraspe.

        O Cebraspe organiza concursos por evento com páginas individuais.
        Navega a listagem de concursos e extrai informações.
        """
        concursos = []

        try:
            # Página principal de concursos
            html = self.fetch_page(f"{self.BASE_URL}/concursos")
            soup = BeautifulSoup(html, "lxml")

            # Busca links para concursos individuais
            links = soup.select("a[href*='concursos']")

            for link in links:
                href = link.get("href", "")
                text = link.get_text(strip=True)

                if not text or len(text) < 5:
                    continue

                # Tenta extrair ano do texto ou URL
                ano_match = re.search(r"20[12]\d", text + " " + href)
                if not ano_match:
                    continue

                ano = int(ano_match.group())
                if ano < ano_inicio or ano > ano_fim:
                    continue

                # Tenta extrair órgão do texto
                orgao = self._extract_orgao(text)
                if not orgao:
                    continue

                # Monta URL completa
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                try:
                    info = self._parse_concurso_page(full_url, orgao, ano)
                    if info:
                        concursos.extend(info)
                except Exception as e:
                    logger.warning(f"Erro ao parsear concurso '{text}': {e}")

        except Exception as e:
            logger.error(f"Erro ao buscar concursos no Cebraspe: {e}")

        logger.info(f"Cebraspe: {len(concursos)} concursos encontrados.")
        return concursos

    def _parse_concurso_page(
        self, url: str, orgao: str, ano: int
    ) -> list[ConcursoInfo]:
        """Acessa a página de um concurso e extrai links de provas/gabaritos."""
        results = []

        try:
            html = self.fetch_page(url)
            soup = BeautifulSoup(html, "lxml")

            # Busca links de PDFs (provas e gabaritos)
            pdf_links = soup.select("a[href$='.pdf']")

            prova_urls = []
            gabarito_urls = []

            for link in pdf_links:
                href = link.get("href", "")
                text = link.get_text(strip=True).lower()
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                if any(kw in text for kw in ["gabarito", "preliminar", "definitivo"]):
                    gabarito_urls.append(full_url)
                elif any(kw in text for kw in ["prova", "caderno", "questões", "objetiva"]):
                    prova_urls.append(full_url)

            if prova_urls:
                # Tenta extrair cargo(s)
                cargos = self._extract_cargos(soup)
                if not cargos:
                    cargos = ["Cargo Geral"]

                for cargo in cargos:
                    results.append(ConcursoInfo(
                        orgao=orgao,
                        cargo=cargo,
                        ano=ano,
                        nivel=self._infer_nivel(cargo),
                        edital_url=url,
                        prova_urls=prova_urls,
                        gabarito_urls=gabarito_urls,
                    ))

        except Exception as e:
            logger.warning(f"Erro ao parsear página {url}: {e}")

        return results

    def _extract_orgao(self, text: str) -> str:
        """Extrai nome do órgão de um texto."""
        # Remove palavras comuns
        cleaned = re.sub(
            r"(?:concurso|público|edital|processo seletivo|cebraspe)\s*",
            "",
            text,
            flags=re.IGNORECASE
        ).strip()

        # Pega as primeiras palavras significativas
        words = cleaned.split()
        if words:
            return " ".join(words[:5]).strip(" -–")
        return ""

    def _extract_cargos(self, soup: BeautifulSoup) -> list[str]:
        """Tenta extrair lista de cargos da página do concurso."""
        cargos = []

        # Busca em tabelas ou listas
        for el in soup.select("td, li"):
            text = el.get_text(strip=True)
            if any(kw in text.lower() for kw in ["cargo", "analista", "técnico", "agente", "escrivão", "delegado"]):
                cargo = re.sub(r"^\d+\s*[-–.)\s]*", "", text).strip()
                if 5 < len(cargo) < 100:
                    cargos.append(cargo)

        return cargos[:10]  # Limita a 10 cargos

    def _infer_nivel(self, cargo: str) -> str:
        """Infere nível de escolaridade pelo cargo."""
        cargo_lower = cargo.lower()
        if any(kw in cargo_lower for kw in ["analista", "auditor", "delegado", "procurador", "juiz"]):
            return "Superior"
        if any(kw in cargo_lower for kw in ["técnico", "agente", "escrivão", "assistente"]):
            return "Médio"
        return "Superior"
