/* 🩹 SFX — सुधार फाइल (सिर्फ़ मालिक) · विक्रम जी 18-11-2026
   Claude गलतियों की सूची फाइल में देता है → ऐप हर सुधार "पहले → बाद" दिखाता है → विक्रम जी जो ✓ रखें, सिर्फ़ वही बदलता है।
   कुछ भी मिटता नहीं: दोहरा सामान छिपता है (active:false, mergedInto) और उसका स्टॉक/बारकोड असली सामान में जाता है;
   खरीद की लाइन बदले तो पुरानी कीमत/गिनती उसी लाइन में fix:{…} में रहती है; हर फाइल imports/{id} में दर्ज, दोबारा नहीं चढ़ती।
   फाइल: {"app":"bhairav-fix","v":1,"id":"F-20261118-01","note":"…","ops":[
     {"op":"set","id":"bmwks84kd","set":{"name":"…","hi":"…","cat":"general","sub":"","sale":0,"mrp":0,"cost":0},"why":"…"},
     {"op":"merge","keep":"bmwluomso","drop":"k1001","why":"एक ही सामान दो बार"},
     {"op":"stock","id":"k1009","to":0,"why":"एक्सपायर — दुकान से हटाया"},
     {"op":"pur","pid":"pmwluxwpk62ji","item":"bmwlps8kg","qty":12,"rate":20,"why":"384 गलती से (डिब्बा दब गया)"} ]} */
