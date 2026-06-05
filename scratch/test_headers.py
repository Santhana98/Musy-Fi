import urllib.request
import urllib.parse
import ssl

url = "https://under250art.ca/convert/"
video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

data = urllib.parse.urlencode({'q': video_url}).encode('utf-8')
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/x-www-form-urlencoded'
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("Status:", r.status)
        print("Headers:")
        for k, v in r.headers.items():
            print(f"{k}: {v}")
except Exception as e:
    print(e)
