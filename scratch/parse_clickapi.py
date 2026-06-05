import re

with open('scratch/clickapi_referer_success.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.finditer(r'<script([^>]*)>([\s\S]*?)</script>', html)
for idx, m in enumerate(scripts):
    attrs = m.group(1)
    body = m.group(2)
    print(f"\n================ Script {idx + 1} ================")
    print("Attributes:", attrs)
    print("Body Length:", len(body))
    print("Body snippet:")
    print(body[:1000])
    if len(body) > 1000:
        print("... (truncated)")
