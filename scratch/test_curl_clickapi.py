import urllib.request
import ssl

url = "https://clickapi.net/api/widgetplus?url=https://www.youtube.com/watch?v=tKZmHEyYlbA"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://under250art.ca/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as r:
        html = r.read().decode('utf-8')
        print("Status Code:", r.status)
        print("Length:", len(html))
        # Write to file
        with open('scratch/clickapi_referer_success.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Wrote response to scratch/clickapi_referer_success.html")
except urllib.error.HTTPError as e:
    print("Code:", e.code)
    print("Headers:", e.headers)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print(e)
