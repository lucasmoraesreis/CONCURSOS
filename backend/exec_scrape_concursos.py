"""
Script de Execução — Importação de Concursos Abertos do PCI Concursos.

Varre a listagem de concursos públicos abertos em https://www.pciconcursos.com.br/concursos
e popula o banco questoes.db com órgãos, cargos, vagas, salários e provas associadas.

Uso:
    python exec_scrape_concursos.py                    # Scrape básico
    python exec_scrape_concursos.py --with-provas      # + busca provas no acervo
    python exec_scrape_concursos.py --with-questoes    # + crawl de questões dos simulados
    python exec_scrape_concursos.py --full              # Pipeline completo
"""

import argparse
import sys
import time
from pathlib import Path

# Garantir que o diretório raiz do backend esteja no path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import sqlite3
from src.services.pci_concursos_scraper import pci_concursos_scraper


def print_db_summary(db_path: str):
    """Exibe resumo do estado atual do banco de dados."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("SELECT count(*) FROM bancas")
    total_bancas = c.fetchone()[0]

    c.execute("SELECT count(*) FROM concursos")
    total_concursos = c.fetchone()[0]

    c.execute("SELECT count(*) FROM provas")
    total_provas = c.fetchone()[0]

    c.execute("SELECT count(*) FROM questoes")
    total_questoes = c.fetchone()[0]

    # Concursos por nível
    c.execute("SELECT nivel, count(*) FROM concursos GROUP BY nivel ORDER BY count(*) DESC")
    niveis = c.fetchall()

    # Top 10 bancas
    c.execute("""
        SELECT b.nome, count(c.id) as total
        FROM bancas b
        LEFT JOIN concursos c ON c.banca_id = b.id
        GROUP BY b.id
        ORDER BY total DESC
        LIMIT 10
    """)
    top_bancas = c.fetchall()

    conn.close()

    print("\n" + "=" * 60)
    print(f"📊 ESTADO DO BANCO ({db_path})")
    print("=" * 60)
    print(f"  📦 Total de Bancas:     {total_bancas}")
    print(f"  🏛️  Total de Concursos:  {total_concursos}")
    print(f"  📄 Total de Provas:     {total_provas}")
    print(f"  ❓ Total de Questões:   {total_questoes}")

    if niveis:
        print("\n  📈 Concursos por Nível:")
        for nivel, count in niveis:
            print(f"      {nivel}: {count}")

    if top_bancas:
        print("\n  🏆 Top 10 Bancas:")
        for nome, count in top_bancas:
            print(f"      {nome}: {count} concursos")

    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Importa concursos abertos do PCI Concursos para o banco questoes.db"
    )
    parser.add_argument(
        "--with-provas",
        action="store_true",
        help="Busca provas anteriores no acervo do PCI para os concursos importados",
    )
    parser.add_argument(
        "--with-questoes",
        action="store_true",
        help="Dispara o crawler de questões dos simulados após importar concursos",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Executa o pipeline completo (scrape + provas + questões)",
    )
    parser.add_argument(
        "--url",
        type=str,
        default=None,
        help="URL específica para scraping (ex: https://www.pciconcursos.com.br/concursos/centrooeste/)",
    )
    parser.add_argument(
        "--max-questoes-pages",
        type=int,
        default=2,
        help="Máximo de páginas por subcategoria ao crawlear questões (default: 2)",
    )

    args = parser.parse_args()

    with_provas = args.with_provas or args.full
    with_questoes = args.with_questoes or args.full

    # Resumo inicial
    print_db_summary(pci_concursos_scraper.db_path)

    print("🚀 Iniciando importação de concursos abertos do PCI Concursos...")
    if args.url:
        print(f"   URL Alvo: {args.url}")
    print(f"   Com busca de provas: {'✅ Sim' if with_provas else '❌ Não'}")
    print(f"   Com crawl de questões: {'✅ Sim' if with_questoes else '❌ Não'}")
    print()

    start_time = time.time()

    result = pci_concursos_scraper.run_full_pipeline(
        target_url=args.url,
        with_provas=with_provas,
        with_questoes=with_questoes,
        max_questoes_pages=args.max_questoes_pages,
    )

    elapsed = time.time() - start_time

    print("\n" + "#" * 60)
    print(f"🏁 IMPORTAÇÃO FINALIZADA EM {elapsed:.1f} SEGUNDOS!")
    print("#" * 60)
    print(f"  Concursos rastreados do site:  {result['concursos_rastreados']}")
    print(f"  Novos concursos inseridos:     {result['inseridos']}")
    print(f"  Duplicados ignorados:          {result['duplicados']}")
    print(f"  Erros de processamento:        {result['erros']}")

    if "provas" in result:
        print(f"\n  Provas pendentes verificadas:  {result['provas']['total_pendentes']}")
        print(f"  Provas localizadas no acervo:  {result['provas']['provas_encontradas']}")

    if "questoes" in result:
        print(f"\n  Questões adicionadas:          {result['questoes']['total_adicionadas']}")
        print(f"  Questões duplicadas ignoradas: {result['questoes']['total_duplicadas']}")

    print("#" * 60)

    # Resumo final
    print_db_summary(pci_concursos_scraper.db_path)


if __name__ == "__main__":
    main()
