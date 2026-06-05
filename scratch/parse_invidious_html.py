import urllib.request
import ssl
import re
import socket
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://api.invidious.io/instances'
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
        html = r.read().decode('utf-8')
        
    # Find all table links that look like https://...
    # Typically invidious instance links look like <a href="https://invidious.example.com">...
    urls = re.findall(r'href="(https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"', html)
    
    # Unique domains, exclude generic ones
    instances = set()
    for u in urls:
        if not any(x in u for x in ['invidious.io', 'github', 'cloudflare', 'w3.org', 'google', 'twitter', 'torproject', 'onion']):
            instances.add(u)
            
    print(f"Parsed {len(instances)} potential Invidious instances:")
    for inst in sorted(list(instances)):
        print("-", inst)
        
    # Let's test them to find a working one!
    video_id = 'tKZmHEyYlbA'
    for inst in sorted(list(instances))[:15]:
        print(f"\nTesting {inst}...")
        api_url = f"{inst}/api/v1/videos/{video_id}"
        test_req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(test_req, context=ctx, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                title = data.get('title')
                formats = data.get('adaptiveFormats', [])
                audio_formats = [f for f in formats if f.get('mimeType', '').startswith('audio/')]
                print(f"[OK] {inst} | Title: {title} | Audio formats: {len(audio_formats)}")
                if audio_formats:
                    best = audio_formats[0]
                    # Print download test
                    download_url = best.get('url')
                    if download_url.startswith('/'):
                        download_url = f"{inst}{download_url}"
                    elif 'googlevideo.com' in download_url:
                        # try proxied url
                        url_obj = urllib.parse.urlparse(download_url)
                        download_url = f"{inst}{url_obj.path}?{url_obj.query}&local=true"
                    else:
                        download_url += ("&" if "?" in download_url else "?") + "local=true"
                    
                    print(f"  Proxied URL: {download_url[:100]}...")
                    # test download of 100 bytes
                    dl_req = urllib.request.Request(download_url, headers={'Range': 'bytes=0-100'})
                    with urllib.request.urlopen(dl_req, context=ctx, timeout=5) as dl_resp:
                        print(f"  Download test: Status {dl_resp.status}, Content-Type: {dl_resp.headers.get('Content-Type')}")
                        if dl_resp.status in [200, 206]:
                            print(f"🌟 FOUND WORKING INSTANCE: {inst}")
                            break
        except Exception as e:
            print(f"[FAILED] {inst}: {e}")
            
except Exception as e:
    print("Failed:", e)
