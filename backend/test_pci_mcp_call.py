import urllib.request
import json

url = 'https://mcp.pciconcursos.com.br/mcp'
headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}
payload = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode('utf-8'))
        tools = body.get('result', {}).get('tools', [])
        print(f"Total tools: {len(tools)}")
        for t in tools:
            print(f"- {t['name']}: {t.get('description', '')[:100]}")
            print(f"  params: {t.get('inputSchema', {}).get('properties', {}).keys()}")
except Exception as e:
    print('Error:', e)
