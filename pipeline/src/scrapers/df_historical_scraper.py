"""
Scraper Histórico Focado no Distrito Federal (DF).

Orquestra e executa a mineração profunda de editais, cadernos de prova
e gabaritos oficiais aplicados nos últimos 10 anos (2014–2024+) nos órgãos
públicos do Distrito Federal.

Bancas cobertas:
  - IADES (banca tradicional do GDF)
  - Quadrix (conselhos regionais e órgãos distritais)
  - Cebraspe (PCDF, TJDFT, PMDF, CBMDF, TCDF, PGDF, DPDF, SEDF)
"""

import os
import re
from pathlib import Path
from typing import Optional
from loguru import logger

from src.config import settings
from src.scrapers.base_scraper import ConcursoInfo
from src.scrapers.cebraspe import CebraspeScraper
from src.scrapers.iades import IADESScraper, ORGAOS_DF as IADES_ORGAOS_DF
from src.scrapers.quadrix import QuadrixScraper


# Lista mestra de órgãos e siglas do Distrito Federal
DF_ORGAOS_KEYWORDS = [
    "cldf", "camara legislativa", "tjdft", "tribunal de justica do distrito federal",
    "pcdf", "policia civil do distrito federal", "policia civil do df",
    "pmdf", "policia militar do distrito federal", "policia militar do df",
    "cbmdf", "bombeiros df", "corpo de bombeiros do distrito federal",
    "tcdf", "tribunal de contas do distrito federal",
    "pgdf", "procuradoria geral do distrito federal",
    "dpdf", "defensoria publica do distrito federal",
    "mpdft", "ministerio publico do distrito federal",
    "brb", "banco de brasilia",
    "sedf", "seedf", "secretaria de educacao do distrito federal", "secretaria de estado de educacao do df",
    "ses-df", "secretaria de saude do distrito federal", "secretaria de estado de saude do df",
    "detran-df", "departamento de transito do distrito federal",
    "ppgg-df", "ppgg", "gestao governamental",
    "seec-df", "economia df",
    "caesb", "ceb", "novacap", "codhab", "iprev-df", "slu",
    "gdf", "governo do distrito federal", "distrito federal"
]


