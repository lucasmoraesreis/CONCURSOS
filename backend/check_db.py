import sqlite3

conn = sqlite3.connect('d:/QUESTÕES/questoes.db')
c = conn.cursor()
c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='concursos'")
print(c.fetchone()[0])

c.execute("SELECT count(*) FROM concursos")
print("Total concursos in DB:", c.fetchone()[0])

c.execute("SELECT count(*) FROM bancas")
print("Total bancas in DB:", c.fetchone()[0])

c.execute("SELECT count(*) FROM provas")
print("Total provas in DB:", c.fetchone()[0])

c.execute("SELECT count(*) FROM questoes")
print("Total questoes in DB:", c.fetchone()[0])
conn.close()
