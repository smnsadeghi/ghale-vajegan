import http.server
import socketserver
import threading
import os
import json
from playwright.sync_api import sync_playwright

PORT = 8094
DIRECTORY = r"C:\Users\acer\管控\..\.gemini\antigravity\scratch\ghale-vajegan"
# Normalize path:
DIRECTORY = r"C:\Users\acer\.gemini\antigravity\scratch\ghale-vajegan"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    httpd = socketserver.TCPServer(("", PORT), QuietHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def main():
    httpd = start_server()
    print(f"Server started at http://localhost:{PORT}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        page.goto(f"http://localhost:{PORT}/index.html")
        page.wait_for_load_state("networkidle")
        print("Page loaded.")

        # Check globals in page
        res = page.evaluate("""() => {
            return {
                hasScorchedCity: typeof ScorchedCity !== 'undefined',
                hasStartBattle: typeof startScorchedCityBattle !== 'undefined',
                bossCount: typeof ScorchedCity !== 'undefined' ? ScorchedCity.getAllCanonicalBosses().length : 0
            };
        }""")
        print("Page evaluation:", res)
        browser.close()

if __name__ == "__main__":
    main()
