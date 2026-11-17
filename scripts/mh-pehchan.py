#!/usr/bin/env python3
"""🗂️ 177 MH की पहचान-सूची → भैरव (web/pehchan-mh.json)
विक्रम जी (17-11-2026): MH का हर सामान (बारकोड, नाम, श्रेणी) भैरव में छिपा रहे — स्कैन करते ही पूरी डिटेल अपने-आप।
सिर्फ़ पहचान: नाम/छोटा नाम/हिंदी/कंपनी/साइज़/श्रेणी/इकाई/MRP/पैकेट/फोटो-लिंक।
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
json.dump({"version": 1, "source": "177 MH (रिपो 177-MH-: खेपें + migrate) — सिर्फ़ पहचान", "note": "स्टॉक/भाव/सप्लायर/गुप्त कोड नहीं",
           "items": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "सामान,", len(seen), "बारकोड →", os.path.relpath(OUT))
