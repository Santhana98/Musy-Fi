import urllib.request
import json

url = 'https://api.invidious.io/instances'
print(f"Fetching from {url}...")
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=5) as response:
        content = response.read().decode('utf-8')
        print("Status Code:", response.status)
        print("Content Type:", response.headers.get('content-type'))
        print("Content snippet:", content[:200])
        # Try to parse
        try:
            data = json.loads(content)
            print("Successfully parsed JSON!")
            print("Number of instances:", len(data))
        except Exception as json_err:
            print("JSON parse failed:", json_err)
except Exception as e:
    print(f"Fetch failed: {e}")
