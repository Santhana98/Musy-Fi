import urllib.request
import urllib.parse
import ssl
import re

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
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode('utf-8')
        with open('scratch/under250art_response.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Wrote response to scratch/under250art_response.html")
        
        # Parse all forms
        forms = re.findall(r'<form[\s\S]*?</form>', html)
        print(f"Found {len(forms)} forms.")
        for idx, form in enumerate(forms):
            print(f"\nForm {idx + 1}:")
            print(form[:500])
            
        # Parse download buttons or links
        links = re.findall(r'<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', html)
        print(f"\nFound {len(links)} links.")
        for link, text in links[:20]:
            if "convert" in link or "download" in link or "mp3" in link or "api" in link:
                print(f"Link: {link} | Text: {text.strip()}")
except Exception as e:
    print(e)