class DFHistoricalScraper:
    """
    Minerador histórico especializado em concursos do Distrito Federal.
    Centraliza e unifica o fluxo de coleta das bancas IADES, Quadrix e Cebraspe.
    """

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir or settings.PROVAS_DIR)
        self.iades_scraper = IADESScraper(output_dir=str(self.output_dir))
        self.quadrix_scraper = QuadrixScraper(output_dir=str(self.output_dir))
        self.cebraspe_scraper = CebraspeScraper(output_dir=str(self.output_dir))

    @staticmethod
    def is_df_concurso(concurso: ConcursoInfo) -> bool:
        """Verifica se o concurso pertence a um órgão do Distrito Federal."""
        search_target = f"{concurso.orgao} {concurso.cargo} {concurso.banca}".lower()
        return any(kw in search_target for kw in DF_ORGAOS_KEYWORDS)

    def mine_df_historical_exams(
        self,
        ano_inicio: int = 2014,
        ano_fim: int = 2026,
        bancas: Optional[list[str]] = None,
        max_concursos_por_banca: int = 20,
        download_files: bool = True,
    ) -> list[ConcursoInfo]:
        """
        Executa varredura profunda de concursos do DF entre os anos informados.

        Args:
            ano_inicio: Ano inicial do corte temporal (ex: 2014 para 10 anos)
            ano_fim: Ano final do corte temporal
            bancas: Lista de bancas para minerar (padrão: ["iades", "quadrix", "cebraspe"])
            max_concursos_por_banca: Limite de concursos para baixar por banca
            download_files: Se True, baixa PDFs de prova e gabarito

        Returns:
            Lista de ConcursoInfo dos concursos do DF encontrados e processados.
        """
        selected_bancas = [b.lower() for b in (bancas or ["iades", "quadrix", "cebraspe"])]
        df_concursos_total: list[ConcursoInfo] = []

        logger.info(
            f"🏛️ Iniciando Mineração Histórica do Distrito Federal (DF) [{ano_inicio}–{ano_fim}]..."
        )

        # 1. Mineração IADES (Foco nativo no DF)
        if "iades" in selected_bancas:
            logger.info("🔍 Mineração DF: Iniciando varredura no IADES...")
            try:
                iades_concursos = self.iades_scraper.search_concursos(
                    ano_inicio=ano_inicio, ano_fim=ano_fim
                )
                df_iades = [c for c in iades_concursos if self.is_df_concurso(c)]
                logger.info(f"✅ IADES: {len(df_iades)} concursos do DF identificados.")
                df_concursos_total.extend(df_iades[:max_concursos_por_banca])
            except Exception as e:
                logger.error(f"Erro ao minerar IADES DF: {e}")

        # 2. Mineração Quadrix (Conselhos e Órgãos Distritais)
        if "quadrix" in selected_bancas:
            logger.info("🔍 Mineração DF: Iniciando varredura no Quadrix...")
            try:
                quadrix_concursos = self.quadrix_scraper.search_concursos(
                    ano_inicio=ano_inicio, ano_fim=ano_fim
                )
                df_quadrix = [c for c in quadrix_concursos if self.is_df_concurso(c)]
                logger.info(f"✅ Quadrix: {len(df_quadrix)} concursos do DF identificados.")
                df_concursos_total.extend(df_quadrix[:max_concursos_por_banca])
            except Exception as e:
                logger.error(f"Erro ao minerar Quadrix DF: {e}")

        # 3. Mineração Cebraspe (Grandes órgãos do DF: PCDF, TJDFT, CBMDF, etc.)
        if "cebraspe" in selected_bancas:
            logger.info("🔍 Mineração DF: Iniciando varredura no Cebraspe (Órgãos DF)...")
            try:
                cebraspe_concursos = self.cebraspe_scraper.search_concursos(
                    ano_inicio=ano_inicio, ano_fim=ano_fim
                )
                df_cebraspe = [c for c in cebraspe_concursos if self.is_df_concurso(c)]
                logger.info(f"✅ Cebraspe: {len(df_cebraspe)} concursos do DF identificados.")
                df_concursos_total.extend(df_cebraspe[:max_concursos_por_banca])
            except Exception as e:
                logger.error(f"Erro ao minerar Cebraspe DF: {e}")

        logger.info(
            f"📊 Total de concursos do DF catalogados: {len(df_concursos_total)}"
        )

        # 4. Download dos Cadernos de Prova e Gabaritos Oficiais
        if download_files:
            logger.info("📥 Iniciando download dos cadernos de provas e gabaritos...")
            for idx, concurso in enumerate(df_concursos_total, start=1):
                logger.info(
                    f"[{idx}/{len(df_concursos_total)}] Baixando arquivos: {concurso.orgao} ({concurso.ano}) - Banca {concurso.banca}"
                )
                try:
                    if concurso.banca.lower() == "iades":
                        self.iades_scraper.download_concurso_files(concurso)
                    elif concurso.banca.lower() == "quadrix":
                        self.quadrix_scraper.download_concurso_files(concurso)
                    elif concurso.banca.lower() == "cebraspe":
                        self.cebraspe_scraper.download_concurso_files(concurso)
                except Exception as err:
                    logger.warning(
                        f"Falha ao baixar arquivos do concurso {concurso.orgao}: {err}"
                    )

        logger.info("🎉 Mineração histórica do Distrito Federal concluída com sucesso!")
        return df_concursos_total


# ============================================================================
# CLI de Execução Direta
# ============================================================================

def main():
    """Ponto de entrada para execução via terminal."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Minerador Histórico de Provas e Gabaritos do DF (2014-2024+)"
    )
    parser.add_argument(
        "--ano-inicio",
        type=int,
        default=2014,
        help="Ano inicial da varredura histórica (padrão: 2014)",
    )
    parser.add_argument(
        "--ano-fim",
        type=int,
        default=2026,
        help="Ano final da varredura histórica (padrão: 2026)",
    )
    parser.add_argument(
        "--bancas",
        nargs="+",
        default=["iades", "quadrix", "cebraspe"],
        help="Bancas organizadoras a minerar (padrão: iades quadrix cebraspe)",
    )
    parser.add_argument(
        "--no-download",
        action="store_true",
        help="Apenas cataloga sem realizar download dos PDFs",
    )
    parser.add_argument(
        "--limite",
        type=int,
        default=20,
        help="Limite de concursos por banca (padrão: 20)",
    )

    args = parser.parse_args()

    scraper = DFHistoricalScraper()
    concursos = scraper.mine_df_historical_exams(
        ano_inicio=args.ano_inicio,
        ano_fim=args.ano_fim,
        bancas=args.bancas,
        max_concursos_por_banca=args.limite,
        download_files=not args.no_download,
    )

    print("\n" + "=" * 60)
    print(f"RELATÓRIO DE MINERAÇÃO HISTÓRICA DO DF: {len(concursos)} CONCURSOS")
    print("=" * 60)
    for c in concursos:
        print(f"• [{c.ano}] {c.banca.upper()} — {c.orgao} ({c.cargo}) | Provas: {len(c.provas_urls)}")


if __name__ == "__main__":
    main()
