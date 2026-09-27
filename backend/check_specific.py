import sqlite3

conn = sqlite3.connect('d:/QUESTÕES/questoes.db')
c = conn.cursor()

orgaos = [
    'Prefeitura de Carmo do Rio Verde',
    'SME - Secretaria Municipal de Educação de Cristalina',
    'UFJ - Universidade Federal de Jataí',
    'Prefeitura de Sapezal'
]

for org in orgaos:
    print("=" * 50)
    print("Search for:", org)
    c.execute("SELECT id, orgao, cargo, ano, nivel, edital_url FROM concursos WHERE orgao LIKE ?", (f"%{org}%",))
    rows = c.fetchall()
    for r in rows:
        print("  DB row:", r)

conn.close()
