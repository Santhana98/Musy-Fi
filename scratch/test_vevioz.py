import urllib.request
import ssl
import re

video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"
url = f"https://api.vevioz.com/apis/button/mp3?url={urllib.parse.quote(video_url)}"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html'
}

req = urllib.request.Request(url, headers=headers)
print(f"Fetching Vevioz API: {url}...")
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        html = r.read().decode('utf-8')
        print("Status:", r.status)
        print("Length:", len(html))
        
        # Check for download link or iframe
        with open('scratch/vevioz_response.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved to scratch/vevioz_response.html")
        
        # Find any links
        links = re.findall(r'href="([^"]+)"', html)
        print("Links found:", links[:10])
except Exception as e:
    print("Failed:", e)
