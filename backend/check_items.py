from src.services.pci_concursos_scraper import pci_concursos_scraper
import json

url = 'https://www.pciconcursos.com.br/concursos/centrooeste/'
html = pci_concursos_scraper._fetch_html(url)
concursos = pci_concursos_scraper.parse_concursos_page(html)

for item in concursos:
    if 'sapezal' in item['orgao'].lower() or 'ponta por' in item['orgao'].lower():
        print(json.dumps(item, indent=2, ensure_ascii=False))
