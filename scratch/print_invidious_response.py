import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://api.invidious.io/'
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
        print("Status:", r.status)
        print("Headers:", r.headers)
        body = r.read().decode('utf-8')
        print("Body snippet:")
        print(body[:500])
except Exception as e:
    print("Error:", e)
