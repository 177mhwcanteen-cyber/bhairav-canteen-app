/* 📥 SFI — स्टॉक फाइल चढ़ाना + 🆕 नई शुरुआत (सिर्फ़ मालिक)
   फाइल: दूसरे Claude ("भैरव कैंटीन सामान-भंडार") से मिली bhairav-stock-YYYYMMDD-NN.json (177 MH वाला mh177-stock भी चलता है)
   • पहले झलक: कितने नए, कितने पहले से, खुला/पैकेट, बिना बारकोड (लेबल), कमियाँ
   • फिर: सामान बनाना/भरना (पहले वाले में सिर्फ़ खाली खाने भरे, भाव तभी बदले जब मालिक कहें) → पैकेट वाला सामान →
     स्टॉक (शुरुआती = गिनती लगाओ, या खरीद = जोड़ो) → एक्सपायरी की खेप → छोटी फोटो → लेबल सूची
   • एक batch दोबारा नहीं चढ़ता (settings.stockFiles)
   नई शुरुआत: पहले पूरा बैकअप (फाइल + resets/{id}) → स्टॉक 0 → पुराना सामान छिपे (active:false, मिटे नहीं) → पुरानी खेपें गिनती से बाहर
   बिल, उधार खाते, लेन-देन — कभी नहीं छूते। */
