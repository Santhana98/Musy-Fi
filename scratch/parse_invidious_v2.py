import re
import codecs

# Read UTF-16LE file
with codecs.open('scratch/invidious_html.txt', 'r', 'utf-16le') as f:
    html = f.read()

# Let's print the length of HTML
print("HTML length:", len(html))

# Find all links
urls = re.findall(r'href="(https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"', html)
print("Total URLs found:", len(urls))

# Unique domains
instances = set()
for u in urls:
    if not any(x in u for x in ['invidious.io', 'github', 'cloudflare', 'w3.org', 'google', 'twitter', 'torproject', 'onion']):
        instances.add(u)
        
print("Instances found:")
for inst in sorted(list(instances)):
    print(inst)
