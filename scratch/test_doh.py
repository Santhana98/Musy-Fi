import urllib.request
import urllib.parse
import json
import ssl

domain = "api.loader.to"
video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

print("1. Resolving api.loader.to via Google DoH...")
doh_url = f"https://dns.google/resolve?name={domain}&type=A"
try:
    with urllib.request.urlopen(doh_url, context=ctx) as r:
        doh_data = json.loads(r.read().decode('utf-8'))
        ips = [ans['data'] for ans in doh_data.get('Answer', []) if ans.get('type') == 1]
        print("Real IPs:", ips)
        if not ips:
            print("No IPs found in DoH answer.")
            exit(1)
        real_ip = ips[0]
except Exception as e:
    print("DoH resolution failed:", e)
    exit(1)

# Now fetch the AJAX endpoint using the real IP and Host header
ajax_url = f"https://{real_ip}/api/ajax?url={urllib.parse.quote(video_url)}&format=mp3"
print(f"\n2. Fetching Loader.to AJAX API: {ajax_url}...")
req = urllib.request.Request(ajax_url, headers={
    'Host': domain,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        res_data = json.loads(r.read().decode('utf-8'))
        print("Status:", r.status)
        print("Response Data:", res_data)
except Exception as e:
    print("Fetch failed:", e)