(function(){
"use strict";
const SFI=window.SFI={};
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(/[₹,\s]/g,""));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
const qOf=it=>+(S.pstock[it.id]&&S.pstock[it.id].qty)||0;
const CATK=()=>CATS.map(c=>c[0]).filter(k=>k!=="all");
const UNIT_OK={pc:1,pk:1,kg:1,pl:1,dz:1,gd:1};
const gtin=c=>{c=String(c||"");if(!/^\d{8}$|^\d{12,14}$/.test(c))return false;let s=0;const d=c.slice(0,-1);for(let i=0;i<d.length;i++)s+=(+d[d.length-1-i])*(i%2?1:3);return (10-s%10)%10===+c.slice(-1)};
function catSub(r){let cat=String(r.cat||"").trim(),sub=String(r.sub||"").trim();
  if(!CATK().includes(cat))cat=sub==="tob"?"kirana":"kirana";
  if(cat==="mithai"&&sub==="bakery"){cat="kirana"} /* बेकरी: SUB2CAT से मिठाई टैब में */
  if(SUB2CAT[sub]&&cat!=="kirana")cat="kirana";
  const ok=(SUBS[mcat({cat,sub})]||[]).some(([k])=>k===sub);return {cat,sub:ok?sub:""}}
function findExisting(r){const tries=[r.barcode,r.gtin,r.key].filter(x=>x&&/^\d{6,14}$/.test(String(x)));
  for(const c of tries){const it=findByCode(String(c));if(it&&!it.packOf)return it}
  const k=String(r.key||"").toUpperCase();if(k)return S.items.find(i=>String(i.fileKey||"").toUpperCase()===k)||null;return null}

/* ---------- 1) पढ़ना + जाँच ---------- */
SFI.parse=function(text){let j;try{j=JSON.parse(String(text).replace(/^﻿/,""))}catch(e){throw {msg:"फाइल JSON नहीं है — दूसरे Claude से दोबारा “📤 फाइल दो” लें"}}
  if(!j||!Array.isArray(j.items))throw {msg:"फाइल में items सूची नहीं मिली"};
  if(j.app&&!/bhairav-stock|mh177-stock/.test(j.app))throw {msg:"यह भैरव कैंटीन की स्टॉक फाइल नहीं ("+j.app+")"};
  const batch=String(j.batch||"").trim()||("F-"+today().replace(/-/g,"")+"-"+String(j.items.length));
  const done=((S.settings||{}).stockFiles||[]).includes(batch);
  const seen=new Set();const rows=[];
  j.items.forEach((r,i)=>{const P=[];const nm=String(r.name||r.short||"").trim();if(!nm)P.push("नाम नहीं");
    const key=String(r.key||r.barcode||nm).trim();if(seen.has(key))P.push("दोहराया (key "+key+")");seen.add(key);
    let bc=String(r.barcode||"").replace(/\s+/g,"");if(bc&&!gtin(bc)){P.push("बारकोड गलत लगा ("+bc+") — नया लेबल बनेगा");bc=""}
    const sale=num(r.sale),qty=num(r.qty),modes=String(r.sellModes||"").trim()||"loose";
    if(!(sale>0)&&!(num(r.packSale)>0))P.push("भाव नहीं");
    let exp=String(r.exp||"").trim();if(exp&&!/^\d{4}-\d{2}-\d{2}$/.test(exp)){P.push("एक्सपायरी गलत ("+exp+")");exp=""}
    const dead=exp&&new Date(exp+"T23:59:59")<new Date();if(dead)P.push("⚠ एक्सपायर हो चुका");
    const ex=findExisting({...r,barcode:bc});
    rows.push({i,r,key,nm,bc,sale,qty,modes,exp,dead,ex,P,perPack:Math.round(num(r.perPack)),packSale:num(r.packSale)})});
  return {j,batch,done,rows}};

/* ---------- 2) झलक ---------- */
SFI.preview=function(text){let D;try{D=SFI.parse(text)}catch(e){toast(e.msg||"फाइल नहीं पढ़ी");return}
  const st={mode:"open",price:false};
  const R=D.rows,nNew=R.filter(x=>!x.ex).length,nOld=R.length-nNew,nPack=R.filter(x=>x.modes==="both"&&x.perPack>1&&x.packSale>0).length,
    nLbl=R.filter(x=>!x.bc&&!(x.ex&&String(x.ex.barcode||"").split(",")[0])).length,pcs=r2(R.reduce((a,x)=>a+x.qty,0)),
    val=r2(R.reduce((a,x)=>a+x.qty*num(x.r.cost),0)),prob=R.filter(x=>x.P.length),
    chg=R.filter(x=>x.ex&&x.sale>0&&Math.abs(num(x.ex.sale)-x.sale)>0.001);
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="स्टॉक फाइल"><div class="grab"></div>
    <div class="sh-head"><div><h3>📥 स्टॉक फाइल</h3><span class="note">${esc(D.batch)} · ${esc(D.j.date||"")} ${D.j.note?"· "+esc(D.j.note):""}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    ${D.done?`<div class="warn">⛔ यह फाइल (${esc(D.batch)}) पहले ही चढ़ चुकी है — दोबारा नहीं चढ़ेगी। नई फाइल लें।</div>`:""}
    <div class="skstats"><div><b>${R.length}</b><span>कुल सामान</span></div><div><b>${nNew}</b><span>🆕 नए</span></div><div><b>${nOld}</b><span>पहले से</span></div><div><b>${nPack}</b><span>📦 खुला+पैकेट</span></div></div>
    <div class="stkmeta"><span>कुल गिनती (पीस)</span><b>${pcs}</b></div>
    ${val?`<div class="stkmeta"><span>खरीद भाव से माल</span><b>${rs(val)}</b></div>`:""}
    ${nLbl?`<div class="stkmeta"><span>🏷️ बिना बारकोड — लेबल छापने हैं</span><b>${nLbl}</b></div>`:""}
    ${prob.length?`<details class="nsbox" open><summary>⚠ ${prob.length} में कमी</summary><div class="list">${prob.slice(0,30).map(x=>`<div class="li"><div class="mid"><b>${esc(x.nm||"(नाम नहीं)")}</b><span>${esc(x.P.join(" · "))}</span></div></div>`).join("")}</div></details>`:""}
    <h4 style="margin:10px 0 6px">गिनती कैसे लगे?</h4>
    <div class="paym" style="margin:0"><button data-sfm="open" aria-pressed="${st.mode==="open"}">🏁 शुरुआती स्टॉक (गिनती यही हो जाए)</button><button data-sfm="add" aria-pressed="${st.mode==="add"}">➕ खरीद (गिनती जोड़ें)</button></div>
    ${chg.length?`<label class="fld" style="margin-top:8px"><span><input type="checkbox" id="sfPrice" ${st.price?"checked":""}> पहले वाले ${chg.length} सामान का भाव भी फाइल जैसा कर दें</span></label><p class="note" style="margin:0">${chg.slice(0,4).map(x=>esc(x.ex.name)+" ₹"+num(x.ex.sale)+" → ₹"+x.sale).join(" · ")}${chg.length>4?" …":""}</p>`:""}
    <p class="note">पुराना कोई सामान मिटेगा नहीं। पहले वाले सामान में सिर्फ़ खाली खाने (छोटा नाम, वेज, फोटो…) भरेंगे।</p>
    <button class="big" data-sfgo ${D.done?"disabled":""}>✓ चढ़ाएँ — ${R.length} सामान</button></div></div>`};
  draw();
  $("#sheet").onclick=async e=>{if(e.target.matches("[data-close]")){closeSheet();return}
    const m=e.target.closest("[data-sfm]");if(m){st.mode=m.dataset.sfm;draw();return}
    if(e.target.id==="sfPrice"){st.price=e.target.checked;return}
    const g=e.target.closest("[data-sfgo]");if(g&&!D.done){g.disabled=true;g.textContent="⏳ चढ़ रहा है…";try{await SFI.apply(D,st)}catch(err){g.disabled=false;g.textContent="✓ चढ़ाएँ";toast("पूरा नहीं हुआ: "+(err.msg||err.message||err.code||""))}}};
};

/* ---------- 3) चढ़ाना ---------- */
const INFO_KEYS=["brand","variant","netQty","netUnit","usp","type","packType","innerCount","caseBarcode","caseQty","mfr","fssai","origin","hsn","gst","ingredients","allergens","nutrition","tags","subtitle","desc","features","delivery","maxPerOrder","rack","shelf","bestBeforeMonths","pkd","batchNo","peh_id","gtin"];
SFI.apply=async function(D,st){
  const ts=Date.now(),date=today(),db=S.demo?null:S.db,labels=[],lines=[],made=[],filled=[];let nb=0;
  const put=async(id,doc,merge)=>{if(db){if(merge)await db.collection("items").doc(id).set(doc,{merge:true});else await db.collection("items").doc(id).set(doc)}
    const o=item(id);if(o)Object.assign(o,doc);else S.items.push({id,...doc})};
  const pairs=[];
  for(const x of D.rows){const r=x.r;if(!x.nm)continue;
    const {cat,sub}=catSub(r);const unit=UNIT_OK[r.unit]?r.unit:"pc";
    const info={};INFO_KEYS.forEach(k=>{const v=r[k];if(v!=null&&v!==""&&!(Array.isArray(v)&&!v.length)&&!(typeof v==="object"&&!Array.isArray(v)&&!Object.values(v).some(Boolean)))info[k]=v});
    const base={short:String(r.short||"").slice(0,24),hi:r.hi||"",veg:["veg","nonveg","egg"].includes(r.veg)?r.veg:"",storage:["fridge","frozen","cool"].includes(r.storage)?r.storage:"",
      alias:String(r.searchWords||"").slice(0,200),size:r.size||"",brand:r.brand||""};
    let it=x.ex,id;
    const packOnly=x.modes==="pack";
    const sale=packOnly&&x.packSale>0?x.packSale:(x.sale||x.packSale);
    if(!it){id="f"+ts.toString(36)+x.i.toString(36);const mc=mcat({cat,sub}),code=nextCode(mc);
      const bar=x.bc||ean13("2000000"+code+"0");if(!x.bc)labels.push(id);
      it={name:x.nm,cat,sub,unit,code,barcode:bar,mrp:num(packOnly?(r.packMrp||r.mrp):r.mrp),sale,cost:num(r.cost),
        track:!["fast","sabzi"].includes(mc)&&unit!=="pl",min:num(r.minStock)||(["fast","sabzi"].includes(mc)?0:5),emoji:"📦",hue:Math.floor(Math.random()*360),order:S.items.length+1,active:true,
        perPack:x.perPack||0,secret:String(r.secret||"").toUpperCase(),fileKey:x.key,fileBatch:D.batch,addedTs:ts,addedBy:S.uid||"",addedByName:biller(),...base,info};
      Object.keys(it).forEach(k=>{if(it[k]===""&&!["sub","secret","short","hi","veg","storage","alias","size","brand"].includes(k))delete it[k]});
      if(!it.secret&&isTob(it))it.secret=nextSecret();
      await put(id,it);made.push(id);it=item(id)}
    else{id=it.id;const p={active:true};
      Object.entries(base).forEach(([k,v])=>{if(v&&!it[k])p[k]=v});if(!it.sub&&sub)p.sub=sub;if(!it.info&&Object.keys(info).length)p.info=info;
      if(!it.secret&&(r.secret||isTob({...it,sub:it.sub||sub})))p.secret=String(r.secret||"").toUpperCase()||nextSecret();
      if(!(+it.perPack)&&x.perPack)p.perPack=x.perPack;if(!(+it.cost)&&num(r.cost))p.cost=num(r.cost);if(!(+it.mrp)&&num(r.mrp))p.mrp=num(r.mrp);
      if(st.price&&sale>0&&Math.abs(num(it.sale)-sale)>0.001){p.sale=sale;try{logPrice(id,"sale",num(it.sale),sale)}catch(e){}}
      if(!it.track&&!["fast","sabzi"].includes(mcat(it))&&x.qty>0)p.track=true;
      await put(id,p,true);filled.push(id)}
    /* 📦 खुला + पैकेट: पैकेट वाला अलग सामान (packOf), टाइल एक, पॉपअप में दो */
    if(x.modes==="both"&&x.perPack>1&&x.packSale>0){const pid=id+"-pk";const have=item(pid)||S.items.find(i=>i.packOf===id&&+i.perPack===x.perPack);
      if(!have){const pc=String(+it.code+500);const pbar=String(r.packBarcode||"").replace(/\s+/g,"");const pk={name:shortNm(it).replace(/\s*\(?1\s*(pc|पीस)\)?\s*$/i,"")+" "+x.perPack+" पैक",cat:it.cat,sub:it.sub||"",unit:"pc",code:pc,
          barcode:gtin(pbar)?pbar:ean13("2000000"+pc+"0"),packOf:id,perPack:x.perPack,sale:x.packSale,mrp:num(r.packMrp)||(num(r.mrp)?r2(num(r.mrp)*x.perPack):0),cost:num(r.cost)?r2(num(r.cost)*x.perPack):0,
          track:false,min:0,secret:it.secret?it.secret+"P":"",emoji:"📦",hue:it.hue||200,order:(it.order||0)+0.5,active:true,fileBatch:D.batch,addedTs:ts};
        if(!gtin(pbar))labels.push(pid);await put(pid,pk);made.push(pid)}
      else if(st.price&&Math.abs(num(have.sale)-x.packSale)>0.001)await put(have.id,{sale:x.packSale},true)}
    /* 🖼️ छोटी फोटो (12KB तक) */
    if(r.thumb&&/^data:image\/(jpeg|png|webp);base64,/.test(r.thumb)&&r.thumb.length<40000&&!(SE.photos||{})[id]){try{if(db)await db.collection("photos").doc(id).set({d:r.thumb,ts});SE.photos[id]=r.thumb}catch(e){}}
    /* स्टॉक (पीस में) */
    if(it.track!==false&&x.qty>=0&&(x.qty>0||st.mode==="open")){const old=r2(qOf(it)),nq=st.mode==="open"?x.qty:r2(old+x.qty);if(nq!==old)pairs.push([id,r2(nq-old)]);
      lines.push({id,name:it.name,old,qty:nq,diff:r2(nq-old),exp:x.exp||"",cost:num(r.cost)||num(it.cost)})}
    if(x.exp&&x.qty>0){const bt={itemId:id,exp:x.exp,qty:x.qty,date,ts,src:"file:"+D.batch};nb++;S.batches.push({id:"t"+ts+id,...bt});if(db)db.collection("batches").doc("fl"+ts.toString(36)+id).set(bt).catch(()=>{})}
    if(st.mode==="open"){const p={openTs:ts,openQty:x.qty};if(x.exp)p.exp=x.exp;await put(id,p,true)}
  }
  if(pairs.length)await adjStock(pairs,(st.mode==="open"?"शुरुआती स्टॉक":"खरीद")+" (फाइल "+D.batch+")");
  const files=[...(((S.settings||{}).stockFiles)||[]),D.batch];const sp={stockFiles:files};if(st.mode==="open"){sp.openDate=date;sp.openTs=ts}
  Object.assign(S.settings,sp);if(db){try{await db.doc("settings/main").set(sp,{merge:true})}catch(e){}
    try{await db.collection("imports").doc(D.batch).set({batch:D.batch,date,ts,by:S.uid||"",byName:biller(),mode:st.mode,n:D.rows.length,made:made.length,filled:filled.length,labels,lines})}catch(e){}}
  SFI.last={batch:D.batch,made,filled,labels,nb,lines};
  closeSheet();try{beep(true)}catch(e){}
  SFI.doneSheet();
};
SFI.doneSheet=function(){const L=SFI.last;if(!L)return;
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="फाइल चढ़ गई"><div class="grab"></div>
  <div class="sh-head"><div><h3>✅ फाइल चढ़ गई</h3><span class="note">${esc(L.batch)}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <div class="skstats"><div><b>${L.made.length}</b><span>🆕 बने</span></div><div><b>${L.filled.length}</b><span>भरे</span></div><div><b>${L.lines.length}</b><span>स्टॉक लगा</span></div><div><b>${L.nb}</b><span>⏰ खेप</span></div></div>
  ${L.labels.length?`<h4 style="margin:10px 0 6px">🏷️ इनके लेबल छापें (${L.labels.length})</h4><div class="list">${L.labels.map(id=>{const it=item(id);return it?`<div class="li"><div class="mid"><b>${esc(shortNm(it))}</b><span>${esc(String(it.barcode||"").split(",")[0])} · ₹${num(it.sale)}</span></div></div>`:""}).join("")}</div>
    <button class="big" data-sflbl style="margin-top:8px">🏷️ लेबल टैब खोलें</button>`:'<p class="note">सब सामान पर बारकोड है — लेबल नहीं छापने।</p>'}
  <button class="big ghost" data-close style="margin-top:8px">ठीक है</button></div></div>`;
  $("#sheet").onclick=e=>{if(e.target.matches("[data-close]")){closeSheet();return}if(e.target.closest("[data-sflbl]")){closeSheet();S.lblPick=L.labels.slice();S.tab="label";try{showTab()}catch(x){}}}};

/* फाइल चुनना / चिपकाना */
SFI.open=function(){if(!S.isOwner){toast("स्टॉक फाइल सिर्फ़ विक्रम जी चढ़ा सकते हैं");return}
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="स्टॉक फाइल चढ़ाएँ"><div class="grab"></div>
  <div class="sh-head"><div><h3>📥 स्टॉक फाइल चढ़ाएँ</h3><span class="note">दूसरे Claude वाली bhairav-stock-….json</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <button class="big" data-sfpick>📂 फाइल चुनें</button><input type="file" id="sfIn" accept=".json,application/json,text/plain" hidden>
  <p class="note" style="margin:10px 0 4px">या फाइल का पूरा text यहाँ चिपकाएँ:</p><textarea class="inp" id="sfTxt" rows="4" placeholder='{"app":"bhairav-stock", …}'></textarea>
  <button class="big ghost" data-sftxt style="margin-top:6px">आगे →</button></div></div>`;
  const sh=$("#sheet");sh.onclick=e=>{if(e.target.matches("[data-close]")){closeSheet();return}if(e.target.closest("[data-sfpick]")){$("#sfIn").click();return}
    if(e.target.closest("[data-sftxt]")){const t=$("#sfTxt").value.trim();if(!t){toast("text चिपकाएँ या फाइल चुनें");return}SFI.preview(t)}};
  $("#sfIn").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{SFI.preview(await f.text())}catch(x){toast("फाइल नहीं खुली")}}};

/* ---------- 🆕 नई शुरुआत ---------- */
SFI.resetSheet=function(){if(!S.isOwner)return;const st={stock:true,hide:true,menu:false};
  const T=S.items.filter(i=>i.active!==false);const tracked=T.filter(i=>i.track&&!i.packOf);const pcs=r2(tracked.reduce((a,i)=>a+Math.max(0,qOf(i)),0));
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="नई शुरुआत"><div class="grab"></div>
    <div class="sh-head"><div><h3>🆕 नई शुरुआत</h3><span class="note">आज से नया हिसाब</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <p class="note" style="margin:0 0 8px">पहले पूरा बैकअप बनेगा (फाइल + सर्वर पर), फिर नीचे चुनी चीज़ें होंगी। <b>बिल, उधार खाते और लेन-देन कभी नहीं मिटेंगे।</b></p>
    <label class="fld"><span><input type="checkbox" data-rs="stock" ${st.stock?"checked":""}> सारा स्टॉक 0 करें (${tracked.length} सामान, ${pcs} पीस) + पुरानी एक्सपायरी गिनती से बाहर</span></label>
    <label class="fld"><span><input type="checkbox" data-rs="hide" ${st.hide?"checked":""}> पुराना पैकेट वाला सामान सूची से छिपाएँ (${T.filter(i=>!["fast","sabzi"].includes(mcat(i))).length}) — नई फाइल में वही बारकोड आया तो अपने-आप वापस दिखेगा</span></label>
    <label class="fld"><span><input type="checkbox" data-rs="menu" ${st.menu?"checked":""}> फास्ट फूड / सब्ज़ी का मेन्यू भी छिपाएँ (${T.filter(i=>["fast","sabzi"].includes(mcat(i))).length})</span></label>
    <label class="fld">पक्का करने के लिए लिखें: <b>शुरू</b><input class="inp" id="rsOk" autocomplete="off"></label>
    <button class="big" data-rsgo>🆕 बैकअप लेकर नई शुरुआत करें</button></div></div>`};
  draw();
  $("#sheet").onclick=async e=>{if(e.target.matches("[data-close]")){closeSheet();return}
    const c=e.target.closest("[data-rs]");if(c){st[c.dataset.rs]=c.checked;return}
    const g=e.target.closest("[data-rsgo]");if(!g)return;if(($("#rsOk").value||"").trim()!=="शुरू"){toast("नीचे ‘शुरू’ लिखें");return}
    g.disabled=true;g.textContent="⏳ बैकअप बन रहा है…";try{await SFI.reset(st)}catch(err){g.disabled=false;g.textContent="🆕 बैकअप लेकर नई शुरुआत करें";toast("नहीं हुआ: "+(err.message||err.code||""))}}};
