import urllib.request
import ssl
import re

url = "https://clickapi.net/_nuxt/DKeLsgi5.js"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://under250art.ca/',
    'Accept': '*/*'
}

print("Downloading DKeLsgi5.js...")
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as r:
        js = r.read().decode('utf-8')
        print("Length:", len(js))
        
        # Look for apiBase or useRuntimeConfig()
        matches = [m.start() for m in re.finditer(r'apiBase', js)]
        print(f"Found {len(matches)} matches for apiBase.")
        for idx, pos in enumerate(matches):
            print(f"Match {idx+1} at {pos}:")
            print(js[max(0, pos-200):min(len(js), pos+300)])
            print("-" * 50)
            
        # Search for paths like '/api/' that are used in $fetch or fetch
        fetch_matches = [m.start() for m in re.finditer(r'\$fetch\s*\(', js)]
        print(f"Found {len(fetch_matches)} $fetch calls.")
        for idx, pos in enumerate(fetch_matches[:10]):
            print(f"$fetch Match {idx+1} at {pos}:")
            print(js[max(0, pos-100):min(len(js), pos+200)])
            print("-" * 50)
except Exception as e:
    print(e)
