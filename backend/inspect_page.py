import sqlite3
from src.services.pci_concursos_scraper import pci_concursos_scraper, slugify

url = 'https://www.pciconcursos.com.br/concursos/centrooeste/'
html = pci_concursos_scraper._fetch_html(url)
concursos = pci_concursos_scraper.parse_concursos_page(html)

print(f"Total parsed: {len(concursos)}")

conn = sqlite3.connect(pci_concursos_scraper.db_path)
c = conn.cursor()

in_db = 0
new_items = []

for item in concursos:
    orgao = item.get('orgao', '').strip()[:200]
    cargos = item.get('cargos', 'Geral').strip()[:300]
    if not cargos or cargos.lower() == 'vários cargos':
        cargos = 'Diversos Cargos'
    edital_url = item.get('url_completa', '')
    banca_nome = pci_concursos_scraper._detect_banca(item)
    b_slug = slugify(banca_nome)
    
    # Check if in DB by URL
    c.execute("SELECT id, orgao, cargo FROM concursos WHERE edital_url = ?", (edital_url,))
    by_url = c.fetchone()
    
    # Check by identity
    c.execute("""
        SELECT c.id FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE (b.slug = ? OR b.nome = ?) AND c.orgao = ? AND c.cargo = ? AND c.ano = 2026
    """, (b_slug, banca_nome, orgao, cargos))
    by_ident = c.fetchone()
    
    if by_url or by_ident:
        in_db += 1
    else:
        new_items.append((item, banca_nome, cargos))

print(f"Already in DB: {in_db}")
print(f"New to insert: {len(new_items)}")
for item, banca, cargos in new_items:
    print(f"  -> UF: {item['uf']} | Órgão: {item['orgao']} | Cargo: {cargos} | Nível: {item['nivel']} | Banca: {banca} | Vagas: {item.get('vagas')} | Salário: {item.get('salario_max')} | Até: {item.get('inscricao_ate')}")

conn.close()
