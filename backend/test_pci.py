import urllib.request
import urllib.parse
import re

url = 'https://www.pciconcursos.com.br/provas/'
data = urllib.parse.urlencode({'prova': 'INSS', 'botao': 'Pesquisar'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print("HTML length:", len(html))
        # Look for table or list items
        matches = re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', html)
        provas = [(h, t) for h, t in matches if 'download' in h or 'prova' in h]
        print("Matches found:", len(provas))
        for h, t in provas[:25]:
            print(f"{t.strip()} -> {h}")
except Exception as e:
    print('Error:', e)
