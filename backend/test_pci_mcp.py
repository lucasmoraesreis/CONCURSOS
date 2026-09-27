import urllib.request
import re

url = 'https://www.pciconcursos.com.br/mcp-e-gpt'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        clean = re.sub(r'<style.*?</style>', '', html, flags=re.DOTALL)
        clean = re.sub(r'<script.*?</script>', '', clean, flags=re.DOTALL)
        idx = clean.find('Como funciona')
        if idx != -1:
            print(clean[idx:idx+4000])
except Exception as e:
    print('Error:', e)
