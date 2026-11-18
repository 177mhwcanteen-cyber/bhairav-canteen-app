/* 📒 SBH — स्टॉक बही (सिर्फ़ मालिक) · विक्रम जी का खाका 18-11-2026
   "इस तारीख को इतना था → इतना आया → इतना बिका → अब इतना" — हर सामान का क्रिस्टल-साफ़ हिसाब।
   ऐप हर स्टॉक-बदलाव stockLog में पहले से लिखता है (कौन, कब, क्यों, कितना) — यहाँ वही पढ़कर दिखाया जाता है।
   बाकी (balance) पीछे से गिना जाता है: अभी का स्टॉक − उसके बाद के सारे बदलाव = उस समय का स्टॉक। कुछ भी लिखता/बदलता नहीं। */
(function(){
"use strict";
const SBH=window.SBH={};
const dayAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};SBH.dayAdd=dayAdd;
const r2=v=>Math.round((+v||0)*1000)/1000;
const qOf=id=>+(S.pstock[id]&&S.pstock[id].qty)||0;
const dStart=d=>new Date(d+"T00:00:00").getTime(),dEnd=d=>new Date(d+"T23:59:59.999").getTime();
const hm=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const dOf=ts=>{const d=new Date(ts);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const sgn=v=>(v>0?"+":"")+(+r2(v));
const costOf=it=>(window.SF&&SF.costOf?SF.costOf(it):+it.cost||0)||0;
const nm=it=>typeof shortNm==="function"?shortNm(it):it.name;
/* बदलाव किस तरह का: आया / बिका / लौटा / गिनती / और */
const KINDS={in:"📥 आया",sale:"🧾 बिका",ret:"↩️ वापसी",open:"🏁 ओपनिंग",cnt:"🧮 गिनती",oth:"✏️ और"};
function kind(why,d){why=String(why||"");
  if(/^बिल बदला/.test(why))return "sale";
  if(/^बिल /.test(why))return "sale";
  if(/रद्द बिल|रद्द वापस/.test(why))return "sale";      /* रद्द बिल = बिक्री वापस गिनी */
  if(/वापसी बिल/.test(why))return "ret";
  if(/माल लौटाया/.test(why))return "oth";
  if(/शुरुआती|ओपनिंग|नई शुरुआत|स्टॉक शून्य/.test(why))return "open";
  if(/गिनती|खेप/.test(why))return "cnt";
  if(/खरीद|माल आया|फाइल|मार्केट|मंडी|ट्रांसफ़र/.test(why))return d>0?"in":"oth";
  return "oth"}
SBH.kind=kind;
async function logsFor(id){if(S.demo)return (S.demoLog||[]).filter(l=>l.itemId===id);
  const s=await S.db.collection("stockLog").where("itemId","==",id).get();return s.docs.map(d=>d.data())}
async function logsSince(ts){if(S.demo)return (S.demoLog||[]).filter(l=>l.ts>=ts);
  const s=await S.db.collection("stockLog").where("ts",">=",ts).get();return s.docs.map(d=>d.data())}
const shopName=()=>((S.settings||{}).lbl||{}).shopName||"15 भैरव बटालियन वेट कैंटीन";
const sheet=(title,sub,body)=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px bh-sh" role="dialog" aria-label="${esc(title)}"><div class="grab"></div>
  <div class="sh-head"><div><h3>${title}</h3>${sub?`<span class="note">${sub}</span>`:""}</div><button class="x" data-close aria-label="बंद करें">✕</button></div><div id="bhBody">${body}</div></div></div>`};

/* ---------- एक सामान की बही ---------- */
SBH.item=async function(id){if(!S.isOwner)return;const it=item(id);if(!it)return;
  sheet("📒 "+esc(nm(it)),"हर आना-जाना, तारीख-वार",'<p class="note">⏳ बही पढ़ी जा रही है…</p>');bindSheet();
  let L=[];try{L=await logsFor(id)}catch(e){$("#bhBody").innerHTML='<p class="note">बही नहीं पढ़ी: '+esc(e.code||e.message||"")+"</p>";return}
  L=L.filter(l=>isFinite(+l.d)&&+l.d!==0).sort((a,b)=>a.ts-b.ts);
  const cur=qOf(id);let bal=cur;for(let i=L.length-1;i>=0;i--){L[i].after=r2(bal);bal=r2(bal-(+L[i].d));L[i].before=r2(bal)}
  const start=r2(bal),T={in:0,sale:0,ret:0,open:0,cnt:0,oth:0};L.forEach(l=>{T[kind(l.why,+l.d)]+= +l.d});
  const u=it.unit;let rows="",last="";
  L.slice().reverse().forEach(l=>{const dt=l.date||dOf(l.ts);if(dt!==last){rows+=`<tr class="bh-d"><td colspan="4">📅 ${fdate(dt)}</td></tr>`;last=dt}
    const k=kind(l.why,+l.d);rows+=`<tr><td><b>${hm(l.ts)}</b><br><small>${esc(l.byName||"")}</small></td><td>${KINDS[k].split(" ")[0]} ${esc(l.why||"")}</td><td class="r ${+l.d<0?"neg":"pos"}"><b>${sgn(l.d)}</b></td><td class="r">${l.before} → <b>${l.after}</b></td></tr>`});
  $("#bhBody").innerHTML=`<div class="kpis" style="margin:4px 0 8px"><div class="kpi"><span>अभी स्टॉक</span><b>${fq(cur,u)}</b></div><div class="kpi"><span>कुल आया</span><b>${sgn(r2(T.in+T.open))}</b></div><div class="kpi"><span>कुल बिका</span><b>${sgn(r2(T.sale))}</b></div><div class="kpi"><span>गिनती/और</span><b>${sgn(r2(T.cnt+T.oth+T.ret))}</b></div></div>
  <p class="note" style="margin:0 0 6px">बही शुरू होने से पहले: <b>${start}</b> · फिर ${L.length} बदलाव · अब <b>${cur}</b>${L.length?"":" (अभी कोई बदलाव दर्ज नहीं)"}</p>
  ${L.length?`<div class="tblwrap"><table class="rrt bh-t"><thead><tr><th>समय</th><th>क्या हुआ</th><th class="r">±</th><th class="r">पहले → बाद</th></tr></thead><tbody>${rows}</tbody></table></div>`:""}
  <div class="row2" style="margin-top:8px"><button class="big ghost" data-bhrange>📅 सारे सामान का हिसाब</button><button class="big ghost" data-bhwa="${esc(id)}">🟢 WhatsApp</button></div>`;
  SBH._itemTxt=`📒 *${nm(it)}* — स्टॉक बही\n`+L.slice(-25).map(l=>`${fdate(l.date||dOf(l.ts))} ${hm(l.ts)} · ${l.why||""} · ${sgn(l.d)} → ${l.after}`).join("\n")+`\n────\nअभी: ${cur}`;
};

/* ---------- तारीख वाला हिसाब: सब सामान ---------- */
let R={from:"",to:"",q:"",only:true}; /* today() index.html में बाद में बनता है — इसलिए खुलते समय भरते हैं */
SBH.range=async function(){if(!S.isOwner)return;if(!R.from){R.from=R.to=today()}
  sheet("📅 तारीख वाला स्टॉक हिसाब","इस तारीख को कितना था → कितना आया → कितना बिका → कितना बचा",'');bindSheet();await SBH.draw()};
SBH.calc=async function(from,to){const L=(await logsSince(dStart(from))).filter(l=>isFinite(+l.d));const e=dEnd(to);const M={};
  const g=id=>M[id]||(M[id]={after:0,in:0,sale:0,ret:0,open:0,cnt:0,oth:0,n:0});
  L.forEach(l=>{const o=g(l.itemId);if(l.ts>e)o.after+= +l.d;else{o[kind(l.why,+l.d)]+= +l.d;o.n++}});
  const T=S.items.filter(i=>i.track&&!i.virtual&&!i.packOf&&(i.active!==false||M[i.id]||qOf(i.id)));
  return T.map(it=>{const o=M[it.id]||g(it.id);const end=r2(qOf(it.id)-o.after),mv=r2(o.in+o.sale+o.ret+o.open+o.cnt+o.oth);
    return {it,start:r2(end-mv),inn:r2(o.in+o.open),sale:r2(-o.sale),ret:r2(o.ret),fix:r2(o.cnt+o.oth),end,n:o.n,cost:costOf(it),sp:+it.sale||0}})
   .sort((a,b)=>(+a.it.code||9e9)-(+b.it.code||9e9))};
SBH.draw=async function(){const B=$("#bhBody");if(!B)return;
  const chips=[["आज",today(),today()],["कल",dayAdd(today(),-1),dayAdd(today(),-1)],["7 दिन",dayAdd(today(),-6),today()],["30 दिन",dayAdd(today(),-29),today()]];
  B.innerHTML=`<div class="bf-r" style="margin:0 0 6px">${chips.map(([t,f,tt])=>`<button class="chip" data-bhq="${f}|${tt}" aria-pressed="${R.from===f&&R.to===tt}">${t}</button>`).join("")}</div>
  <div class="row2" style="margin:0"><label class="fld">से<input class="inp" type="date" id="bhF" value="${R.from}" max="${today()}"></label><label class="fld">तक<input class="inp" type="date" id="bhT" value="${R.to}" max="${today()}"></label></div>
  <div class="row2" style="margin:6px 0"><input class="inp" id="bhQ" type="search" placeholder="🔍 सामान खोजें" value="${esc(R.q)}"><label class="note lsw" style="align-self:center"><input type="checkbox" id="bhOnly" ${R.only?"checked":""}> सिर्फ़ जिनमें हलचल / स्टॉक है</label></div>
  <div id="bhRes"><p class="note">⏳ हिसाब बन रहा है…</p></div>`;
  let rows;try{rows=await SBH.calc(R.from,R.to)}catch(e){$("#bhRes").innerHTML='<p class="note">हिसाब नहीं बना: '+esc(e.code||e.message||"")+"</p>";return}
  SBH._rows=rows;SBH.table()};
SBH.table=function(){const el=$("#bhRes");if(!el||!SBH._rows)return;const q=R.q.trim().toLowerCase();
  let rows=SBH._rows.filter(r=>(!R.only||r.n||r.start||r.end)&&(!q||(r.it.name+" "+(r.it.hi||"")+" "+r.it.code+" "+(r.it.short||"")).toLowerCase().includes(q)));
  const t={start:0,inn:0,sale:0,end:0,vc:0,vs:0};rows.forEach(r=>{t.start+=r.start*r.sp;t.inn+=r.inn;t.sale+=r.sale;t.vc+=r.end*r.cost;t.vs+=r.end*r.sp});
  const one=R.from===R.to;
  el.innerHTML=`<p class="note" style="margin:0 0 6px"><b>${fdate(R.from)}</b>${one?"":" से <b>"+fdate(R.to)+"</b>"} · ${rows.length} सामान · बचे माल की कीमत: बिक्री भाव से <b>${rs(Math.round(t.vs))}</b>${t.vc?` · लागत से ${rs(Math.round(t.vc))}`:""}</p>
  <div class="tblwrap"><table class="rrt bh-t"><thead><tr><th>सामान</th><th class="r">${one?"सुबह":"शुरू"}</th><th class="r">+आया</th><th class="r">−बिका</th><th class="r">±और</th><th class="r">${R.to===today()?"अब":"रात"}</th></tr></thead><tbody>
  ${rows.map(r=>`<tr data-bhit="${esc(r.it.id)}"><td>${esc(nm(r.it))}${r.it.active===false?' <small class="note">(छिपा)</small>':""}</td><td class="r">${r.start}</td><td class="r pos">${r.inn?"+"+r.inn:"—"}</td><td class="r neg">${r.sale?"−"+r.sale:"—"}</td><td class="r">${r.fix||r.ret?sgn(r2(r.fix+r.ret)):"—"}</td><td class="r"><b>${r.end}</b></td></tr>`).join("")||'<tr><td colspan="6" class="note">इन तारीखों में कोई हलचल नहीं</td></tr>'}
  </tbody></table></div>
  <p class="note" style="margin:4px 0 0">किसी सामान को दबाएँ — उसकी पूरी बही (कब, किसने, किस बिल/खरीद से) खुलेगी। "±और" = गिनती का सुधार, खराब माल, माल लौटाना वगैरह।</p>
  <div class="row2" style="margin-top:8px"><button class="big ghost" data-bha4>🖨️ यह हिसाब A4 पर</button><button class="big ghost" data-bhwa="range">🟢 WhatsApp</button></div>
  <button class="big" data-bhhand style="margin-top:6px">🤝 दुकान सौंपने की रिपोर्ट</button>`};
const td=v=>`<td style="text-align:right">${v}</td>`;
SBH.a4Range=async function(){const rows=(SBH._rows||[]).filter(r=>r.n||r.start||r.end);
  await SE.printA4(`स्टॉक हिसाब · ${fdate(R.from)}${R.from===R.to?"":" से "+fdate(R.to)}`,`<p style="font-size:15px">${esc(shopName())}</p>
  <table class="t" style="font-size:15px"><thead><tr><th>#</th><th>सामान</th><th>शुरू</th><th>+आया</th><th>−बिका</th><th>±और</th><th>बचा</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(nm(r.it))}</td>${td(r.start)}${td(r.inn||"")}${td(r.sale||"")}${td(r.fix||r.ret?sgn(r2(r.fix+r.ret)):"")}${td("<b>"+r.end+"</b>")}</tr>`).join("")}</tbody></table>`)};
/* 🤝 दुकान सौंपने की रिपोर्ट: अभी का स्टॉक + खाली "गिनकर" खाना + दस्तख़त */
SBH.handover=async function(){const T=S.items.filter(i=>i.track&&i.active!==false&&!i.virtual&&!i.packOf).sort((a,b)=>(+a.code||9e9)-(+b.code||9e9));
  let vs=0,vc=0;T.forEach(it=>{const q=Math.max(0,qOf(it.id));vs+=q*(+it.sale||0);vc+=q*costOf(it)});
  const now=new Date();
  await SE.printA4("दुकान सौंपने की रिपोर्ट",`<p style="font-size:16px"><b>${esc(shopName())}</b><br>तारीख: <b>${fdate(today())}</b> · समय: <b>${hm(now.getTime())}</b> · कुल ${T.length} सामान</p>
  <table class="t" style="font-size:15px"><thead><tr><th>#</th><th>कोड</th><th>सामान</th><th>ऐप में</th><th>गिनकर</th><th>भाव ₹</th><th>कीमत ₹</th></tr></thead><tbody>
  ${T.map((it,i)=>{const q=r2(qOf(it.id));return `<tr><td>${i+1}</td><td>${esc(it.code||"")}</td><td>${esc(nm(it))}</td>${td("<b>"+q+"</b>")}<td style="min-width:22mm"></td>${td(+it.sale||0)}${td(Math.round(Math.max(0,q)*(+it.sale||0)))}</tr>`}).join("")}</tbody></table>
  <p style="font-size:16px;margin-top:8px">कुल माल (बिक्री भाव से): <b>₹${Math.round(vs).toLocaleString("en-IN")}</b>${vc?` · लागत से: <b>₹${Math.round(vc).toLocaleString("en-IN")}</b>`:""}</p>
  <table style="width:100%;margin-top:28px;font-size:15px"><tr><td>सौंपने वाला: ____________________</td><td>लेने वाला: ____________________</td></tr><tr><td style="padding-top:22px">गवाह: ____________________</td><td style="padding-top:22px">दस्तख़त/मोहर: ____________</td></tr></table>`)};
SBH.rangeTxt=function(){const rows=(SBH._rows||[]).filter(r=>r.n||r.start||r.end);
  return `📅 *स्टॉक हिसाब — ${fdate(R.from)}${R.from===R.to?"":" से "+fdate(R.to)}*\n${shopName()}\n(शुरू · +आया · −बिका · ±और = बचा)\n────\n`+rows.map(r=>`${nm(r.it)}: ${r.start} +${r.inn} −${r.sale}${r.fix||r.ret?" "+sgn(r2(r.fix+r.ret)):""} = *${r.end}*`).join("\n")};
function bindSheet(){const sh=$("#sheet");
  sh.onclick=e=>{const t=e.target;if(t.matches("[data-close]")){closeSheet();return}
    const it=t.closest("[data-bhit]");if(it){SBH.item(it.dataset.bhit);return}
    const q=t.closest("[data-bhq]");if(q){[R.from,R.to]=q.dataset.bhq.split("|");SBH.draw();return}
    if(t.closest("[data-bhrange]")){SBH.range();return}
    if(t.closest("[data-bha4]")){SBH.a4Range();return}
    if(t.closest("[data-bhhand]")){SBH.handover();return}
    const w=t.closest("[data-bhwa]");if(w){const txt=w.dataset.bhwa==="range"?SBH.rangeTxt():SBH._itemTxt;window.open(waLink(txt,String((S.settings||{}).ownerPh||"9509553600")),"_blank")}};
  sh.onchange=e=>{const t=e.target;if(t.id==="bhF"||t.id==="bhT"){R[t.id==="bhF"?"from":"to"]=t.value||today();if(R.from>R.to)R.to=R.from;SBH.draw()}if(t.id==="bhOnly"){R.only=t.checked;SBH.table()}};
  sh.oninput=e=>{if(e.target.id==="bhQ"){R.q=e.target.value;SBH.table()}}}
SBH.btnHTML=function(){if(!S.isOwner)return "";return `<div class="card2"><h3 style="margin:0 0 4px">📒 स्टॉक बही</h3><p class="note" style="margin:0 0 6px">किस तारीख को कितना था, कितना आया, कितना बिका, कितना बचा — हर सामान का पूरा हिसाब (कब, किसने, किस बिल/खरीद से)।</p>
  <div class="row2" style="margin:0"><button class="big" data-bhopen>📅 तारीख वाला हिसाब</button><button class="big ghost" data-bhhand2>🤝 सौंपने की रिपोर्ट</button></div></div>`};
document.addEventListener("click",e=>{
  if(e.target.closest("[data-bhopen]")){SBH.range();return}
  if(e.target.closest("[data-bhhand2]")){SBH.handover();return}
  const b=e.target.closest("[data-bhitem]");if(b){e.stopPropagation();SBH.item(b.dataset.bhitem)}});
const css=document.createElement("style");css.textContent=`.bh-t td,.bh-t th{padding:6px 6px;font-size:14px;vertical-align:top}.bh-t .pos{color:#0a8a3a}.bh-t .neg{color:var(--chili,#d33)}.bh-t tr[data-bhit]{cursor:pointer}.bh-d td{background:var(--card2,#f3f4f8);font-weight:800;font-size:13px}.bh-sh .tblwrap{max-height:62vh;overflow:auto}`;document.head.appendChild(css);
})();
