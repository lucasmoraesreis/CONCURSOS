import sqlite3
import uuid
from datetime import datetime, timezone

def test_concursos_status():
    conn = sqlite3.connect('questoes.db')
    c = conn.cursor()
    c.execute("""
        SELECT c.id, b.nome, c.orgao, c.cargo, c.ano, c.nivel, p.id,
               (SELECT count(*) FROM questoes q WHERE q.prova_id = p.id) as q_cnt
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        JOIN provas p ON p.concurso_id = c.id
        WHERE q_cnt = 0
    """)
    empty_concursos = c.fetchall()
    print(f"Total concursos sem questoes: {len(empty_concursos)}")
    print("Exemplos de concursos que receberao questoes:")
    for row in empty_concursos[:10]:
        print(f"ID={row[0][:8]}.. Banca={row[1]} Orgao={row[2]} Cargo={row[3]} Ano={row[4]} Nivel={row[5]}")

if __name__ == "__main__":
    test_concursos_status()
