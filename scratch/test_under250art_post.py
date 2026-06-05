import urllib.request
import urllib.parse
import ssl
import json

url = "https://under250art.ca/convert/"
video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"

# Ignore SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Try sending a POST request with the 'q' parameter or similar
# Let's check how the form submit is structured. Usually Y2mate forms have an input named 'q' or 'url'
# Let's send q=video_url
data = urllib.parse.urlencode({'q': video_url}).encode('utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded'
}

req = urllib.request.Request(url, data=data, headers=headers)
print("Sending POST request to under250art.ca/convert/ ...")
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        html = response.read().decode('utf-8')
        print("Response status:", response.status)
        print("Response length:", len(html))
        print("Response snippet (first 1000 chars):")
        print(html[:1000])
        
        # Check if response contains any json or API url
        # If it is HTML, we can search for action buttons or downloads
        if "action" in html or "download" in html or "mp3" in html:
            print("\nFound download links or buttons in HTML!")
except Exception as e:
    print("Request failed:", e)
