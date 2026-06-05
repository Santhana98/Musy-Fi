import urllib.request
import ssl
import re

url = 'https://cobalt.directory/'
print("Fetching cobalt.directory...")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        html = response.read().decode('utf-8')
        print("Length:", len(html))
        
        with open('scratch/cobalt_directory.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved to scratch/cobalt_directory.html")
        
        # Look for any JSON strings or scripts
        scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
        print(f"Found {len(scripts)} scripts.")
        for idx, script in enumerate(scripts):
            if "techaro" in script or "cobalt" in script or "instances" in script or "[" in script:
                print(f"\nScript {idx + 1} snippet:")
                print(script[:1000])
except Exception as e:
    print("Fetch failed:", e)
