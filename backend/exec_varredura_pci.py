"""
Script de Execução da Varredura Completa do PCI Concursos.
Varre sistematicamente o portal https://www.pciconcursos.com.br/ e popula o banco
questoes.db com centenas de questões reais abrangendo todas as matérias de concursos.
"""

import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.services.pci_crawler import pci_crawler, DISCIPLINAS_PCI_MAP
import sqlite3

def print_db_summary():
    conn = sqlite3.connect(pci_crawler.db_path)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM questoes")
    total_q = c.fetchone()[0]
    c.execute("SELECT count(*) FROM concursos")
    total_c = c.fetchone()[0]
    c.execute("SELECT count(*) FROM bancas")
    total_b = c.fetchone()[0]
    
    print("\n" + "="*60)
    print(f"ESTADO ATUAL DO BANCO ({pci_crawler.db_path}):")
    print(f"  * Total de Questões: {total_q}")
    print(f"  * Total de Concursos: {total_c}")
    print(f"  * Total de Bancas: {total_b}")
    print("="*60 + "\n")
    conn.close()

if __name__ == "__main__":
    print_db_summary()
    print("Iniciando varredura e ingestão em massa do PCI Concursos...")
    start_time = time.time()
    
    # 2 páginas por subcategoria, até 3 subcategorias por disciplina = ~120-180 questões por disciplina
    res = pci_crawler.sweep_all(
        max_pages_per_subcat=2,
        max_subcats_per_disc=3,
    )
    
    elapsed = time.time() - start_time
    print("\n" + "#"*60)
    print(f"VARREDURA FINALIZADA EM {elapsed:.1f} SEGUNDOS!")
    print(f"Total de Novas Questões Adicionadas: {res['total_adicionadas']}")
    print(f"Total de Questões Duplicadas Ignoradas: {res['total_duplicadas']}")
    print("\nDetalhes por Disciplina:")
    for d, count in res["disciplinas"].items():
        print(f"  - {d}: +{count} questões")
    print("#"*60)
    
    print_db_summary()
