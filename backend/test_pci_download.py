import urllib.request

url = 'https://www.pciconcursos.com.br/provas/download/analista-do-seguro-social-inss-cespe-2016'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        idx = html.find('prova-pdf-link')
        if idx != -1:
            idx2 = html.find('<script', idx)
            print(html[idx2:idx2+2000])
except Exception as e:
    print('Error:', e)
