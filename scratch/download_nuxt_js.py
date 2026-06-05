import urllib.request
import ssl
import re

files = [
    "BDxC-cX1.js",
    "Cnk5Rf1v.js",
    "DYMl1Pb_.js"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://under250art.ca/',
    'Accept': '*/*'
}

for name in files:
    url = f"https://clickapi.net/_nuxt/{name}"
    print(f"\nFetching {url}...")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as r:
            js = r.read().decode('utf-8')
            print("Length:", len(js))
            # Scan for paths or domains
            matches = re.findall(r'"/[a-zA-Z0-9_/:-]+"|\'[a-zA-Z0-9_/:-]+\'', js)
            if matches:
                # print any paths containing api or single or convert
                api_paths = {m for m in matches if "api" in m or "single" in m or "convert" in m or "task" in m}
                print("Found paths:", api_paths)
            
            # Print any string contexts containing fetch or POST
            for m in re.finditer(r'fetch\(|post\(|\$fetch', js):
                pos = m.start()
                print("Fetch Context:", js[max(0, pos-150):min(len(js), pos+250)])
                print("-" * 50)
    except Exception as e:
        print("Failed:", e)
