import urllib.request
import re

url = 'https://www.pciconcursos.com.br/noticias/associacao-das-pioneiras-sociais-abre-selecao-para-medico-neurofisiologista'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

print("Title:", re.findall(r'<title>(.*?)</title>', html))
print("Edital link matches:", re.findall(r'href=["\']([^"\']*(?:edital|pdf)[^"\']*)["\']', html, re.I))
# Find links inside the article
links = re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', html)
for href, text in links[:15]:
    print(f"  Link: {href} -> {text.strip()}")
