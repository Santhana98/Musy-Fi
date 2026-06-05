import urllib.request
import socket

domains = ['cobalt.directory', 'google.com', 'github.com', 'api.cobalt.tools']
for domain in domains:
    print(f"\nResolving {domain}...")
    try:
        ip = socket.gethostbyname(domain)
        print(f"IP: {ip}")
    except Exception as e:
        print(f"DNS Resolution failed: {e}")
