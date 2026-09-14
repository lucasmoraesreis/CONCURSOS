"""
Scraper para o IADES (Instituto Americano de Desenvolvimento).
Principal banca de concursos do GDF e órgãos do DF.
Site oficial: https://www.iades.com.br
"""

import re
from bs4 import BeautifulSoup
from loguru import logger

from src.scrapers.base_scraper import BaseScraper, ConcursoInfo


# Órgãos prioritários do DF
ORGAOS_DF = [
    "GDF", "CLDF", "TJDFT", "PCDF", "PMDF", "CBMDF",
    "SES-DF", "SEEDF", "SEEC-DF", "DETRAN-DF", "BRB",
    "PGDF", "DPDF", "TCDF", "MPDFT", "DPU",
    "CEB", "CAESB", "NOVACAP", "CODHAB", "IPREV",
    "Secretaria de Saúde", "Secretaria de Educação",
    "Polícia Civil do DF", "Polícia Militar do DF",
    "Corpo de Bombeiros", "Tribunal de Justiça do DF",
    "Câmara Legislativa", "Defensoria Pública",
]


class IADESScraper(BaseScraper):
    """Scraper específico para o IADES — foco em concursos do DF."""

    BANCA_NOME = "IADES"
    BANCA_SLUG = "iades"
    BASE_URL = "https://www.iades.com.br"

    def search_concursos(
        self, ano_inicio: int = 2016, ano_fim: int = 2026
    ) -> list[ConcursoInfo]:
        """
        Busca concursos no site do IADES.
        Foco em órgãos do Distrito Federal.
        """
        concursos = []

        try:
            # O IADES lista concursos em páginas organizadas por ano
            for ano in range(ano_fim, ano_inicio - 1, -1):
                logger.info(f"IADES: Buscando concursos de {ano}...")

                try:
                    html = self.fetch_page(f"{self.BASE_URL}/concursos/anteriores")
                    soup = BeautifulSoup(html, "lxml")

                    # Busca links de concursos
                    links = soup.select("a[href*='concurso']")

                    for link in links:
                        href = link.get("href", "")
                        text = link.get_text(strip=True)

                        if not text or len(text) < 5:
                            continue

                        # Verifica se é do DF
                        is_df = any(
                            orgao.lower() in text.lower()
                            for orgao in ORGAOS_DF
                        )
                        if not is_df:
                            continue

                        # Verifica ano
                        ano_match = re.search(r"20[12]\d", text + " " + href)
                        if ano_match:
                            found_ano = int(ano_match.group())
                            if found_ano != ano:
                                continue
                        else:
                            continue

                        orgao = self._extract_orgao(text)
                        full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                        try:
                            infos = self._parse_concurso_page(full_url, orgao, ano)
                            concursos.extend(infos)
                        except Exception as e:
                            logger.warning(f"Erro ao parsear concurso IADES '{text}': {e}")

                except Exception as e:
                    logger.warning(f"Erro IADES para ano {ano}: {e}")

        except Exception as e:
            logger.error(f"Erro geral no IADES: {e}")

        logger.info(f"IADES: {len(concursos)} concursos do DF encontrados.")
        return concursos

    def _parse_concurso_page(self, url: str, orgao: str, ano: int) -> list[ConcursoInfo]:
        """Acessa página do concurso e extrai links de provas/gabaritos."""
        results = []

        try:
            html = self.fetch_page(url)
            soup = BeautifulSoup(html, "lxml")

            pdf_links = soup.select("a[href*='.pdf'], a[href*='download']")

            prova_urls = []
            gabarito_urls = []

            for link in pdf_links:
                href = link.get("href", "")
                text = link.get_text(strip=True).lower()
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                if any(kw in text for kw in ["gabarito", "preliminar", "definitivo", "resposta"]):
                    gabarito_urls.append(full_url)
                elif any(kw in text for kw in ["prova", "caderno", "questões", "objetiva", "tipo"]):
                    prova_urls.append(full_url)

            if prova_urls:
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
            logger.warning(f"Erro ao parsear página IADES {url}: {e}")

        return results

    def _extract_orgao(self, text: str) -> str:
        """Extrai nome do órgão."""
        for orgao in ORGAOS_DF:
            if orgao.lower() in text.lower():
                return orgao
        cleaned = re.sub(r"(?:concurso|público|edital|iades)\s*", "", text, flags=re.IGNORECASE)
        return cleaned.strip()[:80]

    def _extract_cargos(self, soup: BeautifulSoup) -> list[str]:
        """Extrai cargos da página."""
        cargos = []
        for el in soup.select("td, li, span"):
            text = el.get_text(strip=True)
            keywords = ["analista", "técnico", "agente", "escrivão", "delegado",
                        "enfermeiro", "médico", "professor", "auxiliar", "oficial"]
            if any(kw in text.lower() for kw in keywords):
                cargo = re.sub(r"^\d+\s*[-–.)\s]*", "", text).strip()
                if 5 < len(cargo) < 120:
                    cargos.append(cargo)
        return cargos[:15]

    def _infer_nivel(self, cargo: str) -> str:
        """Infere nível de escolaridade."""
        cargo_lower = cargo.lower()
        if any(kw in cargo_lower for kw in ["analista", "auditor", "delegado", "procurador",
                                              "médico", "enfermeiro", "professor", "engenheiro"]):
            return "Superior"
        if any(kw in cargo_lower for kw in ["técnico", "agente", "escrivão", "assistente", "auxiliar"]):
            return "Médio"
        return "Superior"
