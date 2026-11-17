#!/usr/bin/env python3
"""🗂️ 177 MH की पहचान-सूची → भैरव (web/pehchan-mh.json)
विक्रम जी (17-11-2026): MH का हर सामान (बारकोड, नाम, श्रेणी) भैरव में छिपा रहे — स्कैन करते ही पूरी डिटेल अपने-आप।
सिर्फ़ पहचान: नाम/छोटा नाम/हिंदी/कंपनी/साइज़/श्रेणी/इकाई/MRP/पैकेट/फोटो + MH का बिक्री भाव "rate" (विक्रम जी 17-11: "रेट वगैरह सारा डाल दो")।
कभी नहीं: MH का खरीद भाव (cost), बिक्री भाव (sale), रैक, स्टॉक, सप्लायर, बैच, गुप्त कोड (secret), 4 अंक कोड।
उपयोग: python3 scripts/mh-pehchan.py <177-MH- रिपो का रास्ता>
"""
import json, glob, os, re, sys
MH = sys.argv[1] if len(sys.argv) > 1 else "../177-MH-"
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "pehchan-mh.json")
PAGES = "https://177mhwcanteen-cyber.github.io/177-MH-/p/"
KEEP = ["short", "hi", "brand", "size", "cat", "sub", "unit", "alias", "emoji"]
def codes(v):
    return [c for c in re.split(r"[,\s]+", str(v or "")) if re.fullmatch(r"\d{6,14}", c)]
src = []
mg = os.path.join(MH, "web", "migrate.json")
if os.path.exists(mg):
    m = json.load(open(mg, encoding="utf-8"))
    for k, x in (m.get("items") or {}).items(): src.append((k, x))
for f in sorted(glob.glob(os.path.join(MH, "web", "data", "items", "S-*.json"))):
    j = json.load(open(f, encoding="utf-8"))
    if j.get("org", "mh177") != "mh177": continue
    for x in j.get("items", []): src.append((x.get("id"), x))
out, seen = [], set()
for iid, x in src:
    cs = [c for c in codes(x.get("barcode")) if c not in seen]
    if not cs or not x.get("name"): continue
    seen.update(cs)
    e = {"barcodes": [{"code": c} for c in cs], "bill": str(x["name"]).upper(), "mh": 1}
    for k in KEEP:
        if x.get(k): e[k] = x[k]
    if x.get("short"): e["short"] = str(x["short"]).upper()
    if x.get("brand"): e["brand"] = str(x["brand"]).upper()
    if +(x.get("mrp") or 0) > 0: e["mrp"] = x["mrp"]
    for k in ("perPack", "packMrp", "ctn"):
        if +(x.get(k) or 0) > 0: e[k] = x[k]
    if x.get("ph") and iid and os.path.exists(os.path.join(MH, "web", "p", f"{iid}.jpg")):
        e["phUrl"] = f"{PAGES}{iid}.jpg?v={x['ph']}"
    out.append(e)
# 🌐 MH ऐप की ताज़ा सूची (pub/pk_* — मालिक के फोन से छपती है; GitHub मशीन से पढ़ी जाती है, यहाँ से न मिले तो रिपो वाली ही)
import base64, urllib.request
FS = "https://firestore.googleapis.com/v1/projects/mh177-canteen/databases/(default)/documents/pub/"
KEY = "AIzaSyBhvxZD72IquK2VFda9IbtWuDd5kh4EpPY"  # MH का सार्वजनिक web key (config.js में भी)
def fv(v):
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return v["doubleValue"]
    if "booleanValue" in v: return v["booleanValue"]
    if "mapValue" in v: return {k: fv(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v: return [fv(x) for x in v["arrayValue"].get("values", [])]
    return None
def doc(d):
    with urllib.request.urlopen(f"{FS}{d}?key={KEY}", timeout=30) as r:
        return {k: fv(x) for k, x in json.load(r).get("fields", {}).items()}
live, thumbs = [], {}
try:
    n = int(doc("pkx").get("n", 0))
    for k in range(n): live += doc(f"pk_{k}").get("items", [])
    try:
        for k in range(int(doc("phx").get("n", 0))): thumbs.update(doc(f"ph_{k}").get("m", {}))
    except Exception as e: print("फोटो-थंब नहीं मिले:", e)
    print("🌐 MH ऐप की ताज़ा सूची:", len(live), "सामान,", len(thumbs), "थंब")
except Exception as e:
    print("🌐 MH ऐप की सूची नहीं मिली (रिपो वाली ही):", str(e)[:120])
PMD = os.path.join(os.path.dirname(OUT), "pm")
by = {b["code"]: e for e in out for b in e["barcodes"]}
for x in live:
    if x.get("sb") == "tob" or not x.get("n"): continue
    cs = codes(x.get("b"))
    if not cs: continue
    e = next((by[c] for c in cs if c in by), None)
    if not e:
        e = {"barcodes": [], "bill": str(x["n"]).upper(), "mh": 1}; out.append(e)
    for c in cs:
        if c not in by: e["barcodes"].append({"code": c}); by[c] = e
    e["bill"] = str(x["n"]).upper()
    for j, k in (("sh", "short"), ("hi", "hi"), ("br", "brand"), ("sz", "size"), ("c", "cat"), ("sb", "sub"), ("u", "unit"), ("em", "emoji")):
        if x.get(j): e[k] = str(x[j]).upper() if k in ("short", "brand") else x[j]
    for j, k in (("m", "mrp"), ("s", "rate"), ("pp", "perPack"), ("pm", "packMrp"), ("ct", "ctn")):
        if x.get(j): e[k] = x[j]
    if str(x.get("p", "")).startswith("https://177mhwcanteen-cyber.github.io/"): e["phUrl"] = x["p"]
    t = thumbs.get(x.get("id"))
    if t and t.startswith("data:image/jpeg;base64,") and not e.get("phUrl"):
        b = base64.b64decode(t.split(",", 1)[1])
        if len(b) <= 20 * 1024:
            os.makedirs(PMD, exist_ok=True); fn = re.sub(r"[^A-Za-z0-9_-]", "", x["id"]) + ".jpg"
            open(os.path.join(PMD, fn), "wb").write(b); e["phUrl"] = "pm/" + fn
json.dump({"version": 1, "source": "177 MH (रिपो 177-MH-: खेपें + migrate) — सिर्फ़ पहचान", "note": "rate = MH का बिक्री भाव (विक्रम जी 17-11 की मंज़ूरी); खरीद भाव/स्टॉक/सप्लायर/गुप्त कोड नहीं",
           "items": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "सामान,", len(seen), "बारकोड →", os.path.relpath(OUT))
