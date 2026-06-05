import urllib.request
import urllib.parse
import ssl
import http.cookiejar

url = "https://under250art.ca/convert/"
video_url = "https://www.youtube.com/watch?v=tKZmHEyYlbA"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Enable cookie handling and HTTPS handler with SSL context
cj = http.cookiejar.CookieJar()
https_handler = urllib.request.HTTPSHandler(context=ctx)
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), https_handler)

# First request: Submit the form via POST
print("Step 1: Submitting form...")
data = urllib.parse.urlencode({'q': video_url}).encode('utf-8')
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/x-www-form-urlencoded'
}

req1 = urllib.request.Request(url, data=data, headers=headers)
try:
    with opener.open(req1) as r1:
        html1 = r1.read().decode('utf-8')
        print("Form submitted. Status:", r1.status)
        print("Cookies saved:", len(cj))
        for cookie in cj:
            print(f"Cookie: {cookie.name}={cookie.value}")
        
    # Second request: Fetch the ajax results via POST with empty body
    print("\nStep 2: Fetching ajax results...")
    req2 = urllib.request.Request(url, data=b"", headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    
    with opener.open(req2) as r2:
        res2 = r2.read().decode('utf-8')
        print("AJAX response status:", r2.status)
        print("AJAX response length:", len(res2))
        print("AJAX response snippet:")
        print(res2[:1500])
except Exception as e:
    print("Request failed:", e)
