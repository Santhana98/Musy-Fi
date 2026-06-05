import re

with open('scratch/clickapi_referer_success.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for js files in script src or modulepreload
js_files = re.findall(r'src="([^"]+\.js)"', html)
modulepreloads = re.findall(r'href="([^"]+\.js)"', html)

all_js = set(js_files + modulepreloads)
print("Found JS files:")
for js in sorted(list(all_js)):
    print(js)
