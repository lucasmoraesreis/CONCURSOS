import urllib.request
import re

url = 'https://www.pciconcursos.com.br/simulados/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        # Find forms or main links
        forms = re.findall(r'<form[^>]*action="([^"]*)"[^>]*>', html)
        print("Forms:", forms)
        # Find headings
        headings = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', html)
        print("Headings:", headings[:15])
        # Find links with href
        all_links = re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', html)
        non_nav = [l for l in all_links if not any(x in l[0] for x in ['facebook', 'twitter', 'google', 'css', 'js', 'cdn'])]
        print(f"Non-nav links ({len(non_nav)}):")
        for h, t in non_nav[15:35]:
            print(f"{t.strip()} -> {h}")
except Exception as e:
    print('Error:', e)
