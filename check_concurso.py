import sqlite3

conn = sqlite3.connect('questoes.db')
c = conn.cursor()
c.execute("SELECT c.id, c.orgao, c.cargo, c.ano, b.nome FROM concursos c JOIN bancas b ON c.banca_id = b.id WHERE c.orgao LIKE '%Fazenda%' OR b.nome LIKE '%ESAF%'")
print("Found in concursos:", c.fetchall())

c.execute("SELECT id, nome FROM bancas WHERE nome LIKE '%ESAF%'")
print("Found in bancas:", c.fetchall())
conn.close()
