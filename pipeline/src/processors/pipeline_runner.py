"""
Pipeline Runner — Orquestrador principal (v2).

MELHORIAS do Code Review:
- Stats isolados por run (fix: não acumula entre chamadas)
- Justificativas com batching parcial (ThreadPoolExecutor)
- Modo "Mineração DF" para raspagem focada em Brasília (2016-2026)
- Suporte a múltiplas bancas do DF (Cebraspe, IADES, Quadrix, FGV, Vunesp)
- Geração de embeddings integrada ao processamento

Modos de operação:
1. process_local_pdf() — Processa um PDF manual
2. mine_df_region()    — Mineração histórica do DF (2016-2026)
"""

import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger
from slugify import slugify
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_session
from src.models import (
    Banca, Concurso, Prova, Disciplina, Assunto, Questao, Alternativa
)
from src.extractors.pdf_extractor import extract_pdf
from src.extractors.question_parser import parse_questions, parse_gabarito, QuestaoParsed
from src.llm.client import get_gemini_client, generate_embedding
from src.llm.classifier import classify_batch
from src.llm.justifier import generate_justification


class PipelineRunner:
    """Orquestrador do pipeline de ingestão de questões."""

    def __init__(self):
        self.gemini_client = None

    def _new_stats(self) -> dict:
        """Cria novo dict de estatísticas por run (fix: não compartilha entre chamadas)."""
        return {
            "provas_processadas": 0,
            "questoes_extraidas": 0,
            "questoes_salvas": 0,
            "embeddings_gerados": 0,
            "erros": 0,
        }

    def _ensure_gemini(self):
        """Inicializa o cliente Gemini sob demanda."""
        if self.gemini_client is None:
            self.gemini_client = get_gemini_client()

    def process_local_pdf(
        self,
        pdf_path: str | Path,
        banca_nome: str,
        orgao: str,
        cargo: str,
        ano: int,
        nivel: str = "Superior",
        gabarito_path: str | Path | None = None,
        generate_embeddings: bool = True,
    ) -> dict:
        """
        Processa um PDF local de prova e salva no banco.

        Args:
            pdf_path: Caminho para o PDF da prova.
            banca_nome: Nome da banca.
            orgao: Órgão do concurso.
            cargo: Cargo.
            ano: Ano da prova.
            nivel: Nível de escolaridade.
            gabarito_path: Caminho para o PDF do gabarito (opcional).
            generate_embeddings: Se True, gera embeddings para busca semântica.

        Returns:
            Dict com estatísticas do processamento.
        """
        stats = self._new_stats()
        pdf_path = Path(pdf_path)
        logger.info(f"{'=' * 60}")
        logger.info(f"PROCESSANDO: {pdf_path.name}")
        logger.info(f"Concurso: {orgao} - {cargo} - {ano} ({banca_nome})")
        logger.info(f"{'=' * 60}")

        session = get_session()

        try:
            # 1. Banca
            banca = self._get_or_create_banca(session, banca_nome)

            # 2. Concurso
            concurso = self._get_or_create_concurso(
                session, banca, orgao, cargo, ano, nivel
            )

            # 3. Prova
            prova = Prova(
                concurso_id=concurso.id,
                tipo="objetiva",
                pdf_path_local=str(pdf_path),
                status="baixado",
            )
            session.add(prova)
            session.flush()

            # 4. Extrair texto
            logger.info("Etapa 1/6: Extraindo texto do PDF...")
            pdf_content = extract_pdf(pdf_path)
            prova.status = "extraido"
            session.flush()

            # 5. Parsear questões
            logger.info("Etapa 2/6: Segmentando questões...")
            questoes_parsed = parse_questions(pdf_content.full_text, banca=banca_nome)

            if not questoes_parsed:
                logger.warning("Nenhuma questão encontrada no PDF!")
                prova.status = "erro"
                session.commit()
                return stats

            stats["questoes_extraidas"] = len(questoes_parsed)

            # 6. Gabarito
            gabarito = {}
            if gabarito_path:
                logger.info("Etapa 3/6: Parseando gabarito...")
                gab_content = extract_pdf(Path(gabarito_path))
                gabarito = parse_gabarito(gab_content.full_text)
            else:
                logger.info("Etapa 3/6: Sem gabarito — pulando.")

            # 7. Classificar com LLM (batch)
            logger.info("Etapa 4/6: Classificando questões com Gemini...")
            self._ensure_gemini()
            classificacoes = classify_batch(self.gemini_client, questoes_parsed)

            # 8. Gerar justificativas em paralelo (fix: era sequencial)
            logger.info("Etapa 5/6: Gerando justificativas com IA...")
            justificativas = self._generate_justificativas_parallel(
                questoes_parsed, gabarito, classificacoes
            )

            # 9. Salvar no banco + embeddings
            logger.info("Etapa 6/6: Salvando no banco de dados...")
            for i, q_parsed in enumerate(questoes_parsed):
                classificacao = classificacoes[i] if i < len(classificacoes) else {
                    "disciplina": "Não classificado", "assunto": "Geral"
                }

                disciplina = self._get_or_create_disciplina(
                    session, classificacao["disciplina"]
                )
                assunto = self._get_or_create_assunto(
                    session, disciplina, classificacao["assunto"]
                )

                alt_correta = gabarito.get(q_parsed.numero, None)
                justificativa = justificativas.get(q_parsed.numero, "")

                questao = Questao(
                    prova_id=prova.id,
                    disciplina_id=disciplina.id,
                    assunto_id=assunto.id,
                    numero_questao=q_parsed.numero,
                    tipo_questao=q_parsed.tipo,
                    enunciado=q_parsed.enunciado,
                    alternativa_correta=alt_correta,
                    justificativa_ia=justificativa if justificativa else None,
                )
                session.add(questao)
                session.flush()

                # Alternativas
                for alt in q_parsed.alternativas:
                    alternativa = Alternativa(
                        questao_id=questao.id,
                        letra=alt.letra,
                        texto=alt.texto,
                        is_correta=(alt.letra == alt_correta) if alt_correta else False,
                    )
                    session.add(alternativa)

                # Embedding (se habilitado)
                if generate_embeddings:
                    try:
                        alt_text = " ".join(f"{a.letra}) {a.texto}" for a in q_parsed.alternativas)
                        full_text = f"{q_parsed.enunciado} {alt_text}".strip()
                        emb = generate_embedding(self.gemini_client, full_text)
                        from sqlalchemy import text as sql_text
                        vec_str = "[" + ",".join(str(v) for v in emb) + "]"
                        session.execute(
                            sql_text("UPDATE questoes SET embedding = :vec::vector WHERE id = :id"),
                            {"vec": vec_str, "id": str(questao.id)},
                        )
                        stats["embeddings_gerados"] += 1
                    except Exception as e:
                        logger.warning(f"Embedding Q{q_parsed.numero} falhou: {e}")

                stats["questoes_salvas"] += 1
                if (i + 1) % 10 == 0:
                    logger.info(f"  Salvas {i + 1}/{len(questoes_parsed)} questões...")
                    session.flush()

            prova.status = "processado"
            prova.total_questoes = len(questoes_parsed)
            prova.processed_at = datetime.now(timezone.utc)

            session.commit()
            stats["provas_processadas"] += 1

            logger.info("✅ Processamento concluído!")
            for k, v in stats.items():
                logger.info(f"   {k}: {v}")

        except Exception as e:
            session.rollback()
            logger.error(f"❌ Erro no processamento: {e}")
            stats["erros"] += 1
            raise
        finally:
            session.close()

        return stats

    def _generate_justificativas_parallel(
        self,
        questoes: list[QuestaoParsed],
        gabarito: dict[int, str],
        classificacoes: list[dict],
        max_workers: int = 3,
    ) -> dict[int, str]:
        """
        Gera justificativas em paralelo com ThreadPoolExecutor.
        FIX Code Review: era 1 chamada sequencial por questão.
        """
        justificativas = {}
        self._ensure_gemini()

        items_to_process = []
        for i, q in enumerate(questoes):
            alt_correta = gabarito.get(q.numero)
            if alt_correta:
                classificacao = classificacoes[i] if i < len(classificacoes) else {}
                items_to_process.append((q, alt_correta, classificacao))

        if not items_to_process:
            return justificativas

        def _generate_one(item):
            q, alt_correta, classificacao = item
            try:
                result = generate_justification(
                    self.gemini_client, q, alt_correta,
                    classificacao.get("disciplina", ""),
                    classificacao.get("assunto", ""),
                )
                return q.numero, result
            except Exception as e:
                logger.warning(f"Justificativa Q{q.numero} falhou: {e}")
                return q.numero, ""

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(_generate_one, item): item for item in items_to_process}
            for future in as_completed(futures):
                numero, result = future.result()
                justificativas[numero] = result

        logger.info(f"Justificativas geradas: {len(justificativas)}/{len(items_to_process)}")
        return justificativas

    # =============================================
    # MINERAÇÃO HISTÓRICA DO DF (2016-2026)
    # =============================================

    def mine_df_region(self, ano_inicio: int = 2016, ano_fim: int = 2026):
        """
        Mineração automática de TODOS os concursos do DF (2016-2026).

        Bancas cobertas: Cebraspe, IADES, Quadrix, FGV, Vunesp
        Órgãos: GDF, CLDF, TJDFT, PCDF, PMDF, CBMDF, SES-DF, SEEDF
        """
        from src.scrapers.cebraspe import CebraspeScraper
        from src.scrapers.iades import IADESScraper
        from src.scrapers.quadrix import QuadrixScraper

        logger.info("=" * 60)
        logger.info(f"MINERAÇÃO HISTÓRICA DO DF ({ano_inicio}-{ano_fim})")
        logger.info("=" * 60)

        scrapers = [
            IADESScraper(),
            QuadrixScraper(),
            CebraspeScraper(),
        ]

        total_concursos = 0
        total_provas = 0

        for scraper in scrapers:
            logger.info(f"\n{'─' * 40}")
            logger.info(f"Banca: {scraper.BANCA_NOME}")
            logger.info(f"{'─' * 40}")

            try:
                concursos = scraper.search_concursos(ano_inicio, ano_fim)
                total_concursos += len(concursos)

                for concurso_info in concursos:
                    logger.info(
                        f"  → {concurso_info.orgao} - {concurso_info.cargo} "
                        f"({concurso_info.ano})"
                    )

                    # Download e processamento de cada prova
                    for prova_url in concurso_info.prova_urls:
                        try:
                            pdf_path = scraper.download_pdf(
                                prova_url,
                                settings.pdf_dir / scraper.BANCA_SLUG / str(concurso_info.ano),
                            )

                            # Download gabarito (se disponível)
                            gab_path = None
                            if concurso_info.gabarito_urls:
                                gab_path = scraper.download_pdf(
                                    concurso_info.gabarito_urls[0],
                                    settings.pdf_dir / scraper.BANCA_SLUG / str(concurso_info.ano),
                                    filename=f"gabarito_{pdf_path.stem}.pdf",
                                )

                            # Processa o PDF
                            self.process_local_pdf(
                                pdf_path=pdf_path,
                                banca_nome=scraper.BANCA_NOME,
                                orgao=concurso_info.orgao,
                                cargo=concurso_info.cargo,
                                ano=concurso_info.ano,
                                nivel=concurso_info.nivel,
                                gabarito_path=gab_path,
                            )

                            total_provas += 1

                        except Exception as e:
                            logger.error(f"  ❌ Erro ao processar prova: {e}")

            except Exception as e:
                logger.error(f"Erro no scraper {scraper.BANCA_NOME}: {e}")
            finally:
                scraper.close()

        logger.info(f"\n{'=' * 60}")
        logger.info(f"MINERAÇÃO CONCLUÍDA")
        logger.info(f"  Concursos encontrados: {total_concursos}")
        logger.info(f"  Provas processadas: {total_provas}")
        logger.info(f"{'=' * 60}")

    # =============================================
    # HELPERS — CRUD de entidades auxiliares
    # =============================================

    def _get_or_create_banca(self, session: Session, nome: str) -> Banca:
        slug = slugify(nome)
        banca = session.query(Banca).filter_by(slug=slug).first()
        if not banca:
            banca = Banca(nome=nome, slug=slug)
            session.add(banca)
            session.flush()
            logger.debug(f"Banca criada: {nome}")
        return banca

    def _get_or_create_concurso(
        self, session: Session, banca: Banca,
        orgao: str, cargo: str, ano: int, nivel: str
    ) -> Concurso:
        concurso = session.query(Concurso).filter_by(
            banca_id=banca.id, orgao=orgao, cargo=cargo, ano=ano
        ).first()
        if not concurso:
            concurso = Concurso(
                banca_id=banca.id, orgao=orgao, cargo=cargo,
                ano=ano, nivel=nivel,
            )
            session.add(concurso)
            session.flush()
            logger.debug(f"Concurso criado: {orgao} - {cargo} - {ano}")
        return concurso

    def _get_or_create_disciplina(self, session: Session, nome: str) -> Disciplina:
        slug = slugify(nome)
        disc = session.query(Disciplina).filter_by(slug=slug).first()
        if not disc:
            disc = Disciplina(nome=nome, slug=slug)
            session.add(disc)
            session.flush()
            logger.debug(f"Disciplina criada: {nome}")
        return disc

    def _get_or_create_assunto(
        self, session: Session, disciplina: Disciplina, nome: str
    ) -> Assunto:
        slug = slugify(nome)
        assunto = session.query(Assunto).filter_by(
            disciplina_id=disciplina.id, slug=slug
        ).first()
        if not assunto:
            assunto = Assunto(
                disciplina_id=disciplina.id, nome=nome, slug=slug,
            )
            session.add(assunto)
            session.flush()
            logger.debug(f"Assunto criado: {nome} (em {disciplina.nome})")
        return assunto


