import urllib.request
import re

urls = [
    'https://www.pciconcursos.com.br/aulas/questoes-comentadas/',
    'https://www.pciconcursos.com.br/simulados/',
]

for url in urls:
    print("="*50)
    print("Checking URL:", url)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            print("Length:", len(html))
            # Find links
            links = re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', html)
            print("Total links:", len(links))
            sublinks = [l for l in links if '/questoes' in l[0] or '/simulados/' in l[0] or '/aulas/' in l[0]]
            for h, t in sublinks[:15]:
                print(f" - {re.sub(r'<[^>]+>', '', t).strip()} -> {h}")
    except Exception as e:
        print("Error:", e)
