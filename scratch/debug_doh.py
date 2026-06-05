import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for name in ["instances.cobalt.best", "loader.to", "api.loader.to", "y2mate.com", "api.vevioz.com"]:
    url = f"https://dns.google/resolve?name={name}&type=A"
    try:
        with urllib.request.urlopen(url, context=ctx) as r:
            data = json.loads(r.read().decode('utf-8'))
            print(f"\n--- {name} ---")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Failed for {name}: {e}")
