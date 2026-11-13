"""भैरव: ऑनलाइन दुकान/होम डिलीवरी बंद (config.js online:false, विक्रम जी 13-11-2026) — जाँच कि कहीं से चालू न हो।
उपयोग: python3 tests/online.py www <shots>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright
WWW = os.path.abspath(sys.argv[1])
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8788), functools.partial(H, directory=WWW))
threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 400, "height": 860})
        await pg.goto("http://127.0.0.1:8788/index.html"); await pg.wait_for_timeout(1500)
        assert await pg.evaluate("SE_CONFIG.online===false && SON.off===true")
        await pg.evaluate("S.isOwner=true;S.tab='set';showTab()"); await pg.wait_for_timeout(500)
        assert await pg.locator("#sonSet").count() == 0, "ऑनलाइन दुकान का कार्ड नहीं दिखना चाहिए"
        assert await pg.evaluate("SON.list().length") == 0
        assert await pg.evaluate("(async()=>{await SX.pubRates(true);SX.watchOrders();return !SX._oUn})()")
        for u in ("order/", "o.html"):
            await pg.goto("http://127.0.0.1:8788/" + u); t = await pg.inner_text("body")
            assert "काउंटर" in t and "ADD" not in t, u
        await b.close()
    print("✅ ऑनलाइन-बंद टेस्ट पास")
asyncio.run(main())
