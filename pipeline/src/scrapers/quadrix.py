"""
Scraper para o Quadrix (Instituto Quadrix).
Banca frequente em concursos do DF e autarquias federais.
Site oficial: https://www.quadrix.org.br
"""

import re
from bs4 import BeautifulSoup
from loguru import logger

from src.scrapers.base_scraper import BaseScraper, ConcursoInfo


ORGAOS_DF_QUADRIX = [
    "CRO-DF", "CRF-DF", "CRP-DF", "CRESS-DF", "CFM",
    "SEDF", "SES-DF", "CODHAB", "TERRACAP", "CEB",
    "SEEDF", "GDF", "PMDF", "PCDF", "CBMDF", "CLDF",
    "Conselho Federal", "Conselho Regional",
]


class QuadrixScraper(BaseScraper):
    """Scraper específico para o Quadrix — concursos do DF e conselhos."""

    BANCA_NOME = "Quadrix"
    BANCA_SLUG = "quadrix"
    BASE_URL = "https://www.quadrix.org.br"

    def search_concursos(
        self, ano_inicio: int = 2016, ano_fim: int = 2026
    ) -> list[ConcursoInfo]:
        """Busca concursos no site do Quadrix, foco em DF."""
        concursos = []

        try:
            html = self.fetch_page(f"{self.BASE_URL}/concursos/anteriores")
            soup = BeautifulSoup(html, "lxml")

            links = soup.select("a[href*='concurso'], a[href*='processo']")

            for link in links:
                href = link.get("href", "")
                text = link.get_text(strip=True)

                if not text or len(text) < 5:
                    continue

                ano_match = re.search(r"20[12]\d", text + " " + href)
                if not ano_match:
                    continue
                ano = int(ano_match.group())
                if ano < ano_inicio or ano > ano_fim:
                    continue

                # Prioriza DF
                is_df = any(
                    orgao.lower() in text.lower()
                    for orgao in ORGAOS_DF_QUADRIX
                )

                orgao = self._extract_orgao(text)
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                try:
                    infos = self._parse_concurso_page(full_url, orgao, ano)
                    concursos.extend(infos)
                except Exception as e:
                    logger.warning(f"Erro Quadrix '{text}': {e}")

        except Exception as e:
            logger.error(f"Erro geral Quadrix: {e}")

        logger.info(f"Quadrix: {len(concursos)} concursos encontrados.")
        return concursos

    def _parse_concurso_page(self, url: str, orgao: str, ano: int) -> list[ConcursoInfo]:
        """Extrai provas e gabaritos de uma página de concurso."""
        results = []
        try:
            html = self.fetch_page(url)
            soup = BeautifulSoup(html, "lxml")

            pdf_links = soup.select("a[href$='.pdf']")
            prova_urls, gabarito_urls = [], []

            for link in pdf_links:
                href = link.get("href", "")
                text = link.get_text(strip=True).lower()
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                if any(kw in text for kw in ["gabarito", "resposta"]):
                    gabarito_urls.append(full_url)
                elif any(kw in text for kw in ["prova", "caderno", "questões"]):
                    prova_urls.append(full_url)

            if prova_urls:
                results.append(ConcursoInfo(
                    orgao=orgao, cargo="Cargo Geral", ano=ano,
                    nivel="Superior", edital_url=url,
                    prova_urls=prova_urls, gabarito_urls=gabarito_urls,
                ))
        except Exception as e:
            logger.warning(f"Erro parsear Quadrix {url}: {e}")
        return results

    def _extract_orgao(self, text: str) -> str:
        for orgao in ORGAOS_DF_QUADRIX:
            if orgao.lower() in text.lower():
                return orgao
        return re.sub(r"(?:concurso|público|quadrix)\s*", "", text, flags=re.IGNORECASE).strip()[:80]
