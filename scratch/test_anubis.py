import urllib.request
import urllib.parse
import ssl
import json

video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

endpoints = [
    "https://anubis.techaro.lol/",
    "https://anubis.techaro.lol/api/json"
]

for url in endpoints:
    print(f"\nTesting Cobalt endpoint: {url} ...")
    data = json.dumps({
        'url': video_url,
        'downloadMode': 'audio',
        'audioFormat': 'best'
    }).encode('utf-8')
    
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            res = response.read().decode('utf-8')
            print("Status:", response.status)
            print("Response:", res[:500])
    except Exception as e:
        print("Failed:", e)
