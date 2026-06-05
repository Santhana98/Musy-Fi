import socket
import urllib.request
import json
import ssl

instances = [
    "https://api.cobalt.tools",
    "https://cobalt.api.ryz.cx",
    "https://cobalt.drgns.space",
    "https://cobalt.kavin.rocks",
    "https://cobalt.night-space.de",
    "https://cobalt.sweepy.dev",
    "https://cobalt.sh.alby.gay",
    "https://cobalt.moe.ms",
    "https://cobalt.esoteric.dev",
    "https://api.cobalt.black",
    "https://cobalt.prod.gq",
    "https://cobalt.saltyaom.com",
    "https://co.wuk.sh"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"
payload = json.dumps({
    "url": video_url,
    "downloadMode": "audio",
    "audioFormat": "best"
}).encode('utf-8')

print("Testing Cobalt instances...")
for inst in instances:
    # Get hostname
    domain = inst.replace("https://", "").replace("http://", "").split("/")[0]
    
    # 1. DNS check
    try:
        ip = socket.gethostbyname(domain)
        dns_status = f"DNS OK -> {ip}"
    except socket.gaierror:
        print(f"[FAILED] {inst} (DNS lookup failed)")
        continue
        
    # 2. HTTP POST test
    req = urllib.request.Request(
        inst, 
        data=payload, 
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            res_body = r.read().decode('utf-8')
            res_json = json.loads(res_body)
            print(f"[SUCCESS] {inst} | Status: {res_json.get('status')} | URL: {res_json.get('url')}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"[HTTP ERROR] {inst} | Code: {e.code} | Response: {err_body[:200]}")
    except Exception as e:
        print(f"[ERROR] {inst} | Message: {e}")
