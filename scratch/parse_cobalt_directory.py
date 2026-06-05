import urllib.request
import re

url = 'https://cobalt.directory/'
print("Fetching cobalt directory...")
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8')
        print("Fetched successfully. Length:", len(html))
        
        # Look for domain names or URLs in the HTML (like https://...)
        urls = re.findall(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', html)
        print("Total URLs found:", len(urls))
        
        # Unique domains
        domains = set()
        for u in urls:
            # exclude cobalt.directory, google, github, cloudflare, etc.
            if not any(x in u for x in ['cobalt.directory', 'google', 'github', 'cloudflare', 'w3.org', 'vercel', 'twitter', 'discord']):
                domains.add(u)
                
        print("\nPossible Cobalt instances:")
        for d in sorted(list(domains))[:20]:
            print(d)
except Exception as e:
    print("Fetch failed:", e)
