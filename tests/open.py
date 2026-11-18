"""भैरव — 📒 ओपनिंग + 📅 तारीख वाला हिसाब + 🤝 सौंपने की रिपोर्ट + 🩹 सुधार फाइल (डेमो)।
उपयोग: python3 tests/bahi.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8788), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block", device_scale_factor=2)).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8788/index.html"); await pg.wait_for_timeout(1500)
        # नकली कैमरा: चालू है, बंद होने पर गिनो
        await pg.evaluate("S.isOwner=true;window.__off=0;SE.cam.on=true;SE.cam.stop=async()=>{window.__off++;SE.cam.on=false};camUi(true);0")
        A = await pg.evaluate("(()=>{const it=S.items.find(i=>i.track&&i.active!==false&&!i.virtual&&!i.packOf&&String(i.barcode||'').split(',')[0]);return [it.id,String(it.barcode).split(',')[0],+it.sale]})()")
        await pg.evaluate("SO.start()"); await pg.wait_for_timeout(500)
        await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(200)  # कहीं और गए
        await pg.evaluate("SE.cam.on=true;window.__off=0;0")
        for _ in range(3):
            await pg.evaluate(f"handleScan('{A[1]}')"); await pg.wait_for_timeout(250)
        assert await pg.evaluate("window.__off") == 0, "ओपनिंग में स्कैन पर कैमरा बंद हुआ"
        assert await pg.evaluate("S.tab") == "stock"
        assert await pg.evaluate("document.activeElement&&document.activeElement.id") != "soQ", "कैमरा चालू में कीबोर्ड खुला"
        v = await pg.input_value("#soQ");         assert v == "3", v
        assert v == "3", v
        await pg.screenshot(path=f"{SHOTS}/o0-scan.png")
        await pg.fill("#soS", str(A[2] + 7)); await pg.dispatch_event("#soS", "change")
        await pg.click("[data-so=next]"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{SHOTS}/o1-card.png")
        # 🔍 नाम से खोज: बिना बारकोड वाला सामान
        B = await pg.evaluate("(()=>{const it=S.items.find(i=>i.track&&i.active!==false&&!i.virtual&&!i.packOf&&i.id!=='%s');return [it.id,(it.short||it.name).split(' ')[0]]})()" % A[0])
        await pg.fill("#soF", B[1]); await pg.wait_for_timeout(200)
        assert await pg.locator("#soFR [data-sopick]").count() >= 1
        await pg.screenshot(path=f"{SHOTS}/o2-search.png")
        await pg.click(f'#soFR [data-sopick="{B[0]}"]'); await pg.wait_for_timeout(300)
        assert await pg.input_value("#soQ") == "1"
        # लिखी गिनती पर बाहर से रेंडर आए तो खोए नहीं
        await pg.fill("#soQ", "7"); await pg.evaluate("document.activeElement.blur();SO.soft()"); await pg.wait_for_timeout(100)
        assert await pg.input_value("#soQ") == "7", "लिखी गिनती खो गई"
        await pg.evaluate("SO.soft&&SO.soft()")
        await pg.evaluate("SO.render&&0"); await pg.click("[data-so=finish]"); await pg.wait_for_timeout(300)
        t = await pg.inner_text("#sheet"); assert "पक्का करने से पहले जाँचें" in t
        await pg.screenshot(path=f"{SHOTS}/o3-verify.png")
        await pg.click("[data-solm=zero]"); await pg.click("[data-soapply]"); await pg.wait_for_timeout(800)
        r = await pg.evaluate(f"[item('{A[0]}').sale,+(S.pstock['{A[0]}']||{{}}).qty,+(S.pstock['{B[0]}']||{{}}).qty]")
        assert r == [A[2] + 7, 3, 7], r
        await br.close()
    bad = [e for e in errs if "TUNNEL" not in e]
    assert not bad, bad
    print("✅ ओपनिंग टेस्ट पास (कैमरा टिका रहा, भाव बदला)")
asyncio.run(main())
