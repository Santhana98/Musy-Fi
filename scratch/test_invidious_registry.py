import urllib.request
import json
import socket
import ssl

url = 'https://instances.invidious.io/instances.json'
print(f"Fetching Invidious registry from {url}...")

# Ignore SSL errors just in case
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
        content = response.read().decode('utf-8')
        data = json.loads(content)
        print(f"Successfully fetched! Total instances: {len(data)}")
        
        # Sort/Filter healthy HTTPS instances
        # Format of instances.json is a list of [domain, data_dict] or similar
        # Let's inspect the first element structure
        first_item = data[0]
        print("First item structure:", first_item)
except Exception as e:
    print(f"Fetch failed: {e}")
