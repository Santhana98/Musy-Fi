import re

with open('scratch/invidious_html_real.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("HTML length:", len(html))

# Invidious instances page table rows contain domains
# Let's search for all href links starting with https://
urls = re.findall(r'href="(https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"', html)
print("Total URLs found:", len(urls))

# Unique domains
instances = set()
for u in urls:
    if not any(x in u for x in ['invidious.io', 'github', 'cloudflare', 'w3.org', 'google', 'twitter', 'torproject', 'onion']):
        instances.add(u)
        
print("Parsed instances count:", len(instances))
print("Instances list:")
for inst in sorted(list(instances)):
    print(inst)
