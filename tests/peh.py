"""भैरव कैंटीन — 🗂️ 177 MH की पहचान-सूची (pehchan-mh.json): अनजान बारकोड स्कैन → नाम, हिंदी, MRP, श्रेणी, फोटो अपने-आप
उपयोग: python3 tests/peh.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8791), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
PM = json.load(open(os.path.join(WWW, "pehchan-mh.json"), encoding="utf8"))["items"]
errs = []
BAN = {"cost", "sale", "oldSale", "rack", "xloc", "open", "supplier", "mfr", "secret", "code"}


async def main():
    assert len(PM) > 200, len(PM)
    assert not [x for x in PM if BAN & set(x)], "pehchan-mh.json में भाव/रैक/गुप्त कोड नहीं होने चाहिए"
    # ऐसा सामान चुनो जो मसाले वाला हो (किराना › राशन) और एक स्टेशनरी (जनरल)
    ms = next(x for x in PM if x.get("sub") == "masala" and x.get("mrp") and x.get("hi"))
    st = next(x for x in PM if x.get("cat") == "stationery" and x.get("mrp"))
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8791/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore();S.uid='own';S.staff='विक्रम जी'")

        # 1) मसाला — नाम, हिंदी, MRP, श्रेणी अपने-आप; सेव पर MH की cat/sub, फोटो-लिंक, छोटा नाम
        code = ms["barcodes"][0]["code"]
        await pg.evaluate(f"unknownCode('{code}')"); await pg.wait_for_timeout(900)
        v = await pg.evaluate("[document.getElementById('nbName').value,document.getElementById('nbHi').value,document.getElementById('nbMrp').value,document.getElementById('nbSub').value,document.getElementById('sheet').innerText]")
        assert v[0] == (ms.get("short") or ms["bill"]).upper(), v[0]
        assert v[1] == ms["hi"] and float(v[2]) == float(ms["mrp"]) and v[3] == "rashan", v[:4]
        assert "177 MH की पहचान सूची" in v[4] and "श्रेणी" in v[4], v[4][:300]
        await pg.screenshot(path=os.path.join(SHOTS, "peh-masala.png"))
        await pg.click("[data-nbsave]"); await pg.wait_for_timeout(700)
        it = await pg.evaluate(f"Object.values(window.__MOCK__.items||{{}}).find(i=>String(i.barcode)==='{code}')")
        assert it and it["cat"] == "kirana" and it["sub"] == "masala" and it["peh"] == "mh177", it
        assert it.get("phUrl", "").startswith("https://177mhwcanteen-cyber.github.io/177-MH-/p/") == bool(ms.get("phUrl")), it
        assert "cost" not in it or not it["cost"], it
        src = await pg.evaluate(f"SE.photoSrc(S.items.find(i=>String(i.barcode)==='{code}'))")
        assert src == (ms.get("phUrl") or src), src

        # 2) स्टेशनरी — भैरव में "जनरल सामान" में दिखे
        code2 = st["barcodes"][0]["code"]
        await pg.evaluate(f"closeSheet();unknownCode('{code2}')"); await pg.wait_for_timeout(700)
        assert "जनरल" in await pg.evaluate("document.getElementById('sheet').innerText")
        await pg.click("[data-nbsave]"); await pg.wait_for_timeout(700)
        c2 = await pg.evaluate(f"(()=>{{const i=S.items.find(i=>String(i.barcode)==='{code2}');return [i.cat,mcat(i)]}})()")
        assert c2 == [st["cat"], "general"], c2

        # 3) बारकोड का 0 आगे/पीछे (12/13 अंक) भी पहचाने
        c13 = next((x["barcodes"][0]["code"] for x in PM if len(x["barcodes"][0]["code"]) == 13 and x["barcodes"][0]["code"].startswith("0")), None)
        if c13:
            assert await pg.evaluate(f"pehchan().then(m=>!!m.get('{c13[1:]}'))")
        # 4) अनजान (किसी सूची में नहीं) → कुछ नहीं भरता, गलती नहीं
        await pg.evaluate("closeSheet();unknownCode('8999999999994')"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("document.getElementById('nbName').value") == ""
        await br.close()
    assert not errs, errs
    print("✅ पूरा टेस्ट पास (177 MH की पहचान-सूची)")

asyncio.run(main())