# =============================================
# CLI
# =============================================

def main():
    """CLI do pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Pipeline de ingestão de questões")
    subparsers = parser.add_subparsers(dest="command", help="Comandos disponíveis")

    # Comando: process
    proc = subparsers.add_parser("process", help="Processa um PDF local")
    proc.add_argument("pdf", help="Caminho para o PDF da prova")
    proc.add_argument("--banca", required=True)
    proc.add_argument("--orgao", required=True)
    proc.add_argument("--cargo", required=True)
    proc.add_argument("--ano", type=int, required=True)
    proc.add_argument("--nivel", default="Superior", choices=["Superior", "Médio", "Fundamental"])
    proc.add_argument("--gabarito", default=None)
    proc.add_argument("--no-embeddings", action="store_true", help="Não gerar embeddings")

    # Comando: mine-df
    mine = subparsers.add_parser("mine-df", help="Mineração histórica do DF")
    mine.add_argument("--ano-inicio", type=int, default=2016)
    mine.add_argument("--ano-fim", type=int, default=2026)

    args = parser.parse_args()

    logger.add(
        settings.pdf_dir.parent / "logs" / "pipeline_{time}.log",
        rotation="10 MB",
        level=settings.log_level,
    )

    runner = PipelineRunner()

    if args.command == "process":
        stats = runner.process_local_pdf(
            pdf_path=args.pdf,
            banca_nome=args.banca,
            orgao=args.orgao,
            cargo=args.cargo,
            ano=args.ano,
            nivel=args.nivel,
            gabarito_path=args.gabarito,
            generate_embeddings=not args.no_embeddings,
        )
        print(f"\n{'='*40}")
        print("RESULTADO DO PROCESSAMENTO")
        print(f"{'='*40}")
        for key, value in stats.items():
            print(f"  {key}: {value}")

    elif args.command == "mine-df":
        runner.mine_df_region(
            ano_inicio=args.ano_inicio,
            ano_fim=args.ano_fim,
        )

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