(function(){
"use strict";
const SFX=window.SFX={};
const r2=v=>Math.round((+v||0)*1000)/1000;
const qOf=id=>+(S.pstock[id]&&S.pstock[id].qty)||0;
const KEYN={name:"नाम",short:"छोटा नाम",hi:"हिंदी नाम",brand:"कंपनी",cat:"श्रेणी",sub:"हिस्सा",sale:"बिक्री ₹",mrp:"MRP ₹",cost:"खरीद ₹",size:"साइज़",unit:"इकाई",secret:"गुप्त कोड",perPack:"पैकेट में",exp:"एक्सपायरी",active:"चालू",barcode:"बारकोड",alias:"खोज-शब्द",track:"स्टॉक गिनो"};
const OK_KEYS=Object.keys(KEYN);
const nm=it=>it?(typeof shortNm==="function"?shortNm(it):it.name):"?";
const show=v=>v===""||v==null?"—":v===true?"हाँ":v===false?"नहीं":String(v);
const showK=(k,v)=>{try{if(k==="cat"&&v){const c=(typeof CATS!=="undefined"?CATS:[]).find(x=>x[0]===v);if(c)return c[1]}
  if(k==="sub"&&v){for(const L of Object.values(typeof SUBS!=="undefined"?SUBS:{})){const x=L.find(y=>y[0]===v);if(x)return x[1]}}}catch(e){}return show(v)};
let D=null,PUR={};
async function upd(id,p){if(S.demo){Object.assign(item(id)||{},p);return}await S.db.doc("items/"+id).set(p,{merge:true})}
/* एक सुधार का "पहले → बाद" */
function rowOf(o,i){const bad=t=>({i,ok:false,html:`<div class="fx-r bad"><b>${i+1}.</b> ⚠ ${t}</div>`});
  if(o.op==="set"){const it=item(o.id);if(!it)return bad("सामान नहीं मिला: "+esc(o.id));
    const ch=Object.entries(o.set||{}).filter(([k,v])=>OK_KEYS.includes(k)&&String(it[k]??"")!==String(v??""));
    if(!ch.length)return {i,ok:false,skip:true,html:`<div class="fx-r same"><b>${i+1}.</b> ✓ ${esc(nm(it))} — पहले से ठीक</div>`};
    return {i,ok:true,html:`<label class="fx-r"><input type="checkbox" data-fx="${i}" checked><div><b>${i+1}. ${esc(nm(it))}</b> <small>#${esc(it.code||"")}</small>${o.why?`<br><small class="note">${esc(o.why)}</small>`:""}
      ${ch.map(([k,v])=>`<div class="fx-c">${KEYN[k]}: <s>${esc(showK(k,it[k]))}</s> → <b>${esc(showK(k,v))}</b></div>`).join("")}</div></label>`}}
  if(o.op==="merge"){const k=item(o.keep),d=item(o.drop);if(!k||!d)return bad("मिलाने वाला सामान नहीं मिला");if(d.active===false&&d.mergedInto)return {i,ok:false,skip:true,html:`<div class="fx-r same"><b>${i+1}.</b> ✓ ${esc(nm(d))} पहले ही मिल चुका</div>`};
    return {i,ok:true,html:`<label class="fx-r"><input type="checkbox" data-fx="${i}" checked><div><b>${i+1}. 🔗 दो सामान एक करें</b>${o.why?`<br><small class="note">${esc(o.why)}</small>`:""}
      <div class="fx-c">रखें: <b>${esc(nm(k))}</b> #${esc(k.code||"")} · स्टॉक ${qOf(k.id)} · ₹${+k.sale||0}</div><div class="fx-c">छिपाएँ: <s>${esc(nm(d))}</s> #${esc(d.code||"")} · स्टॉक ${qOf(d.id)} · ₹${+d.sale||0}</div>
      <div class="fx-c">बाद में: ${esc(nm(k))} का स्टॉक <b>${r2(qOf(k.id)+qOf(d.id))}</b>, दोनों बारकोड इसी में</div></div></label>`}}
  if(o.op==="stock"){const it=item(o.id);if(!it)return bad("सामान नहीं मिला: "+esc(o.id));const to=r2(o.to);if(to===qOf(it.id))return {i,ok:false,skip:true,html:`<div class="fx-r same"><b>${i+1}.</b> ✓ ${esc(nm(it))} स्टॉक पहले से ${to}</div>`};
    return {i,ok:true,html:`<label class="fx-r"><input type="checkbox" data-fx="${i}" checked><div><b>${i+1}. 📦 ${esc(nm(it))}</b>${o.why?`<br><small class="note">${esc(o.why)}</small>`:""}<div class="fx-c">स्टॉक: <s>${qOf(it.id)}</s> → <b>${to}</b></div></div></label>`}}
  if(o.op==="pur"){const P=PUR[o.pid];const l=P&&(P.lines||[]).find(x=>x.id===o.item);if(!l)return bad("खरीद की लाइन नहीं मिली");if(l.fix)return {i,ok:false,skip:true,html:`<div class="fx-r same"><b>${i+1}.</b> ✓ ${esc(l.name)} की खरीद पहले ही ठीक</div>`};
    const nq=o.qty!=null?+o.qty:l.qty,nr=o.rate!=null?+o.rate:l.rate;
    return {i,ok:true,html:`<label class="fx-r"><input type="checkbox" data-fx="${i}" checked><div><b>${i+1}. 🧾 खरीद ${fdate(P.date)} · ${esc(P.supName||"")}</b>${o.why?`<br><small class="note">${esc(o.why)}</small>`:""}
      <div class="fx-c">${esc(l.name)}: <s>${l.qty} × ₹${l.rate}</s> → <b>${nq} × ₹${nr}</b> = ₹${r2(nq*nr)}</div>${nq!==l.qty&&item(o.item)?`<div class="fx-c">स्टॉक: ${qOf(o.item)} → <b>${r2(qOf(o.item)+nq-l.qty)}</b></div>`:""}</div></label>`}}
  return bad("अनजाना सुधार: "+esc(o.op))}
SFX.preview=async function(j){if(!S.isOwner){toast("सुधार फाइल सिर्फ़ विक्रम जी चढ़ा सकते हैं");return}
  if(!j||j.app!=="bhairav-fix"||!Array.isArray(j.ops)){toast("यह सुधार फाइल नहीं");return}
  const done=((S.settings||{}).fixFiles||[]);if(j.id&&done.includes(j.id)){toast("⛔ यह सुधार फाइल ("+j.id+") पहले ही चढ़ चुकी है");return}
  D=j;PUR={};
  for(const pid of [...new Set(j.ops.filter(o=>o.op==="pur").map(o=>o.pid))]){try{if(S.demo)PUR[pid]=(S.purchases||[]).find(p=>p.id===pid);else{const s=await S.db.doc("purchases/"+pid).get();if(s.exists)PUR[pid]={id:pid,...s.data()}}}catch(e){}}
  const rows=j.ops.map(rowOf);D._rows=rows;const n=rows.filter(r=>r.ok).length;
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="सुधार फाइल"><div class="grab"></div>
  <div class="sh-head"><div><h3>🩹 सुधार फाइल ${esc(j.id||"")}</h3><span class="note">${esc(j.note||"")} · ${n} सुधार बाकी</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <p class="note" style="margin:0 0 6px">हर सुधार देखें — जो ठीक न लगे उसका ✓ हटा दें। कुछ भी मिटता नहीं; पुराना हिसाब साथ में दर्ज रहता है।</p>
  <div class="fx-l">${rows.map(r=>r.html).join("")}</div>
  <button class="big" data-fxgo style="margin-top:8px" ${n?"":"disabled"}>✓ चुने हुए <span id="fxN">${n}</span> सुधार करें</button></div></div>`;
  const sh=$("#sheet");sh.onclick=e=>{if(e.target.matches("[data-close]")){closeSheet();return}if(e.target.closest("[data-fxgo]"))SFX.apply()};
  sh.onchange=()=>{const k=sh.querySelectorAll("[data-fx]:checked").length;$("#fxN").textContent=k;$("[data-fxgo]").disabled=!k}};
SFX.apply=async function(){const pick=[...$("#sheet").querySelectorAll("[data-fx]:checked")].map(x=>+x.dataset.fx);if(!pick.length)return;
  const b=$("[data-fxgo]");b.disabled=true;b.textContent="⏳ सुधार हो रहे हैं…";const ts=Date.now(),log=[],tag="🩹 सुधार "+(D.id||"");let ok=0,bad=0;
  for(const i of pick){const o=D.ops[i];try{
    if(o.op==="set"){const it=item(o.id);const p={},before={};Object.entries(o.set||{}).forEach(([k,v])=>{if(OK_KEYS.includes(k)){p[k]=v;before[k]=it[k]??null}});p.fixTs=ts;p.fixBy=D.id||"";await upd(o.id,p);log.push({op:"set",id:o.id,before,after:o.set})}
    else if(o.op==="merge"){const k=item(o.keep),d=item(o.drop),q=qOf(d.id);
      if(q)await adjStock([[k.id,q],[d.id,-q]],tag+" · "+nm(d)+" → "+nm(k)+" में मिलाया");
      const codes=[...new Set([...String(k.barcode||"").split(","),...String(d.barcode||"").split(",")].map(s=>s.trim()).filter(Boolean))];
      await upd(k.id,{barcode:codes.join(","),alias:[k.alias,d.name,d.hi].filter(Boolean).join(" ").slice(0,200)});
      await upd(d.id,{active:false,mergedInto:k.id,hiddenBy:"merge",mergeTs:ts});log.push({op:"merge",keep:k.id,drop:d.id,moved:q,oldBarcode:k.barcode||""})}
    else if(o.op==="stock"){const cur=qOf(o.id),d=r2(+o.to-cur);if(d)await adjStock([[o.id,d]],tag+(o.why?" · "+o.why:""));log.push({op:"stock",id:o.id,before:cur,after:+o.to})}
    else if(o.op==="pur"){const P=PUR[o.pid];const lines=(P.lines||[]).map(l=>{if(l.id!==o.item)return l;const nq=o.qty!=null?+o.qty:l.qty,nr=o.rate!=null?+o.rate:l.rate;
        return {...l,fix:{qty:l.qty,rate:l.rate,amt:l.amt,ts,by:D.id||"",why:o.why||""},qty:nq,rate:nr,amt:r2(nq*nr),billAmt:r2(nq*nr)}});
      const old=(P.lines||[]).find(l=>l.id===o.item),nl=lines.find(l=>l.id===o.item),dAmt=r2(nl.amt-old.amt);
      const p={lines,fixTs:ts};if(dAmt){p.total=r2((+P.total||0)+dAmt);p.gross=r2((+P.gross||0)+dAmt)}
      if(S.demo)Object.assign(P,p);else await S.db.doc("purchases/"+o.pid).set(p,{merge:true});
      const dq=r2(nl.qty-old.qty);if(dq&&item(o.item))await adjStock([[o.item,dq]],tag+" · खरीद "+fdate(P.date)+" "+old.qty+"→"+nl.qty);log.push({op:"pur",pid:o.pid,item:o.item,before:{qty:old.qty,rate:old.rate},after:{qty:nl.qty,rate:nl.rate}})}
    ok++}catch(e){bad++;console.warn("fix",i,e)}}
  try{if(!S.demo){await S.db.doc("imports/"+(D.id||"F"+ts)).set({kind:"fix",id:D.id||"",note:D.note||"",ts,date:today(),by:S.uid||"",byName:typeof biller==="function"?biller():"",log});
      await S.db.doc("settings/main").set({fixFiles:[...((S.settings||{}).fixFiles||[]),D.id||"F"+ts]},{merge:true})}
    S.settings={...(S.settings||{}),fixFiles:[...((S.settings||{}).fixFiles||[]),D.id||"F"+ts]}}catch(e){}
  $("#sheet").querySelector(".sheet").innerHTML=`<div class="sh-head"><div><h3>✅ ${ok} सुधार हो गए</h3>${bad?`<span class="note" style="color:var(--chili)">${bad} नहीं हुए — नेट देखकर फाइल फिर चढ़ाएँ</span>`:""}</div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <p class="note">पुराना हिसाब साथ में दर्ज है। स्टॉक के हर बदलाव 📒 स्टॉक बही में "🩹 सुधार" नाम से दिखेंगे।</p><button class="big" data-close>ठीक है</button>`;
  try{if(typeof renderStock==="function")renderStock()}catch(e){}};
const css=document.createElement("style");css.textContent=`.fx-l{display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow:auto}.fx-r{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:var(--card2,#f4f5f9);font-size:14px}.fx-r input{width:20px;height:20px;margin-top:2px;accent-color:var(--brand,#5b3df5)}.fx-r.same{opacity:.6}.fx-r.bad{color:var(--chili,#d33)}.fx-c{margin-top:2px}.fx-c s{color:var(--mut,#889)}`;document.head.appendChild(css);
})();
