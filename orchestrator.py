"""
Orquestrador Central da Plataforma de Questões de Concurso.

Automatiza o ciclo de vida completo de ponta a ponta:
  1. Validação do Docker e conectividade do PostgreSQL + pgvector
  2. Execução das migrações do Alembic (alembic upgrade head)
  3. Carga inicial controlada de provas históricas do DF (Cebraspe e IADES 2018-2026)
  4. Indexação vetorial semântica (Gemini text-embedding-004 -> pgvector)

Uso:
  python orchestrator.py
  python orchestrator.py --skip-scraping
  python orchestrator.py --health-check-only
"""

import os
import sys
import time
import socket
import argparse
import subprocess
from pathlib import Path
from loguru import logger

# Raiz do projeto
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR / "pipeline"))


def print_banner():
    banner = """
======================================================================
     PLATAFORMA DE QUESTÕES DE CONCURSO — ORQUESTRADOR E2E
   FastAPI + React + PostgreSQL 16 (pgvector) + Google Gemini
======================================================================
"""
    print(banner)


def check_port(host: str, port: int, timeout: float = 3.0) -> bool:
    """Testa se uma porta TCP está aberta e respondendo."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def step_1_check_docker(auto_start: bool = True) -> bool:
    """Valida se o PostgreSQL está ativo via Docker ou localmente na porta 5432."""
    logger.info("Etapa 1/4: Verificando infraestrutura de banco de dados (Porta 5432)...")

    if check_port("localhost", 5432):
        logger.success("Porta 5432 aberta e respondendo! PostgreSQL ativo.")
        return True

    logger.warning("PostgreSQL não detectado na porta 5432.")
    if auto_start:
        logger.info("Tentando inicializar o banco via docker-compose up -d...")
        try:
            cmd = ["docker-compose", "up", "-d", "postgres"]
            res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
            if res.returncode == 0:
                logger.info("Container iniciado. Aguardando prontidão do PostgreSQL...")
                # Aguarda até 20 segundos
                for _ in range(10):
                    time.sleep(2)
                    if check_port("localhost", 5432):
                        logger.success("PostgreSQL inicializado e operacional via Docker!")
                        return True
            else:
                logger.error(f"Erro ao rodar docker-compose: {res.stderr}")
        except FileNotFoundError:
            logger.error("Comando 'docker-compose' ou 'docker' não encontrado no PATH.")

    logger.error("Falha ao validar ou inicializar o banco de dados. Certifique-se de que o Docker está em execução.")
    return False


def step_2_run_migrations() -> bool:
    """Executa as migrações do Alembic para atualizar o schema do banco."""
    logger.info("Etapa 2/4: Aplicando migrações com Alembic (alembic upgrade head)...")

    backend_dir = ROOT_DIR / "backend"
    try:
        # Executa alembic upgrade head
        cmd = [sys.executable, "-m", "alembic", "upgrade", "head"]
        res = subprocess.run(cmd, cwd=str(backend_dir), capture_output=True, text=True)

        if res.returncode == 0:
            logger.success("Migrações do Alembic aplicadas com sucesso!")
            if res.stdout.strip():
                logger.info(f"Saída Alembic:\n{res.stdout.strip()}")
            return True
        else:
            logger.warning(f"Aviso na execução do Alembic: {res.stderr.strip()}")
            # Tenta aplicar diretamente via SQL se alembic falhar
            logger.info("Tentando sincronização direta via script SQL 002...")
            sql_file = ROOT_DIR / "database" / "002_pgvector_semantic_search.sql"
            if sql_file.exists():
                from src.database import get_session
                from sqlalchemy import text
                session = get_session()
                try:
                    with open(sql_file, "r", encoding="utf-8") as f:
                        sql_content = f.read()
                    # Divide em statements
                    for stmt in sql_content.split(";"):
                        stmt_clean = stmt.strip()
                        if stmt_clean:
                            session.execute(text(stmt_clean))
                    session.commit()
                    logger.success("Schema e índices pgvector aplicados com sucesso via SQL direto!")
                    return True
                except Exception as e:
                    session.rollback()
                    logger.error(f"Erro ao aplicar migração SQL: {e}")
                finally:
                    session.close()

            return False

    except Exception as e:
        logger.error(f"Exceção ao rodar migrações: {e}")
        return False


def step_3_mine_df_historical_exams(
    ano_inicio: int = 2018,
    ano_fim: int = 2026,
    bancas: list[str] = None,
    limite: int = 5,
) -> bool:
    """Invoca o minerador do DF para obter provas e gabaritos oficiais."""
    logger.info(
        f"Etapa 3/4: Minerando certames do Distrito Federal ({ano_inicio}–{ano_fim}) das bancas {bancas}..."
    )

    try:
        from src.scrapers.df_historical_scraper import DFHistoricalScraper

        scraper = DFHistoricalScraper()
        concursos = scraper.mine_df_historical_exams(
            ano_inicio=ano_inicio,
            ano_fim=ano_fim,
            bancas=bancas or ["cebraspe", "iades"],
            max_concursos_por_banca=limite,
            download_files=True,
        )

        logger.success(
            f"Mineração concluída! {len(concursos)} concursos de órgãos do DF catalogados e baixados."
        )
        return True

    except Exception as e:
        logger.error(f"Falha na etapa de mineração histórica do DF: {e}")
        return False


def step_4_generate_embeddings(batch_size: int = 20) -> bool:
    """Executa a indexação vetorial de todas as questões sem embedding."""
    logger.info("Etapa 4/4: Gerando embeddings vetoriais com Gemini (text-embedding-004)...")

    try:
        from src.scripts.generate_embeddings import generate_all_embeddings
        generate_all_embeddings(batch_size=batch_size)
        logger.success("Indexação vetorial pgvector concluída com sucesso!")
        return True
    except Exception as e:
        logger.error(f"Falha na etapa de geração de embeddings: {e}")
        return False


def run_orchestrator(args):
    """Fluxo sequencial mestre."""
    print_banner()
    total_start = time.time()

    # Checagem prévia de saúde se solicitada
    if args.health_check_only:
        from src.utils.health_check import run_health_check
        sys.exit(run_health_check())

    # 1. Docker / Postgres
    if not args.skip_docker:
        if not step_1_check_docker(auto_start=not args.no_auto_start):
            logger.error("Interrompendo orquestração por falta de infraestrutura de dados.")
            sys.exit(1)
    else:
        logger.info("Passo 1 pulado (--skip-docker).")

    # 2. Migrações
    if not args.skip_migrations:
        if not step_2_run_migrations():
            logger.warning("Prosseguindo com cautela após tentativa de migração...")
    else:
        logger.info("Passo 2 pulado (--skip-migrations).")

    # 3. Mineração Histórica DF
    if not args.skip_scraping:
        step_3_mine_df_historical_exams(
            ano_inicio=args.ano_inicio,
            ano_fim=args.ano_fim,
            bancas=args.bancas,
            limite=args.limite,
        )
    else:
        logger.info("Passo 3 pulado (--skip-scraping).")

    # 4. Geração de Embeddings
    if not args.skip_embeddings:
        step_4_generate_embeddings(batch_size=args.batch_size)
    else:
        logger.info("Passo 4 pulado (--skip-embeddings).")

    total_time = time.time() - total_start
    print("\n" + "=" * 70)
    logger.success(f"PIPELINE COMPLETO CONCLUÍDO COM SUCESSO! Tempo total: {total_time:.2f}s")
    print("=" * 70)
    print("Para iniciar a interface web e a API, execute:")
    print("  Windows:  .\\run_all.bat   ou   .\\run_all.ps1")
    print("  Linux:    ./run_all.sh")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Orquestrador do Pipeline de Questões de Concurso"
    )
    parser.add_argument(
        "--health-check-only",
        action="store_true",
        help="Executa apenas os testes de conectividade e sanidade da IA",
    )
    parser.add_argument(
        "--skip-docker",
        action="store_true",
        help="Pula verificação/subida do container Docker",
    )
    parser.add_argument(
        "--no-auto-start",
        action="store_true",
        help="Não tenta iniciar docker-compose automaticamente",
    )
    parser.add_argument(
        "--skip-migrations",
        action="store_true",
        help="Pula a execução do Alembic",
    )
    parser.add_argument(
        "--skip-scraping",
        action="store_true",
        help="Pula a mineração de novas provas no DF",
    )
    parser.add_argument(
        "--skip-embeddings",
        action="store_true",
        help="Pula o cálculo de embeddings",
    )
    parser.add_argument(
        "--ano-inicio",
        type=int,
        default=2018,
        help="Ano inicial para mineração (padrão: 2018)",
    )
    parser.add_argument(
        "--ano-fim",
        type=int,
        default=2026,
        help="Ano final para mineração (padrão: 2026)",
    )
    parser.add_argument(
        "--bancas",
        nargs="+",
        default=["cebraspe", "iades"],
        help="Bancas a minerar (padrão: cebraspe iades)",
    )
    parser.add_argument(
        "--limite",
        type=int,
        default=5,
        help="Quantidade máxima de concursos por banca para carga inicial",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Tamanho do lote para envio de embeddings à API do Gemini",
    )

    args = parser.parse_args()
    run_orchestrator(args)
