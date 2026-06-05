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
        
        # Search for occurrences of '/api/single' or '/api/button' and print context
        search_terms = ['/api/single', '/api/button', 'api/single/task']
        for term in search_terms:
            print(f"\nSearching for: {term} ...")
            matches = [m.start() for m in re.finditer(re.escape(term), js)]
            print(f"Found {len(matches)} matches.")
            for idx, pos in enumerate(matches[:5]):
                print(f"Match {idx + 1} at position {pos}:")
                # print 300 characters before and after
                snippet = js[max(0, pos-200):min(len(js), pos+300)]
                print(snippet)
                print("-" * 50)
except Exception as e:
    print("Failed:", e)
