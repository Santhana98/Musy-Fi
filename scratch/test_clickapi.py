import urllib.request
import ssl
import re

url = "https://clickapi.net/api/widgetplus?url=https://www.youtube.com/watch?v=tKZmHEyYlbA"
print("Fetching clickapi widget HTML...")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as r:
        html = r.read().decode('utf-8')
        print("Fetched successfully. Length:", len(html))
        
        # Write to local file for analysis
        with open('scratch/clickapi_response.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved to scratch/clickapi_response.html")
        
        # Look for JS scripts or fetch requests in the HTML
        scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
        print(f"Found {len(scripts)} scripts.")
        for idx, script in enumerate(scripts):
            if "fetch" in script or "ajax" in script or "http" in script or "click" in script or "api" in script or "post" in script or "url" in script:
                print(f"\nScript {idx + 1}:")
                print(script[:1000])
except Exception as e:
    print("Fetch failed:", e)
