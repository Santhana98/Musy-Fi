import urllib.request
import json
import socket

url = 'https://instances.cobalt.best/api/v1/instances'
print("Resolving instances.cobalt.best...")
try:
    ip = socket.gethostbyname('instances.cobalt.best')
    print(f"IP: {ip}")
except Exception as e:
    print(f"DNS Resolution failed: {e}")

try:
    print("Fetching instances list...")
    with urllib.request.urlopen(url, timeout=5) as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print(f"Found {len(data)} instances.")
        print("First instance:", data[0] if len(data) > 0 else "None")
except Exception as e:
    print(f"Fetch failed: {e}")
