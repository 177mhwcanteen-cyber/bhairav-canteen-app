"""भैरव — 🆕 नई शुरुआत → स्कैन → 177 MH का नाम/भाव/फोटो अपने-आप, सिर्फ़ गिनती (डेमो)।
उपयोग: python3 tests/fresh.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8791), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
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
        await pg.goto("http://127.0.0.1:8791/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;SX&&(SX.shareBlob=async()=>{});0")
        n0 = await pg.evaluate("S.items.filter(i=>i.active!==false).length")
        r = await pg.evaluate("SFI.reset({stock:true,hide:true,menu:false}).then(()=>[S.items.filter(i=>i.active!==false&&!['fast','sabzi'].includes(mcat(i))).length,Object.values(S.pstock).filter(x=>x.qty).length,S.items.filter(i=>i.hiddenBy).length])")
        assert r[0] == 0 and r[1] == 0 and r[2] > 0, r
        await pg.screenshot(path=f"{SHOTS}/f0-reset.png")
        # पुराना ग़लत नाम वाला सामान (छिपा) — MH का बारकोड
        await pg.evaluate("S.items.push({id:'oldx',name:'GALAT NAAM MASALA',cat:'kirana',sub:'masala',sale:70,mrp:60,barcode:'8901786120505',track:true,active:false,hiddenBy:'r1',code:'1999'});0")
        await pg.evaluate("SO.start()"); await pg.wait_for_timeout(400)
        for _ in range(3):
            await pg.evaluate("handleScan('8901786140503')"); await pg.wait_for_timeout(300)
        it = await pg.evaluate("(()=>{const i=S.items.find(i=>String(i.barcode)==='8901786140503');return i&&{n:i.name,s:i.sale,m:i.mrp,a:i.active,p:i.phUrl||'',peh:i.peh,c:i.code}})()")
        assert it and it["n"] == "EVEREST SHAHI BIRYANI MASALA 50G" and it["s"] == 90 and it["a"] and it["peh"] == "mh177" and "177-MH-" in it["p"], it
        assert await pg.evaluate("S.items.filter(i=>String(i.barcode)==='8901786140503').length") == 1, "दोहरा सामान बना"
        assert await pg.input_value("#soQ") == "3"
        assert not await pg.query_selector("#sheet .sheet"), "शीट खुली — सिर्फ़ गिनती चाहिए थी"
        await pg.screenshot(path=f"{SHOTS}/f1-scan-new.png")
        await pg.evaluate("handleScan('8901786120505')"); await pg.wait_for_timeout(300)
        o = await pg.evaluate("(()=>{const i=item('oldx');return {n:i.name,s:i.sale,a:i.active,h:i.hiddenBy,c:i.code}})()")
        assert o == {"n": "EVEREST KITCHEN KING MASALA 50G", "s": 53, "a": True, "h": "", "c": "1999"}, o
        assert await pg.input_value("#soQ") == "1"
        await pg.screenshot(path=f"{SHOTS}/f2-scan-revive.png")
        # MH में नहीं = पुरानी शीट
        await pg.evaluate("handleScan('8900000000017')"); await pg.wait_for_timeout(300)
        assert "यह बारकोड लिस्ट में नहीं" in await pg.inner_text("#sheet")
        await pg.evaluate("closeSheet()")
        await pg.click("[data-so=finish]"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{SHOTS}/f3-verify.png")
        if await pg.query_selector("[data-solm=zero]"): await pg.click("[data-solm=zero]")
        await pg.click("[data-soapply]"); await pg.wait_for_timeout(800)
        q = await pg.evaluate("[+(S.pstock[S.items.find(i=>String(i.barcode)==='8901786140503').id]||{}).qty,+(S.pstock.oldx||{}).qty]")
        assert q == [3, 1], q
        # बिलिंग में भी: MH सामान स्कैन = सीधा बिल में
        await pg.evaluate("S.tab='bill';showTab();handleScan('8906030063461')"); await pg.wait_for_timeout(400)
        assert await pg.evaluate("S.cart.some(l=>item(l.id)&&item(l.id).name.startsWith('FRUTIN'))"), "बिल में नहीं आया"
        await pg.screenshot(path=f"{SHOTS}/f4-bill.png")
        await br.close()
    bad = [e for e in errs if "TUNNEL" not in e]
    assert not bad, bad
    print("✅ नई शुरुआत + MH स्कैन टेस्ट पास")
asyncio.run(main())
