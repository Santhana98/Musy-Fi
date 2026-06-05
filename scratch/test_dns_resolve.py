import socket

domains = [
    "y2mate.com",
    "y2mate.is",
    "y2mate.tools",
    "api.cdnframe.com",
    "api.vevioz.com",
    "loader.to",
    "api.loader.to",
    "cobalt.tools",
    "api.cobalt.tools",
    "anubis.techaro.lol",
    "clickapi.net",
    "instances.cobalt.best"
]

print("Resolving domains...")
for domain in domains:
    try:
        ip = socket.gethostbyname(domain)
        print(f"[OK] {domain} -> {ip}")
    except socket.gaierror:
        print(f"[FAILED] {domain} -> DNS lookup failed")
