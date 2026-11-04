/* 🏢 SFM — सभी फर्म एक जगह (सिर्फ़ मालिक)
   • भैरव कैंटीन — इसी ऐप से
   • सब्ज़ी एक्सप्रेस — उसके Firebase से सीधे (एक बार पासवर्ड, फिर फोन याद रखता है)
   • 177 MH, मारवाड़ रसोई, रामविनायक डोसा — अभी उनका ऐप नहीं, तो मालिक आज की बिक्री हाथ से लिख सकते हैं (firmDays/{date})
   साथ में: 177 MH का महीने का हिसाब (भैरव ने MH से कितना माल लिया, कितना लौटाया, कितना देना) — A4 PDF/WhatsApp */
(function(){
"use strict";
const SFM=window.SFM={open:true};
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
const dAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};
const SABZI={apiKey:"AIzaSyBBaZF1E58Ybxemy5HPj8T3L0gnyg9eOPI",authDomain:"sabji-express-9a8f0.firebaseapp.com",projectId:"sabji-express-9a8f0",appId:"1:166609299174:web:f1740cac2f75273fbf7d27"};
const MANUAL=[["mh","🏥 177 MH वेट कैंटीन"],["rasoi","🍛 मारवाड़ रसोई"],["dosa","🥞 रामविनायक डोसा"]];
const Z=()=>({n:0,sale:0,cash:0,upi:0,ud:0,pf:0,miss:0});
function sumBills(B,lineCost){const o=Z();B.forEach(b=>{if(b.cancelled||b.mode==="inst")return;o.n++;o.sale+=num(b.total);o.cash+=num(b.pay&&b.pay.cash);o.upi+=num(b.pay&&b.pay.upi);o.ud+=num(b.pay&&b.pay.udhar);
  (b.lines||[]).forEach(l=>{const c=lineCost(l,b.date);if(c>0)o.pf+=(l.free?0:num(l.amt))-num(l.qty)*c;else o.miss+=l.free?0:num(l.amt)})});
  Object.keys(o).forEach(k=>o[k]=r2(o[k]));return o}
SFM.st={sabzi:{state:"init",d:{},err:""},manual:{}};

/* ---------- सब्ज़ी एक्सप्रेस ---------- */
let sApp=null;
function sab(){if(sApp)return sApp;if(!window.firebase||!firebase.initializeApp)return null;
  try{sApp=(firebase.apps||[]).find(a=>a.name==="sabzi")||firebase.initializeApp(SABZI,"sabzi");
    sApp.auth().onAuthStateChanged(u=>{SFM.st.sabzi.state=u?"in":"out";if(u)SFM.loadSabzi();else rr()})}catch(e){SFM.st.sabzi.state="err";SFM.st.sabzi.err=String(e.message||e)}
  return sApp}
SFM.loadSabzi=async function(){const A=sab();if(!A||!A.auth().currentUser)return;const db=A.firestore();
  for(const d of [today(),dAdd(today(),-1)]){try{const q=await db.collection("days/"+d+"/bills").get();SFM.st.sabzi.d[d]=sumBills(q.docs.map(x=>({...x.data(),date:d})),l=>num(l.cost))}catch(e){SFM.st.sabzi.err="पढ़ नहीं पाए: "+(e.code||e.message||"");SFM.st.sabzi.state="err"}}
  SFM.st.sabzi.ts=Date.now();rr()};
SFM.sabziLogin=async function(pw){const A=sab();if(!A)return;const em=(S.user&&S.user.email)||(firebase.auth&&firebase.auth().currentUser&&firebase.auth().currentUser.email)||"";
  if(!em){toast("पहले भैरव में मालिक लॉगिन करें");return}
  try{toast("⏳ सब्ज़ी एक्सप्रेस से जुड़ रहे हैं…");await A.auth().signInWithEmailAndPassword(em,pw);toast("✓ सब्ज़ी एक्सप्रेस जुड़ गया")}catch(e){toast("नहीं जुड़ा — सब्ज़ी एक्सप्रेस वाला पासवर्ड जाँचें ("+(e.code||"")+")")}};

/* ---------- हाथ से लिखी बिक्री (177 MH / रसोई / डोसा) ---------- */
SFM.loadManual=async function(){if(S.demo||!S.db)return;for(const d of [today(),dAdd(today(),-1)]){try{const x=await S.db.doc("firmDays/"+d).get();SFM.st.manual[d]=x.exists?x.data():{}}catch(e){SFM.st.manual[d]={}}}rr()};
SFM.saveManual=async function(k,d,v){const doc={[k]:{sale:num(v.sale),cash:num(v.cash),upi:num(v.upi),note:String(v.note||"").slice(0,80),ts:Date.now()}};
  SFM.st.manual[d]={...(SFM.st.manual[d]||{}),...doc};if(!S.demo&&S.db)try{await S.db.doc("firmDays/"+d).set(doc,{merge:true})}catch(e){toast("सेव नहीं हुआ (नए सर्वर नियम चाहिए)")}rr()};

function rr(){try{if(S.tab==="report"&&typeof renderReport==="function")renderReport()}catch(e){}}
let loaded=0;
SFM.html=function(){if(!S.isOwner)return "";
  if(Date.now()-loaded>5*60000){loaded=Date.now();setTimeout(()=>{sab();SFM.loadManual();if(sApp&&sApp.auth().currentUser)SFM.loadSabzi()},50)}
  const D=[today(),dAdd(today(),-1)];
  const bh=D.map(d=>d===S.billsDate?sumBills(S.dayBills||[],(l,dd)=>SF.lineCost?SF.lineCost(l,dd):num(l.cost)):(SFM._bhY&&SFM._bhY.d===d?SFM._bhY.o:null));
  if(!SFM._bhY||SFM._bhY.d!==D[1]){SFM._bhY={d:D[1],o:null};SF.fetchRange&&(async()=>{try{const q=S.demo?[]:(await S.db.collection("days/"+D[1]+"/bills").get()).docs.map(x=>({...x.data(),date:D[1]}));SFM._bhY.o=sumBills(q,(l,dd)=>SF.lineCost?SF.lineCost(l,dd):num(l.cost));rr()}catch(e){}})()}
  const sz=SFM.st.sabzi;const rows=[];
  const cell=(o,i)=>o?`<b>${rs(o.sale)}</b><small>${o.n!=null?o.n+" बिल · ":""}${o.pf?"फायदा ~"+rs(o.pf):""}</small>`:'<small class="note">—</small>';
  rows.push({k:"bh",t:"🛒 भैरव कैंटीन",v:bh,x:`नकद ${rs(bh[0]?bh[0].cash:0)} · UPI ${rs(bh[0]?bh[0].upi:0)} · उधार ${rs(bh[0]?bh[0].ud:0)}`});
  rows.push({k:"sz",t:"🥬 सब्ज़ी एक्सप्रेस",v:D.map(d=>sz.d[d]||null),x:sz.state==="in"?(sz.d[D[0]]?`नकद ${rs(sz.d[D[0]].cash)} · UPI ${rs(sz.d[D[0]].upi)} · उधार ${rs(sz.d[D[0]].ud)}`:"⏳ आ रहा है…"):sz.state==="err"?"⚠ "+esc(sz.err):"",login:sz.state!=="in"});
  MANUAL.forEach(([k,t])=>rows.push({k,t,v:D.map(d=>{const m=(SFM.st.manual[d]||{})[k];return m?{sale:num(m.sale),n:null,pf:0,cash:num(m.cash),upi:num(m.upi)}:null}),manual:1,x:((SFM.st.manual[D[0]]||{})[k]||{}).note||""}));
  const tot=D.map((d,i)=>r2(rows.reduce((a,r)=>a+(r.v[i]?num(r.v[i].sale):0),0)));
  return `<div class="card2 sfm"><div class="rr-h"><h3 style="margin:0">🏢 सभी फर्म — आज की बिक्री</h3><button class="lnk" data-sfmref>🔄</button></div>
    <div class="sfm-tot"><div><span>आज कुल</span><b>${rs(tot[0])}</b></div><div><span>कल कुल</span><b>${rs(tot[1])}</b></div></div>
    <div class="sfm-l">${rows.map(r=>`<div class="sfm-r"><div class="sfm-n"><b>${r.t}</b>${r.x?`<span class="note">${r.x}</span>`:""}
      ${r.login?`<div class="row2" style="margin:6px 0 0"><input class="inp" type="password" id="sfmPw" placeholder="सब्ज़ी एक्सप्रेस का पासवर्ड" autocomplete="current-password"><button class="big ghost" data-sfmlogin>जोड़ें</button></div><span class="note">एक बार — फिर यह फोन याद रखेगा</span>`:""}
      ${r.manual?`<button class="lnk" data-sfmman="${r.k}">✏️ आज की बिक्री लिखें</button>`:""}</div>
      <div class="sfm-c"><span>आज</span>${cell(r.v[0])}</div><div class="sfm-c"><span>कल</span>${cell(r.v[1])}</div></div>`).join("")}</div>
    <button class="big ghost" data-mhst style="margin-top:8px">🏥 177 MH से लिए माल का महीने का हिसाब</button>
  </div>`;
};
SFM.manSheet=function(k){const t=(MANUAL.find(x=>x[0]===k)||[])[1]||k,d=today(),m=(SFM.st.manual[d]||{})[k]||{};
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="${t}"><div class="grab"></div>
  <div class="sh-head"><div><h3>${t}</h3><span class="note">${fdate(d)} की बिक्री (उनका ऐप जुड़ने तक हाथ से)</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <label class="fld">कुल बिक्री ₹<input class="inp" id="mfS" inputmode="decimal" value="${m.sale||""}"></label>
  <div class="row2"><label class="fld">नकद ₹<input class="inp" id="mfC" inputmode="decimal" value="${m.cash||""}"></label><label class="fld">UPI ₹<input class="inp" id="mfU" inputmode="decimal" value="${m.upi||""}"></label></div>
  <label class="fld">नोट<input class="inp" id="mfN" value="${esc(m.note||"")}" placeholder="जैसे TMBill रिपोर्ट से"></label>
  <button class="big" data-mfsave>✓ सेव</button></div></div>`;
  $("#sheet").onclick=async e=>{if(e.target.matches("[data-close]")){closeSheet();return}if(!e.target.closest("[data-mfsave]"))return;
    const v={sale:$("#mfS").value,cash:$("#mfC").value,upi:$("#mfU").value,note:$("#mfN").value};if(!(num(v.sale)>0)){toast("कुल बिक्री लिखें");return}
    await SFM.saveManual(k,d,v);closeSheet();toast("✓ "+t+" की आज की बिक्री दर्ज")}};

/* ---------- 🏥 177 MH का महीने का हिसाब ---------- */
SFM.mhData=async function(month){const from=month+"-01",to=today().slice(0,7)===month?today():dAdd(dAdd(month+"-01",32).slice(0,7)+"-01",-1);
  let P=[];if(S.demo||!S.db)P=(S.purchHist||[]).concat(S.purch||[]);else{try{const q=await S.db.collection("purchases").where("date",">=",from).where("date","<=",to).get();P=q.docs.map(x=>({id:x.id,...x.data()}))}catch(e){P=(S.purchHist||[]).concat(S.purch||[])}}
  P=P.filter((p,i,a)=>!p.cancelled&&p.src==="mh"&&p.date>=from&&p.date<=to&&a.findIndex(x=>x.id===p.id)===i).sort((a,b)=>a.ts-b.ts);
  const R=(S.returns||[]).filter(r=>!r.void&&r.kind==="purchase"&&r.src==="mh"&&r.date>=from&&r.date<=to);
  const tot=r2(P.reduce((a,p)=>a+num(p.total),0)),ret=r2(R.reduce((a,r)=>a+num(r.total),0));
  return {month,from,to,P,R,tot,ret,net:r2(tot-ret)}};
SFM.mhText=function(x){return `🏥 *177 MH → भैरव कैंटीन — ${x.month} का हिसाब*\n${fdate(x.from)} से ${fdate(x.to)}\n────────\n`+
  x.P.map((p,i)=>`${i+1}. ${fdate(p.date).slice(0,5)} · ${(p.lines||[]).map(l=>l.name+" "+fq(l.qty,l.unit)).join(", ").slice(0,90)} — ₹${num(p.total)}`).join("\n")+
  (x.R.length?`\n\n↩️ लौटाया:\n`+x.R.map(r=>`• ${fdate(r.date).slice(0,5)} · ${(r.lines||[]).map(l=>l.name+" "+fq(l.qty,l.unit)).join(", ")} — ₹${r.total}`).join("\n"):"")+
  `\n────────\nकुल माल: ₹${x.tot}${x.ret?"\nलौटाया: −₹"+x.ret:""}\n*भैरव को 177 MH को देना: ₹${x.net}*`};
SFM.mhSheet=async function(month){month=month||today().slice(0,7);const x=await SFM.mhData(month);const pm=dAdd(month+"-01",-1).slice(0,7);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="177 MH हिसाब"><div class="grab"></div>
  <div class="sh-head"><div><h3>🏥 177 MH से लिया माल</h3><span class="note">${fdate(x.from)} – ${fdate(x.to)} · ${x.P.length} पर्ची</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <div class="seg"><button class="chip" data-mhm="${pm}" aria-pressed="${month===pm}">पिछला महीना</button><button class="chip" data-mhm="${today().slice(0,7)}" aria-pressed="${month===today().slice(0,7)}">यह महीना</button></div>
  <div class="list">${x.P.map(p=>`<div class="li"><div class="mid"><b>${fdate(p.date)}</b><span>${esc((p.lines||[]).map(l=>l.name+" "+fq(l.qty,l.unit)).join(", "))}</span></div><div class="rt">${rs(p.total)}</div></div>`).join("")||'<p class="note">इस महीने 177 MH से कोई माल नहीं लिया</p>'}</div>
  ${x.R.length?`<h4 style="margin:8px 0 4px">↩️ लौटाया</h4><div class="list">${x.R.map(r=>`<div class="li"><div class="mid"><b>${fdate(r.date)}</b><span>${esc((r.lines||[]).map(l=>l.name+" "+fq(l.qty,l.unit)).join(", "))}</span></div><div class="rt">−${rs(r.total)}</div></div>`).join("")}</div>`:""}
  <div class="amtline"><span>भैरव को 177 MH को देना</span><b>${rs(x.net)}</b></div>
  <a class="big" style="display:block;text-align:center;text-decoration:none;background:#25d366;color:#04230f" target="_blank" rel="noopener" href="${waLink(SFM.mhText(x),String((S.settings||{}).ownerPh||"9509553600").replace(/\D/g,"").slice(-10))}">🟢 WhatsApp पर हिसाब</a></div></div>`;
  $("#sheet").onclick=e=>{if(e.target.matches("[data-close]")){closeSheet();return}const m=e.target.closest("[data-mhm]");if(m)SFM.mhSheet(m.dataset.mhm)}};

document.addEventListener("click",e=>{
  if(e.target.closest("[data-sfmlogin]")){const pw=($("#sfmPw")||{}).value||"";if(!pw){toast("पासवर्ड लिखें");return}SFM.sabziLogin(pw);return}
  if(e.target.closest("[data-sfmref]")){loaded=0;SFM._bhY=null;rr();return}
  const m=e.target.closest("[data-sfmman]");if(m){SFM.manSheet(m.dataset.sfmman);return}
  if(e.target.closest("[data-mhst]")){SFM.mhSheet();return}
});
const css=document.createElement("style");css.textContent=`
.sfm-tot{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.sfm-tot div{background:var(--grad,linear-gradient(120deg,#4f46e5,#7c3aed));color:#fff;border-radius:16px;padding:10px 12px}
.sfm-tot span{display:block;font-size:12px;opacity:.85}.sfm-tot b{font-size:24px}
.sfm-r{display:grid;grid-template-columns:1fr 88px 88px;gap:6px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}
.sfm-n b{display:block;font-size:15px}.sfm-n .note{display:block;font-size:12px}.sfm-c{text-align:right}.sfm-c span{display:block;font-size:11px;color:var(--muted)}
.sfm-c b{display:block;font-size:16px}.sfm-c small{display:block;font-size:11px;color:var(--muted)}`;document.head.appendChild(css);
})();
