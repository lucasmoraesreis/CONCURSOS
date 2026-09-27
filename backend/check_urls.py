from src.services.pci_concursos_scraper import pci_concursos_scraper
import sqlite3

url = 'https://www.pciconcursos.com.br/concursos/centrooeste/'
html = pci_concursos_scraper._fetch_html(url)
concursos = pci_concursos_scraper.parse_concursos_page(html)

conn = sqlite3.connect('d:/QUESTÕES/questoes.db')
c = conn.cursor()

for item in concursos:
    u = item.get('url_completa')
    c.execute("SELECT id, edital_url FROM concursos WHERE edital_url = ?", (u,))
    row = c.fetchone()
    if not row:
        print(f"No match for URL: {u} (Órgão: {item['orgao']})")
        # Check what is in DB for this orgao
        c.execute("SELECT edital_url FROM concursos WHERE orgao = ?", (item['orgao'],))
        db_urls = c.fetchall()
        print(f"  In DB: {db_urls}")

conn.close()
