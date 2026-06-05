import urllib.request
import ssl
import re
import os

chunks = [
    "vQVM-gJR.js",
    "lJIV_YBA.js"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://under250art.ca/',
    'Accept': '*/*'
}

os.makedirs('scratch/nuxt_chunks', exist_ok=True)

for name in chunks:
    url = f"https://clickapi.net/_nuxt/{name}"
    print(f"\n=========================================\nFetching {url}...")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as r:
            js = r.read().decode('utf-8')
            print("Length:", len(js))
            # Save to disk
            with open(f"scratch/nuxt_chunks/{name}", "w", encoding="utf-8") as f:
                f.write(js)
            
            # Print search context
            keywords = ["getValidToken", "token", "btoa", "encode", "cipher", "secret", "auth", "bearer", "sign"]
            for kw in keywords:
                matches = list(re.finditer(re.escape(kw), js, re.IGNORECASE))
                if matches:
                    print(f"Keyword '{kw}' found {len(matches)} times.")
                    # Let's print the context of the first 2 occurrences
                    for m in matches[:2]:
                        pos = m.start()
                        context = js[max(0, pos-80):min(len(js), pos+150)]
                        print(f"  Context: {context.replace('\n', ' ')}")
    except Exception as e:
        print("Failed:", e)
