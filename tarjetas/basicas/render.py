import sys, os
from playwright.sync_api import sync_playwright
NAME = sys.argv[1]; BASE = os.path.dirname(os.path.abspath(__file__))
html = f"{BASE}/{NAME}.html"; pdf = f"{BASE}/salida/{NAME}.pdf"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page(); pg.goto(f"file://{html}")
    pg.pdf(path=pdf, prefer_css_page_size=True, print_background=True)
    b.close()
print("OK ->", pdf)
