"""भैरव — 📒 स्टॉक बही + 📅 तारीख वाला हिसाब + 🤝 सौंपने की रिपोर्ट + 🩹 सुधार फाइल (डेमो)।
उपयोग: python3 tests/bahi.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8781), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block", device_scale_factor=2)).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8781/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;window.__a4=[];SE.printA4=async(t,h)=>{window.__a4.push([t,h])};0")
        A, B = await pg.evaluate("(()=>{const T=S.items.filter(i=>i.track&&i.active!==false&&!i.virtual&&!i.packOf);return [T[0].id,T[1].id]})()")
        q0 = await pg.evaluate(f"+(S.pstock['{A}']||{{}}).qty||0")
        # तीन दिन पहले की खरीद, कल की बिक्री, आज की गिनती — ts पीछे करके
        await pg.evaluate(f"""(async()=>{{await adjStock([['{A}',10]],'खरीद 1 · 177 MH कैंटीन');await adjStock([['{A}',-3]],'बिल BW-T1');await adjStock([['{A}',-1]],'गिनती 18-11-2026');
          const L=S.demoLog.filter(l=>l.itemId==='{A}');L[0].ts-=3*864e5;L[0].date=SBH.dayAdd(today(),-3);L[1].ts-=864e5;L[1].date=SBH.dayAdd(today(),-1)}})()""")
        await pg.evaluate(f"SBH.item('{A}')"); await pg.wait_for_timeout(400)
        t = await pg.inner_text("#bhBody")
        assert "+10" in t and "−3" not in t and "-3" in t and str(q0+6) in t, t[:500]
        assert f"{q0} → {q0+10}" in t and f"{q0+10} → {q0+7}" in t, t[:600]
        await pg.screenshot(path=f"{SHOTS}/b1-item.png")
        # 📅 कल का हिसाब: सुबह q0+10, −3, रात q0+7
        R = await pg.evaluate(f"SBH.calc(SBH.dayAdd(today(),-1),SBH.dayAdd(today(),-1)).then(R=>{{const r=R.find(x=>x.it.id==='{A}');return [r.start,r.inn,r.sale,r.fix,r.end]}})")
        assert R == [q0+10, 0, 3, 0, q0+7], R
        R = await pg.evaluate(f"SBH.calc(SBH.dayAdd(today(),-3),today()).then(R=>{{const r=R.find(x=>x.it.id==='{A}');return [r.start,r.inn,r.sale,r.fix,r.end]}})")
        assert R == [q0, 10, 3, -1, q0+6], R
        await pg.evaluate("closeSheet();SBH.range()"); await pg.wait_for_timeout(500)
        await pg.click("[data-bhq]:nth-child(3)"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{SHOTS}/b2-range.png")
        await pg.click("[data-bha4]"); await pg.click("[data-bhhand]"); await pg.wait_for_timeout(300)
        a4 = await pg.evaluate("window.__a4.map(x=>JSON.stringify(x).slice(0,80))")
        assert len(a4) == 2 and "सौंपने" in a4[1], a4
        h = await pg.evaluate("window.__a4[1][1]"); assert "गिनकर" in h and "लेने वाला" in h
        open(f"{SHOTS}/b3-handover.html", "w").write("<meta charset=utf-8><style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px}</style>" + h)
        # 🩹 सुधार फाइल: set + merge + stock + pur
        await pg.evaluate("S.purchases=[{id:'pX',date:today(),supName:'177 MH कैंटीन',total:240,gross:240,lines:[{id:'%s',name:'X',qty:384,rate:0.63,amt:240,unit:'pc'}]}]" % B)
        qa, qb = await pg.evaluate(f"[+(S.pstock['{A}']||{{}}).qty||0,+(S.pstock['{B}']||{{}}).qty||0]")
        F = {"app": "bhairav-fix", "v": 1, "id": "F-TEST-01", "note": "जाँच", "ops": [
            {"op": "set", "id": A, "set": {"hi": "नया हिंदी नाम", "sale": 99, "cat": "general", "sub": ""}, "why": "नाम ठीक"},
            {"op": "merge", "keep": A, "drop": B, "why": "दोहरा"},
            {"op": "pur", "pid": "pX", "item": A, "qty": 12, "rate": 20, "why": "डिब्बा दब गया"},
            {"op": "stock", "id": "nahi-hai", "to": 0}]}
        await pg.evaluate("SFI.preview(%s)" % json.dumps(json.dumps(F, ensure_ascii=False))); await pg.wait_for_timeout(500)
        t = await pg.inner_text("#sheet"); assert "पहले → बाद" in t or "→" in t; assert "सामान नहीं मिला" in t, t[:300]
        await pg.screenshot(path=f"{SHOTS}/b4-fix.png")
        # pur लाइन B की थी नहीं — A वाली नहीं मिली = ⚠; फिर भी बाकी चलें
        await pg.click("[data-fxgo]"); await pg.wait_for_timeout(800)
        t = await pg.inner_text("#sheet"); assert "सुधार हो गए" in t, t
        r = await pg.evaluate(f"[item('{A}').hi,item('{A}').sale,item('{A}').cat,item('{B}').active,item('{B}').mergedInto,+(S.pstock['{A}']||{{}}).qty||0,+(S.pstock['{B}']||{{}}).qty||0]")
        assert r[:5] == ["नया हिंदी नाम", 99, "general", False, A] and r[5] == qa + qb and r[6] == 0, (r, qa, qb)
        # दोबारा नहीं चढ़ती
        await pg.evaluate("SFI.preview(%s)" % json.dumps(json.dumps(F, ensure_ascii=False))); await pg.wait_for_timeout(300)
        assert await pg.evaluate("S.settings.fixFiles.includes('F-TEST-01')")
        # pur सुधार अलग: B की लाइन
        F2 = {"app": "bhairav-fix", "id": "F-TEST-02", "ops": [{"op": "pur", "pid": "pX", "item": B, "qty": 12, "rate": 20}]}
        await pg.evaluate("SFX.preview(%s)" % json.dumps(F2)); await pg.wait_for_timeout(300); await pg.click("[data-fxgo]"); await pg.wait_for_timeout(500)
        L = await pg.evaluate("S.purchases[0].lines[0]"); assert L["qty"] == 12 and L["rate"] == 20 and L["fix"]["qty"] == 384, L
        # मेन्यू में 📒
        await pg.evaluate("S.tab='stock';showTab()"); await pg.wait_for_timeout(400)
        assert await pg.locator("#p-stock [data-bhopen]").count() == 1
        await br.close()
    bad = [e for e in errs if "TUNNEL" not in e]
    assert not bad, bad
    print("✅ स्टॉक-बही/सुधार टेस्ट पास")
asyncio.run(main())