SFI.reset=async function(st){const ts=Date.now(),rid="r"+ts.toString(36),db=S.demo?null:S.db;
  const snap={app:"bhairav-backup",v:1,ts,date:today(),by:biller(),items:S.items.map(i=>({...i})),pstock:JSON.parse(JSON.stringify(S.pstock||{})),batches:(S.batches||[]).map(b=>({...b})),settings:{...(S.settings||{})}};
  /* 1) बैकअप — फाइल (फोन में) + सर्वर */
  const blob=new Blob([JSON.stringify(snap)],{type:"application/json"});
  try{if(window.SX&&SX.shareBlob)await SX.shareBlob(blob,"BhairavCanteen_Backup_"+today(),"json","application/json","भैरव कैंटीन — नई शुरुआत से पहले का पूरा बैकअप");}catch(e){}
  if(db){await db.collection("resets").doc(rid).set({ts,date:today(),by:S.uid||"",byName:biller(),opts:st,
    items:snap.items.map(i=>({id:i.id,name:i.name,active:i.active!==false,qty:+(snap.pstock[i.id]&&snap.pstock[i.id].qty)||0,exp:i.exp||"",sale:+i.sale||0,cost:+i.cost||0,barcode:i.barcode||""}))})}
  /* 2) स्टॉक 0 */
  if(st.stock){const pr=S.items.filter(i=>i.track&&qOf(i)!==0).map(i=>[i.id,-qOf(i)]);if(pr.length)await adjStock(pr,"नई शुरुआत — स्टॉक 0");
    for(const i of S.items){i.openTs=ts;if(db)try{await db.doc("items/"+i.id).set({openTs:ts},{merge:true})}catch(e){}}}
  /* 3) पुराना सामान छिपाओ (मिटता नहीं) */
  let nh=0;for(const i of S.items){if(i.active===false||i.id==="xyz")continue;const menu=["fast","sabzi"].includes(mcat(i));if(menu?!st.menu:!st.hide)continue;
    i.active=false;i.hiddenBy=rid;nh++;if(db)try{await db.doc("items/"+i.id).set({active:false,hiddenBy:rid},{merge:true})}catch(e){}}
  const sp={resetTs:ts,resetId:rid,openDate:today(),openTs:ts};Object.assign(S.settings,sp);if(db)try{await db.doc("settings/main").set(sp,{merge:true})}catch(e){}
  closeSheet();try{beep(true)}catch(e){}toast("🆕 नई शुरुआत हो गई — बैकअप बना, "+(st.stock?"स्टॉक 0, ":"")+nh+" सामान छिपे · अब 📥 स्टॉक फाइल चढ़ाएँ");
  try{renderPane(true)}catch(e){}};

/* बटन */
SFI.btnHTML=function(){if(!S.isOwner)return "";const n=((S.settings||{}).stockFiles||[]).length;
  return `<button class="big so-go" data-sfiopen>📥 स्टॉक फाइल चढ़ाएँ${n?` <small>(${n} चढ़ चुकीं)</small>`:""}</button>`};
document.addEventListener("click",e=>{if(e.target.closest("[data-sfiopen]")){SFI.open();return}if(e.target.closest("[data-sfireset]")){SFI.resetSheet()}});
})();
