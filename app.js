'use strict';
// All money is integer kobo (₦1 = 100 kobo). Practice credits only — not real money.
const N = n => n * 100; // naira -> kobo
const START = N(500000);
const STATES=['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']; // 36 states + FCT
// Fictional example listings (invented names, not real companies). mk(id,name,category,state,area,price₦,slots,bad-day %,downside)
const mk=(id,name,cat,state,area,p,slots,bad,dn=.6)=>({id,name,cat,state,area,city:state,price:N(p),slots,max:Math.round(N(p)*.016),min:-Math.round(N(p)*.016*dn),bad});
const BIZ = [
  mk('kano-motors','Kano Motors Hub','Cars & auto','Kano','Bompai Road',50000,120,.2,.7),
  mk('zaria-auto','Zaria Road Auto Mart','Cars & auto','Kano','Zaria Road',40000,140,.18,.7),
  mk('capital-drive','Capital Drive Autos','Cars & auto','FCT Abuja','Jabi',45000,120,.2,.7),
  mk('mainland-wheels','Mainland Wheels Auto Plaza','Cars & auto','Lagos','Ojota',42000,130,.2,.7),
  mk('nnewi-parts','Nnewi Spare Parts Depot','Cars & auto','Anambra','Nnewi',15000,180,.15),
  mk('aba-road-clinic','Aba Road Auto Clinic','Cars & auto','Rivers','Port Harcourt',10000,200,.14),
  mk('ikeja-gadget','Ikeja Gadget Corner','Phones & gadgets','Lagos','Ikeja',20000,160,.15),
  mk('farm-centre-phones','Farm Centre Phone Plaza','Phones & gadgets','Kano','Farm Centre',18000,160,.15),
  mk('wuse-smart','Wuse Smart Devices','Phones & gadgets','FCT Abuja','Wuse 2',22000,150,.16),
  mk('coal-city-phones','Coal City Phones','Phones & gadgets','Enugu','Ogui Road',14000,170,.15),
  mk('bodija-fresh','Bodija FreshMart Supermarket','Supermarkets & stores','Oyo','Bodija, Ibadan',25000,150,.1,.5),
  mk('kaduna-family','Kaduna Family Store','Supermarkets & stores','Kaduna','Ahmadu Bello Way',20000,150,.1,.5),
  mk('benin-value','Benin Value Supermarket','Supermarkets & stores','Edo','Ring Road, Benin',18000,160,.1,.5),
  mk('plateau-mega','Plateau Mega Store','Supermarkets & stores','Plateau','Rayfield, Jos',16000,160,.12,.5),
  mk('calabar-grill','Calabar Kitchen & Grill','Restaurants','Cross River','Marian Road',12000,180,.16),
  mk('native-pot','Uyo Native Pot Eatery','Restaurants','Akwa Ibom','Uyo',9000,200,.15),
  mk('borno-suya','Maiduguri Suya House','Restaurants','Borno','Post Office Area',6000,220,.14),
  mk('amala-palace','Abeokuta Amala Palace','Restaurants','Ogun','Panseke',7000,220,.15),
  mk('aba-made','Aba Made Fashion Hub','Fashion','Abia','Ariaria, Aba',11000,170,.17),
  mk('ilorin-asooke','Ilorin Aso-Oke Studio','Fashion','Kwara','Oja Oba',9000,170,.17),
  mk('owerri-carewell','Owerri CareWell Pharmacy','Pharmacies','Imo','Wetheral Road',15000,160,.08,.4),
  mk('sokoto-family-rx','Sokoto Family Pharmacy','Pharmacies','Sokoto','Sultan Abubakar Road',12000,160,.08,.4),
  mk('sahel-swift','Sahel Swift Logistics','Logistics','Katsina','Kofar Kaura',20000,140,.18),
  mk('golden-crust','Warri Golden Crust Bakery','Bakeries','Delta','Effurun',8000,200,.12),
  mk('kebbi-rice','Argungu Rice Farm & Mill','Agriculture','Kebbi','Argungu',10000,250,.2,.8),
  mk('kaduna-maize','Zaria Maize Growers','Agriculture','Kaduna','Zaria',7000,250,.22,.8),
  mk('gombe-tomato','Gombe Tomato Fields','Agriculture','Gombe','Kumo',6000,250,.25,.9),
  mk('ondo-poultry','Akure Layers Poultry Farm','Agriculture','Ondo','Akure',9000,220,.18,.8),
  mk('bayelsa-fish','Yenagoa Catfish Ponds','Agriculture','Bayelsa','Yenagoa',8000,220,.18,.8),
  mk('niger-ranch','Mokwa Cattle Ranch','Agriculture','Niger','Mokwa',30000,120,.2,.7),
  mk('benue-garri','Makurdi Cassava & Garri Processors','Agriculture','Benue','Makurdi',7000,240,.16,.7),
];
// Retired v1 listings: kept only so old saved slots can be valued and refunded during migration.
const LEGACY = [
  {id:'recharge',name:'Recharge & Data Kiosk',price:N(5000)},{id:'zobo',name:'Zobo & Chapman Stand',price:N(3000)},{id:'pos',name:'Express POS Stand',price:N(10000)},
  {id:'buka',name:'Buka (Mama Put)',price:N(8000)},{id:'barber',name:'Fresh Cut Barbing Salon',price:N(7000)},{id:'carwash',name:'Sparkle Car Wash',price:N(12000)},
  {id:'event',name:'Owambe Event Centre',price:N(25000)},{id:'solar',name:'Solar Phone Charging Hub',price:N(6000)},{id:'tailor',name:'Fashion & Tailor Shop',price:N(9000)},{id:'suya',name:'Mallam Suya Spot',price:N(4000)}];
const BYID = Object.fromEntries(BIZ.map(b => [b.id, b]));
const KEY = 'koboShare.v1';
const today = () => Math.floor((Date.now() + 3600e3) / 864e5); // Lagos day index (UTC+1)

// Deterministic PRNG from string seed
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Per-slot practice score for a business on a given day (kobo, may be negative or zero)
function earn(b, day){
  const r = rng(b.id+':'+day);
  if (r() < b.bad) return r() < .5 ? 0 : Math.round(b.min * (0.3 + 0.7*r()));
  const lo = Math.max(0, Math.round(b.max*0.25));
  return lo + Math.floor(r()*(b.max - lo + 1));
}
// Valuation: seeded random walk, bounded 75%-135% of list price
const valCache = {};
function value(b, day){
  const k=b.id+day; if(valCache[k]) return valCache[k];
  let m = 1000; const start = day - 60;
  for(let d=start; d<=day; d++){ const r=rng('v'+b.id+d)(); m += Math.round((r-.48)*40); m=Math.min(1350,Math.max(750,m)); }
  return valCache[k] = Math.round(b.price*m/1000);
}

let S = load();
// Source tracking: ?src= or utm_source, remembered locally (first touch kept, latest used for new entries)
const QS=new URLSearchParams(location.search);
const SRC=(QS.get('src')||QS.get('utm_source')||S.src||'direct').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,40)||'direct';
if(!S.src||QS.get('src')||QS.get('utm_source')) S.src=SRC;
function fresh(){return {v:4,src:null,wlList:[],ch:null,cash:START,lots:[],hist:[],last:today(),biz:[],wl:null,created:today(),dep:0,wd:0,wallet:0}}
function kindOf(t){return /^Bought/.test(t)?'buy':/^Sold/.test(t)?'sell':/^(Deposit|Added)/.test(t)?'dep':/^(Withdraw|Cash out|Moved to)/.test(t)?'wd':/^Retired/.test(t)?'sell':'pay'}
function migrate(s){
  if(s.v>=4) return s;
  if(!(s.v>=2)){
  s.hist=(s.hist||[]).map(h=>({...h,k:h.k||kindOf(h.t)}));
  const legacy=Object.fromEntries(LEGACY.map(b=>[b.id,b]));
  for(const l of s.lots||[]){ if(BYID[l.id]) continue; const b=legacy[l.id]; const v=b?value(b,today()):l.p; s.cash+=l.q*v;
    s.hist.unshift({d:today(),t:`Retired listing refunded: ${l.q} × ${b?b.name:l.id}`,a:l.q*v,k:'sell'}); l.q=0; }
  s.lots=(s.lots||[]).filter(l=>l.q>0);
  s.biz=(s.biz||[]).map(x=>x.city&&!x.state?{...x,state:x.city==='Abuja'?'FCT Abuja':x.city==='Port Harcourt'?'Rivers':x.city}:x);
  Object.assign(s,{dep:s.dep||0,wd:s.wd||0,wallet:s.wallet||0});
  }
  // v3: rename old wording in history, move single waitlist email into a list with source
  s.hist=(s.hist||[]).map(h=>({...h,t:String(h.t).replace(/^Deposit ·/,'Added ·').replace(/^(Withdraw|Cash out \(practice\)) ·/,'Moved to practice wallet ·').replace(/simulated wallet/g,'Practice wallet').replace(/(Pay[o]ut|Practice earnings) ·/,'Practice score ·')}));
  s.wlList=s.wlList||(s.wl?[{email:s.wl,src:'unknown',at:0}]:[]);
  s.biz=(s.biz||[]).map(x=>({...x,src:x.src||'unknown'}));
  return Object.assign(s,{v:4,src:s.src||null,ch:s.ch||null});
}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Number.isInteger(s.cash))return migrate(s)}catch(e){}return fresh()}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}

const PT='<span class="ptag">Practice</span>';
const fmt = k => (k<0?'-':'')+'₦'+(Math.abs(k)/100).toLocaleString('en-NG',{minimumFractionDigits:0,maximumFractionDigits:2});
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ini = n => n.replace(/[^A-Za-z ]/g,'').split(' ').filter(w=>w.length>2).slice(0,2).map(w=>w[0]).join('').toUpperCase();
function toast(m){const t=$('#toast');t.hidden=true;void t.offsetWidth;t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2600)}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Animated number counter
function countTo(el,to,f=fmt){const from=el._v??to;el._v=to;if(reduce||from===to){el.textContent=f(to);return}
  const t0=performance.now(),dur=900;cancelAnimationFrame(el._r);
  const step=now=>{const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,4);el.textContent=f(Math.round(from+(to-from)*e));if(p<1)el._r=requestAnimationFrame(step)};el._r=requestAnimationFrame(step)}

function held(id){return S.lots.filter(l=>l.id===id).reduce((a,l)=>a+l.q,0)}
function soldOut(b){return Math.max(0, Math.floor(b.slots*0.45) + Math.floor(rng('so'+b.id)()*b.slots*0.3))} // simulated other owners
function holdingsValue(){return S.lots.reduce((a,l)=>a+l.q*value(BYID[l.id],today()),0)}
function netWorth(){return S.cash+holdingsValue()+S.wallet}
function costBasis(id){return S.lots.filter(l=>!id||l.id===id).reduce((a,l)=>a+l.q*l.p,0)}
function pnl(){const contrib=START+S.dep, total=netWorth()-contrib, unreal=holdingsValue()-costBasis();return {total,unreal,real:total-unreal,pct:total*100/contrib,contrib}}

function pending(){
  const t=today(); let total=0, days=[];
  for(let d=S.last+1; d<=t && d<=S.last+30; d++){
    let dayTot=0, rows=[];
    for(const l of S.lots){ if(l.d>=d) continue; const p=earn(BYID[l.id],d)*l.q; dayTot+=p; rows.push([l.id,p]); }
    if(rows.length) days.push({d,amt:dayTot,rows}); total+=dayTot;
  }
  return {total,days,n:Math.min(t-S.last,30)};
}
// Streak: consecutive Lagos days with a collect
function streak(){const c=S.cd||[],t=today();let d=c.includes(t)?t:t-1,n=0;while(c.includes(d)){n++;d--}return n}

function render(){
  const nw=netWorth(), pl=pnl().total;
  countTo($('#cash'),S.cash); countTo($('#nw'),nw); countTo($('#hv'),holdingsValue());
  $('#pl').innerHTML=`<span class="${pl>=0?'up':'down'}">${pl>=0?'▲ +':'▼ '}${fmt(pl)}</span>${PT} <span class="mono">all time</span>`;
  const st=streak(), c=S.cd||[], t=today();
  $('#streakN').textContent=st; $('#streak').classList.toggle('on',st>0);
  $('#week').innerHTML=[6,5,4,3,2,1,0].map(i=>`<i class="${c.includes(t-i)?'y':''} ${i===0?'t':''}"></i>`).join('');
  const p=pending(), btn=$('#collect'), lbl=btn.querySelector('.lbl');
  if(p.n<=0){btn.disabled=true;lbl.textContent='Collected for today';$('#collectNote').textContent='Next Collect unlocks tomorrow (Lagos time). Patience na virtue.';}
  else if(!S.lots.length){btn.disabled=true;lbl.textContent='Buy slots to start playing';$('#collectNote').textContent='Slots you buy today start scoring from tomorrow.';}
  else{btn.disabled=false;lbl.textContent=p.n>1?`Collect ${p.n} days`:'Collect';$('#collectNote').textContent='Simulated for learning. Results vary, nothing is guaranteed.';}
  renderMarket(); renderPort(); renderAcct(); renderHist(); renderChallenge();
}
function renderMarket(){
  const t=today(), st=$('#fState').value, ct=$('#fCat').value;
  const list=BIZ.filter(b=>(!st||b.state===st)&&(!ct||b.cat===ct));
  $('#mCount').textContent=`${list.length} of ${BIZ.length} fictional example listings`;
  if(!list.length){$('#listings').innerHTML=empty(`No example listings in ${esc(st||'this filter')} yet.`);return}
  $('#listings').innerHTML=list.map(b=>{const v=value(b,t), ch=Math.round((v-value(b,t-1))*10000/value(b,t-1))/100, h=held(b.id);
    return `<button class="li" data-detail="${b.id}"><div class="av">${ini(b.name)}</div><div class="nm"><b>${esc(b.name)}</b><small>${esc(b.state)} · ${esc(b.cat)}${h?` · <span class="up">you own ${h}</span>`:''}</small></div>
    <div class="pr"><b>${fmt(v)}</b><small class="${ch>=0?'up':'down'} mono">${ch>=0?'▲':'▼'} ${Math.abs(ch)}%</small></div></button>`}).join('');
}
function detailSheet(b){
  const t=today(), v=value(b,t), taken=soldOut(b)+held(b.id), pct=Math.min(100,Math.round(taken*100/b.slots)), h=held(b.id), c=chState(), picked=!!c.picks.find(p=>p.id===b.id);
  sheet(`<div class="row"><div class="av">${ini(b.name)}</div><div><h2>${esc(b.name)}<span class="tag">example</span></h2><p class="tiny muted" style="margin:0">${esc(b.area)}, ${esc(b.state)} · ${esc(b.cat)}</p></div></div>
  <p class="pbig">${fmt(v)}${PT} <span class="muted">per slot today</span></p>
  <div class="kv"><div><small>daily/slot*</small><b>${fmt(b.min)}–${fmt(b.max).slice(1)}</b></div><div><small>bad-day</small><b>~${Math.round(b.bad*100)}%</b></div><div><small>you own</small><b>${h}</b></div></div>
  <p class="tiny muted mono">${taken}/${b.slots} slots taken (${pct}%) · *simulated, not guaranteed</p>
  <div class="row" style="margin-top:14px">${h?`<button class="btn ghost" data-sell="${b.id}">Sell</button>`:''}<button class="btn ghost" data-pick="${b.id}" ${picked||c.picks.length>=3?'disabled':''}>${picked?'Picked':'Pick for challenge'}</button><button class="btn" style="flex:1" data-buy="${b.id}" ${taken>=b.slots?'disabled':''}>${taken>=b.slots?'Sold out':'Buy slots'}</button></div>`);
  $('#modal').onclick=e=>{if(e.target===$('#modal'))closeSheet()};
}
const empty = (m) => `<div class="card empty"><div class="ring"></div>${m}</div>`;
function renderPort(){
  const ids=[...new Set(S.lots.map(l=>l.id))];
  if(!ids.length){$('#port').innerHTML=empty('No slots yet.<br>Pick one from the Market wey sweet you.');return}
  const t=today();
  $('#port').innerHTML='<div class="list">'+ids.map(id=>{const b=BYID[id], q=held(id), cost=costBasis(id), v=q*value(b,t);
    return `<button class="li" data-detail="${id}"><div class="av">${ini(b.name)}</div><div class="nm"><b>${esc(b.name)}</b><small>${q} slot${q>1?'s':''} · cost ${fmt(cost)}</small></div><div class="pr"><b>${fmt(v)}</b><small class="${v>=cost?'up':'down'} mono">${pc(v-cost,cost)}</small></div></button>`}).join('')+
    `</div><p class="tiny muted">Total holdings: <b>${fmt(holdingsValue())}${PT}</b> · valuations move daily.</p>`;
}
const pc=(a,b)=>b?(a>=0?'+':'')+(a*100/b).toFixed(2)+'%':'—';
const KL={dep:'Added',wd:'To practice wallet',buy:'Buy',sell:'Sell',pay:'Practice score'};
function renderAcct(){
  const p=pnl(), cls=p.total>=0?'up':'down', sg=x=>(x>=0?'+':'')+fmt(x);
  $('#pnl').innerHTML=`<div class="pbig ${cls}">${sg(p.total)}${PT} <span>${pc(p.total,p.contrib)}</span></div>
   <div class="kv"><div><small>realised</small><b class="${p.real>=0?'up':'down'}">${sg(p.real)}</b></div><div><small>unrealised</small><b class="${p.unreal>=0?'up':'down'}">${sg(p.unreal)}</b></div><div><small>holdings</small><b>${fmt(holdingsValue())}${PT}</b></div></div>
   <div class="kv"><div><small>practice credits</small><b>${fmt(S.cash)}${PT}</b></div><div><small>Practice wallet</small><b>${fmt(S.wallet)}${PT}</b></div><div><small>added practice credits</small><b>${fmt(S.dep)}${PT}</b></div></div>
   <p class="tiny muted">P&amp;L = (credits + slots value + Practice wallet) − (₦500,000 starting credits + added practice credits). Realised = closed sells and collected practice scores; unrealised = open slots at today's valuation.</p>`;
  const ids=[...new Set(S.lots.map(l=>l.id))];
  $('#pnlHold').innerHTML=ids.length?'<table><tr><th>Holding</th><th>Cost</th><th>Value</th><th>P&amp;L</th></tr>'+ids.map(id=>{const c=costBasis(id),v=held(id)*value(BYID[id],today());
    return `<tr><td>${esc(BYID[id].name)}</td><td>${fmt(c)}${PT}</td><td>${fmt(v)}${PT}</td><td class="${v>=c?'up':'down'}">${v>=c?'+':''}${fmt(v-c)} <span class="tiny">${pc(v-c,c)}</span></td></tr>`}).join('')+'</table>':'<p class="tiny muted">No open holdings, so no unrealised P&amp;L.</p>';
}
function renderHist(){
  const f=$('#hFilter').value, rows=S.hist.filter(h=>!f||(h.k||kindOf(h.t))===f);
  if(!rows.length){$('#hist').innerHTML='<p class="tiny muted">No transactions here yet.</p>';return}
  $('#hist').innerHTML='<table><tr><th>Date</th><th>Type</th><th>What</th><th>Amount</th></tr>'+rows.slice(0,120).map(h=>
    `<tr><td class="rk">${new Date(h.d*864e5).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td><span class="tag k-${h.k||kindOf(h.t)}">${KL[h.k||kindOf(h.t)]}</span></td><td>${esc(h.t)}</td><td class="${h.a>0?'up':h.a<0?'down':''}">${h.a>0?'+':''}${fmt(h.a)}${PT}</td></tr>`).join('')+'</table>';
}
function sheet(html){track.lastSheet=Date.now();const m=$('#modal');m.innerHTML=`<div class="sheet">${html}</div>`;m.hidden=false}
function closeSheet(){$('#modal').hidden=true}
function qtySheet(b,mode){
  const v=value(b,today()), max= mode==='buy' ? Math.min(Math.floor(S.cash/v), b.slots-soldOut(b)-held(b.id)) : held(b.id);
  if(max<1){toast(mode==='buy'?'Your practice credits no reach o':'You have no slots to sell');return}
  sheet(`<h2>${mode==='buy'?'Buy':'Sell'} slots</h2><p class="muted">${esc(b.name)} · ${fmt(v)} per slot today</p>
  <div class="qty"><button data-q="-1">−</button><input id="q" type="number" min="1" max="${max}" value="1" inputmode="numeric"><button data-q="1">+</button></div>
  <p>Total: <b id="tot">${fmt(v)}</b>${PT} <span class="tiny muted">(practice credits, max ${max})</span></p>
  ${mode==='buy'?'<p class="tiny muted">Practice scores vary and nothing is guaranteed. Bad days can happen. Starts scoring tomorrow.</p>':''}
  <div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn" style="flex:1" data-confirm>${mode==='buy'?'Confirm buy':'Confirm sell'}</button></div>`);
  const q=$('#q'), clamp=()=>{let n=parseInt(q.value,10);if(!Number.isInteger(n)||n<1)n=1;if(n>max)n=max;q.value=n;$('#tot').textContent=fmt(n*v);return n};
  q.oninput=clamp;
  $('#modal').onclick=e=>{
    if(e.target===$('#modal')||e.target.dataset.close!==undefined) return closeSheet();
    if(e.target.dataset.q){q.value=(parseInt(q.value,10)||1)+ +e.target.dataset.q;clamp()}
    if(e.target.dataset.confirm!==undefined){const n=clamp(); mode==='buy'?buy(b,n,v):sell(b,n,v); closeSheet()}
  };
}
function buy(b,n,v){const c=n*v;if(c>S.cash)return toast('Not enough credits');track('buy_slot',{biz:b.id,qty:n,price:v});S.cash-=c;S.lots.push({id:b.id,q:n,p:v,d:today()});
  S.hist.unshift({d:today(),t:`Bought ${n} × ${b.name}`,a:-c,k:'buy'});save();render();toast(`You now own ${n} slot${n>1?'s':''}`)}
function sell(b,n,v){track('sell_slot',{biz:b.id,qty:n,price:v});let left=n;for(const l of S.lots.filter(l=>l.id===b.id)){const k=Math.min(l.q,left);l.q-=k;left-=k;if(!left)break}
  S.lots=S.lots.filter(l=>l.q>0);S.cash+=n*v;S.hist.unshift({d:today(),t:`Sold ${n} × ${b.name}`,a:n*v,k:'sell'});save();render();toast(`Sold for ${fmt(n*v)}`)}
function burst(el){if(reduce)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<18;i++){const c=document.createElement('i');c.className='coin';const a=Math.random()*Math.PI*2,d=60+Math.random()*90;
    c.style.cssText=`left:${cx}px;top:${cy}px;--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d-40}px;animation-delay:${i*12}ms`;document.body.appendChild(c);setTimeout(()=>c.remove(),1200)}
  navigator.vibrate&&navigator.vibrate(18)}
function collect(){
  const p=pending(); if(p.n<=0) return; track('collect',{days:p.n,amount:p.total});
  for(const day of p.days){ for(const [id,a] of agg(day.rows)) S.hist.unshift({d:day.d,t:`${a<0?'Bad day':a===0?'No sales':'Practice score'} · ${BYID[id].name}`,a,k:'pay'}); }
  S.cash+=p.total; S.last=today(); S.cd=[...(S.cd||[]).filter(d=>d>today()-60),today()]; save();
  const btn=$('#collect'); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); if(p.total>0) burst(btn);
  render(); $('#share').hidden=false;
  toast(p.total>0?`+${fmt(p.total)} collected. E don land.`:p.total<0?`Rough day: ${fmt(p.total)}. Business na so.`:'Nothing today. Tomorrow go better.');
}
function agg(rows){const m=new Map();for(const[id,a]of rows)m.set(id,(m.get(id)||0)+a);return m}

function showTab(id){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.id===id));scrollTo({top:0});track('tab_view',{tab:id})}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-buy],[data-sell],[data-pick],[data-detail]'); if(!t) return;
  if(t.dataset.pick){pick(t.dataset.pick);closeSheet();return}
  if(t.dataset.tab) showTab(t.dataset.tab);
  if(t.dataset.detail) detailSheet(BYID[t.dataset.detail]);
  if(t.dataset.buy) qtySheet(BYID[t.dataset.buy],'buy');
  if(t.dataset.sell) qtySheet(BYID[t.dataset.sell],'sell');
});
$('#fToggle').onclick=()=>{$('#filters').hidden=!$('#filters').hidden};
$('#collect').onclick=collect;
const DEP_CAP=N(5000000);
function deposit(n){if(S.dep+n>DEP_CAP)return toast('Practice credit limit is ₦5,000,000');S.cash+=n;S.dep+=n;S.hist.unshift({d:today(),t:`Added · ${fmt(n)} practice credits (free, not real money)`,a:n,k:'dep'});save();render();toast(`+${fmt(n)} practice credits added`)}
function withdraw(n){if(!(n>0))return toast('Enter an amount');if(n>S.cash)return toast('Not enough practice credits');S.cash-=n;S.wallet+=n;S.wd+=n;S.hist.unshift({d:today(),t:`Moved to practice wallet · ${fmt(n)} to Practice wallet`,a:-n,k:'wd'});save();render();toast(`${fmt(n)} moved to Practice wallet`)}
document.addEventListener('click',e=>{const d=e.target.closest('[data-dep]');if(d)deposit(N(+d.dataset.dep));const w=e.target.closest('[data-wd]');if(w)withdraw(w.dataset.wd==='all'?S.cash:N(+w.dataset.wd))});
$('#wdForm').onsubmit=e=>{e.preventDefault();const v=Math.round(parseFloat($('#wdAmt').value)*100);withdraw(v);$('#wdAmt').value=''};
$('#fState').innerHTML='<option value="">All 37 states</option>'+STATES.map(s=>{const n=BIZ.filter(b=>b.state===s).length;return `<option value="${s}">${s} (${n})</option>`}).join('');
$('#fCat').innerHTML='<option value="">All categories</option>'+[...new Set(BIZ.map(b=>b.cat))].map(c=>`<option>${c}</option>`).join('');
$('#bizState').innerHTML='<option value="" disabled selected>Choose state</option>'+STATES.map(s=>`<option>${s}</option>`).join('');
$('#wlState').innerHTML='<option value="">State (optional)</option>'+STATES.map(s=>`<option>${s}</option>`).join('');
document.querySelectorAll('#wlForm [name=kind]').forEach(r=>r.onchange=()=>{const o=$('#wlForm [name=kind]:checked').value==='owner';$('#wlType').hidden=!o;$('#wlType').required=o});
['#fState','#fCat'].forEach(x=>$(x).onchange=renderMarket);$('#hFilter').onchange=renderHist;
function resetAcct(){if(confirm('Reset your practice account? All practice slots and history will be cleared.')){S=fresh();save();render();closeSheet();track('reset');toast('Fresh start: ₦500,000 practice credits')}}
const clip=(v,n)=>String(v||'').trim().slice(0,n)||null;
async function cloudInsert(table,row){const sb=sbc();if(!sb)return false;try{const {error}=await sb.from(table).insert(row);return !error}catch(e){return false}}
$('#bizForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const btn=e.target.querySelector('button');btn.disabled=true;
  const row={owner_name:clip(f.owner_name,100),business_name:clip(f.business_name,100),category:clip(f.category,80),state:clip(f.state,40),contact:clip(f.contact,200),about:clip(f.about,400),src:SRC};
  const ok=await cloudInsert('business_interest',row);track('business_interest',{state:row.state,category:row.category});S.biz.push({name:row.business_name,type:row.category,state:row.state,src:SRC,at:Date.now(),synced:ok});save();e.target.reset();btn.disabled=false;
  $('#bizMsg').textContent=ok?"Thanks, your interest is noted. Nothing is raised, sold or collected.":"Saved on this device for now (couldn't reach the server). Nothing is raised, sold or collected."};
$('#wlForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const btn=e.target.querySelector('button');btn.disabled=true;
  const row={email:clip(f.email,200),name:clip(f.name,100),state:clip(f.state,40),kind:f.kind==='owner'?'owner':'curious',business_type:f.kind==='owner'?clip(f.business_type,80):null,src:SRC};
  const ok=await cloudInsert('waitlist',row);track('waitlist_join',{kind:row.kind,state:row.state});S.wl=row.email;S.wlList.push({email:row.email,kind:row.kind,src:SRC,at:Date.now(),synced:ok});save();e.target.reset();$('#wlType').hidden=true;btn.disabled=false;
  $('#wlMsg').textContent=ok?"You're on the early list. Interest only, nothing is sold.":"Saved on this device for now (couldn't reach the server)."};
// Theme: follows system by default, remembers explicit choice
const TKEY='koboShare.theme', root=document.documentElement;
function setTheme(t){root.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='light'?'#f4f6f5':'#05070a'}
setTheme(root.dataset.theme||'dark');
function toggleTheme(){const t=root.dataset.theme==='light'?'dark':'light';setTheme(t);try{localStorage.setItem(TKEY,t)}catch(e){}}
matchMedia('(prefers-color-scheme: light)').addEventListener('change',e=>{if(!localStorage.getItem(TKEY))setTheme(e.matches?'light':'dark')});
save();

// ---- Weekly challenge (practice, practice only) ----
const wk=()=>Math.floor((today()+3)/7); // week index, weeks start Monday (Lagos)
function chState(){if(!S.ch||S.ch.w!==wk())S.ch={w:wk(),picks:[]};return S.ch}
function pick(id){const c=chState();if(c.picks.find(p=>p.id===id))return;if(c.picks.length>=3)return toast('You already picked 3 this week');
  c.picks.push({id,v:value(BYID[id],today())});track('challenge_pick',{biz:id});save();renderChallenge();toast('Picked for this week\'s challenge')}
function chScore(c){return c.picks.length?c.picks.reduce((a,p)=>a+(value(BYID[p.id],today())-p.v)*100/p.v,0)/c.picks.length:0}
function renderChallenge(){
  const c=chState(), end=(wk()*7+4)*864e5-3600e3, ms=Math.max(0,end-Date.now());
  $('#cdown').textContent=`${Math.floor(ms/864e5)}d ${Math.floor(ms/36e5)%24}h ${Math.floor(ms/6e4)%60}m`;
  const opts='<option value="" disabled selected>Choose a business</option>'+BIZ.filter(b=>!c.picks.find(p=>p.id===b.id)).map(b=>`<option value="${b.id}">${esc(b.name)} (${esc(b.state)})</option>`).join('');
  $('#chPicks').innerHTML=c.picks.map(p=>{const b=BYID[p.id],ch=(value(b,today())-p.v)*100/p.v;return `<div class="row chp"><span>${esc(b.name)}</span><b class="${ch>=0?'up':'down'}">${ch>=0?'+':''}${ch.toFixed(2)}%</b></div>`}).join('')+
   (c.picks.length<3?`<div class="row"><select id="chSel" style="flex:1;margin:0">${opts}</select><button class="btn" id="chAdd">Pick (${c.picks.length}/3)</button></div>`:`<p class="tiny muted">Your 3 picks are locked in. Score: <b>${chScore(c).toFixed(2)}%</b></p>`);
  const add=$('#chAdd'); if(add) add.onclick=()=>{const v=$('#chSel').value;if(v)pick(v)};
}
setInterval(()=>{const e=$('#cdown');if(e&&$('#chFold').open)renderChallenge()},30000);

// ---- Shareable practice card (canvas PNG) ----
const SITE='https://0xzahra.github.io/kobo-share/?src=share';
function weekPct(){const wkAgo=today()-7;let a=0;const earned=S.hist.filter(h=>h.d>wkAgo&&h.k==='pay').reduce((x,h)=>x+h.a,0);return earned*100/(START+S.dep)}
function makeCard(){
  const W=1080,H=1080,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),light=root.dataset.theme==='light';
  const bg=light?'#f4f6f5':'#05070a',fg=light?'#0b0f0d':'#eef3f0',mu=light?'#5b6560':'#8a958f',ac='#39ff88';
  g.fillStyle=bg;g.fillRect(0,0,W,H);const gr=g.createRadialGradient(W*.8,H*.1,10,W*.8,H*.1,700);gr.addColorStop(0,'rgba(57,255,136,.25)');gr.addColorStop(1,'rgba(57,255,136,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.strokeStyle=ac;g.lineWidth=16;g.beginPath();g.arc(130,140,40,0,7);g.stroke();
  g.fillStyle=fg;g.font='700 56px Inter,sans-serif';g.fillText('kobo share',200,160);
  g.fillStyle='#ffb547';g.fillRect(80,240,560,64);g.fillStyle='#05070a';g.font='600 32px "JetBrains Mono",monospace';g.fillText('PRACTICE · NO REAL MONEY',100,284);
  const wp=weekPct(),st=streak();
  g.fillStyle=mu;g.font='500 40px Inter,sans-serif';g.fillText('My practice portfolio this week',80,420);
  g.fillStyle=wp>=0?ac:'#ff5c7a';g.font='800 150px Inter,sans-serif';g.fillText((wp>=0?'+':'')+wp.toFixed(2)+'%',80,580);
  g.fillStyle=fg;g.font='600 52px Inter,sans-serif';g.fillText(`streak ${st} day${st===1?'':'s'}`,80,700);
  g.fillStyle=mu;g.font='400 31px Inter,sans-serif';g.fillText('A game for learning how owning a piece of a business works.',80,820);g.fillText('Fictional businesses. Not an investment.',80,870);
  g.fillStyle=ac;g.font='500 34px "JetBrains Mono",monospace';g.fillText(SITE.replace('https://',''),80,980);
  return c;
}
async function shareCard(){track('share');
  const c=makeCard(),blob=await new Promise(r=>c.toBlob(r,'image/png')),file=new File([blob],'kobo-share-practice.png',{type:'image/png'});
  const text=`My practice portfolio on Kobo Share (practice · no real money). ${SITE}`;
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text,title:'Kobo Share practice card'});return}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Practice card downloaded');
}
$('#share').onclick=shareCard;
if(S.last===today()&&(S.cd||[]).includes(today()))$('#share').hidden=false;

// ---- Supabase: auth (magic link), profile sync, stats. Public anon/publishable key only. ----
const SB_URL='https://ivxvzvpyybpdxtcoimoh.supabase.co', SB_KEY='sb_publishable_5qqey8hErQUyQfg-0TapTw_OsznH3Sp', OWNER='usmanzahra19@gmail.com';
let _sb=null, USER=null;
function sbc(){if(_sb)return _sb;try{if(window.supabase&&window.supabase.createClient)_sb=window.supabase.createClient(SB_URL,SB_KEY)}catch(e){}return _sb}
const isOwner=()=>!!USER&&(USER.email||'').toLowerCase()===OWNER;
async function renderStats(){
  const box=$('#statsBox'),sb=sbc(),D='—';let s=null;
  if(sb){try{const r=await sb.rpc('kobo_stats');if(!r.error)s=r.data}catch(e){}}
  const v=x=>x===null||x===undefined?D:Number(x).toLocaleString('en-NG');
  const cat={};let mk='';
  if(s&&s.market){for(const m of s.market){const b=BYID[m.id];if(b)cat[b.cat]=(cat[b.cat]||0)+m.slots}
    mk=s.market.filter(m=>BYID[m.id]).slice(0,6).map((m,i)=>`<tr><td class="rk">${String(i+1).padStart(2,'0')}</td><td>${esc(BYID[m.id].name)}<span class="tag">example</span></td><td>${v(m.slots)}</td></tr>`).join('')}
  const cats=Object.entries(cat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const list=(arr)=>arr&&arr.length?'<table>'+arr.map(r=>`<tr><td>${esc(r.k)}</td><td>${v(r.n)}</td></tr>`).join('')+'</table>':`<p class="tiny muted">${D}</p>`;
  let html=`<div class="sbox"><h2>Practice market <span class="tag">practice</span></h2><p class="tiny muted">Totals across signed-in players. Fictional example businesses, practice credits only.</p>
    <div class="kv"><div><small>slots bought</small><b>${v(s&&s.slots_bought)}</b></div><div><small>top category</small><b>${cats[0]?esc(cats[0][0]):D}</b></div></div>
    <h3 class="sub">Most-owned example businesses</h3>${mk?'<table><tr><th>#</th><th>Business</th><th>Slots</th></tr>'+mk+'</table>':`<p class="tiny muted">${D}</p>`}
    <h3 class="sub">Top categories</h3>${cats.length?'<table>'+cats.map(([k,n])=>`<tr><td>${esc(k)}</td><td>${v(n)}</td></tr>`).join('')+'</table>':`<p class="tiny muted">${D}</p>`}</div>`;
  if(s&&s.community){html+=`<div class="sbox"><h2>Community${s.is_owner?' <span class="tag">owner view</span>':''}</h2>
    <div class="kv"><div><small>players signed up</small><b>${v(s.players)}</b></div><div><small>early list</small><b>${v(s.waitlist)}</b></div><div><small>business owners interested</small><b>${s.owners===null?'Soon':v(s.owners)}</b></div></div>
    <h3 class="sub">Sign-ups by state</h3>${list(s.by_state)}<h3 class="sub">Owners by business category</h3>${list(s.by_category)}
    <p class="tiny muted">Counts only, no personal data. Groups smaller than 5 are combined into “Other”.</p></div>`}
  else html+=`<div class="sbox"><h2>Community</h2><p class="muted">Community numbers coming soon.</p></div>`;
  box.innerHTML=html;
}
$('#stFold').addEventListener('toggle',e=>{if(e.target.open){renderStats();track('stats_view')}});
$('#chFold').addEventListener('toggle',e=>{if(e.target.open)track('challenge_view')});

// ---- Activity log (activity_events: insert-only for the signed-in user, owner reads via dashboard) ----
const EVQ=[];
function track(event,details={}){if(!USER||!sbc()){EVQ.push([event,details]);if(EVQ.length>30)EVQ.shift();return}
  sbc().from('activity_events').insert({user_id:USER.id,event:String(event).slice(0,40),details:{...details,src:SRC}}).then(()=>{},()=>{})}
function flushEvents(){while(EVQ.length){const [e,d]=EVQ.shift();track(e,d)}}

// ---- Account sheet ----
function authUI(){const a=$('#authBtn');if(!USER){a.textContent='K';return}
  const m=USER.user_metadata||{},pic=m.avatar_url||m.picture,nm=m.full_name||m.name||USER.email||'K';
  a.innerHTML=pic?`<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">`:esc(nm.trim()[0].toUpperCase())}
$('#authBtn').onclick=()=>{
  const prov=(USER&&USER.app_metadata&&USER.app_metadata.provider)||'email';
  sheet(`<h2>Account</h2><p class="muted tiny">Signed in as <b>${esc(USER?USER.email:'')}</b> via ${esc(prov)}. Your practice progress syncs to your account.</p>
  <div class="srow"><span>Dark / light</span><button class="theme" id="thBtn" aria-label="Toggle dark or light mode"><span class="knob"></span></button></div>
  <div class="srow"><span>Share my practice card</span><button class="btn ghost tiny" id="shBtn">Share</button></div>
  <div class="srow"><span>Reset practice account</span><button class="btn ghost tiny" id="rsBtn">Reset</button></div>
  <p class="tiny muted" style="margin-top:14px">Kobo Share records your email and in-app activity to run and improve Kobo Share. Never sold. NDPA 2023. To delete your data, email <a href="mailto:usmanzahra19@gmail.com">usmanzahra19@gmail.com</a>.</p>
  <div class="row"><button class="btn ghost" data-close>Close</button><button class="btn" style="flex:1" id="logout">Log out</button></div>`);
  $('#thBtn').onclick=toggleTheme; $('#shBtn').onclick=shareCard; $('#rsBtn').onclick=resetAcct;
  $('#logout').onclick=async()=>{track('sign_out');await sbc().auth.signOut();location.reload()};
  $('#modal').onclick=e=>{if(e.target===$('#modal')||e.target.dataset.close!==undefined)closeSheet()};
};

// ---- Sign-in gate ----
const LIVE='https://0xzahra.github.io/kobo-share/';
const redirectTo=()=>location.hostname.endsWith('github.io')?LIVE+(location.search||''):location.origin+location.pathname+location.search;
let PROVIDERS={google:false,apple:false};
function gateMsg(m){$('#gMsg').textContent=m}
async function loadProviders(){
  try{const r=await fetch(SB_URL+'/auth/v1/settings',{headers:{apikey:SB_KEY}});const j=await r.json();PROVIDERS={google:!!j.external.google,apple:!!j.external.apple}}catch(e){}
  for(const [k,on] of Object.entries(PROVIDERS)){const b=$(k==='google'?'#gGoogle':'#gApple');b.disabled=!on;b.querySelector('.soon').hidden=on;b.title=on?'':'Coming soon'}
  if(!PROVIDERS.google&&!PROVIDERS.apple){$('#gEmailForm').hidden=false;$('#gEmail').hidden=true}
}
document.querySelectorAll('.sso').forEach(b=>b.onclick=async()=>{const pr=b.dataset.provider;if(!PROVIDERS[pr])return gateMsg('Coming soon. Use the email link for now.');
  const sb=sbc();if(!sb)return gateMsg('Sign-in is unavailable right now. Try again shortly.');
  try{localStorage.setItem('koboShare.pendingSrc',SRC)}catch(e){}
  const {error}=await sb.auth.signInWithOAuth({provider:pr,options:{redirectTo:redirectTo()}});if(error)gateMsg('Could not start sign-in: '+error.message)});
$('#gEmail').onclick=()=>{$('#gEmailForm').hidden=false;$('#gEmail').hidden=true;$('#gEmailForm input').focus()};
$('#gEmailForm').onsubmit=async e=>{e.preventDefault();const sb=sbc();if(!sb)return gateMsg('Sign-in is unavailable right now.');const btn=e.target.querySelector('button');btn.disabled=true;
  const {error}=await sb.auth.signInWithOtp({email:e.target.email.value.trim(),options:{emailRedirectTo:redirectTo(),data:{src:SRC}}});btn.disabled=false;
  gateMsg(error?'Could not send the link: '+error.message:'Check your email for the login link.')};
function openApp(){$('#gate').hidden=true;$('#app').hidden=false;document.body.classList.remove('locked');const v=$('.gvid');v&&v.pause();render()}

let syncT=null;
function pushState(){if(!USER||!sbc())return;clearTimeout(syncT);syncT=setTimeout(()=>sbc().from('profiles').update({practice_state:S,updated_at:new Date().toISOString()}).eq('id',USER.id).then(()=>{}),1500)}
const _save=save; save=function(){S.updatedAt=Date.now();_save();pushState()};
async function onLogin(user){
  USER=user;authUI();openApp();const sb=sbc();
  const m=user.user_metadata||{},prov=(user.app_metadata&&user.app_metadata.provider)||'email';
  try{const {data}=await sb.from('profiles').select('practice_state,src,name,provider').eq('id',user.id).maybeSingle();
    const remote=data&&data.practice_state;
    if(remote&&Number.isInteger(remote.cash)&&(remote.updatedAt||0)>(S.updatedAt||0)){S=migrate(remote);_save();render();toast('Practice progress loaded from your account')}
    else pushState();
    const upd={email:user.email,provider:prov,last_sign_in_at:new Date().toISOString()};
    const nm=m.full_name||m.name; if(nm&&!(data&&data.name)) upd.name=String(nm).slice(0,100);
    if(!(data&&data.src)) upd.src=SRC;
    await sb.from('profiles').update(upd).eq('id',user.id);
  }catch(e){}
  let k='koboShare.signin.'+user.id;try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');track('sign_in',{provider:prov})}}catch(e){}
  flushEvents(); track('tab_view',{tab:'home'});
  if(QS.get('admin')==='1')renderAdmin();
}
// ---- Owner view (?admin=1, owner account only) ----
async function renderAdmin(){
  let d=$('#admin');if(!d){d=document.createElement('section');d.className='admin';d.id='admin';$('#home').prepend(d)}
  if(!isOwner()){d.innerHTML='<p class="tiny muted">Owner view: sign in as the owner to see records.</p>';return}
  let a=null;try{const r=await sbc().rpc('kobo_admin');if(!r.error)a=r.data}catch(e){}
  if(!a){d.innerHTML='<p class="tiny muted">Could not load owner data.</p>';return}
  const dt=x=>x?new Date(x).toLocaleString('en-GB',{timeZone:'Africa/Lagos',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  d.innerHTML=`<h2 style="font-size:17px">Owner view <span class="tag">private</span></h2><p class="tiny muted">${a.players} players · ${a.events_7d} events in 7 days · times WAT (Lagos)</p>
  <h3 class="sub">Event counts</h3>${a.events.length?'<table>'+a.events.map(r=>`<tr><td>${esc(r.k)}</td><td>${r.n}</td></tr>`).join('')+'</table>':'<p class="tiny muted">No events yet.</p>'}
  <h3 class="sub">Recent sign-ups</h3><table><tr><th>Email</th><th>Via</th><th>Joined</th></tr>${a.signups.map(u=>`<tr><td>${esc(u.email||'')}${u.name?`<br><span class="tiny muted">${esc(u.name)}</span>`:''}</td><td>${esc(u.provider||'—')}<br><span class="tiny muted">${esc(u.src||'')}</span></td><td>${dt(u.created_at)}</td></tr>`).join('')}</table>`;
}
(function initAuth(){
  if(window.__KOBO_PREVIEW){openApp();return} // local screen-recording only
  if(!initAuth.p){initAuth.p=1;loadProviders()}
  const sb=sbc();if(!sb){setTimeout(initAuth,500);return}
  let done=false;
  sb.auth.onAuthStateChange((ev,session)=>{if(session&&(!USER||USER.id!==session.user.id)){done=true;onLogin(session.user)}});
  sb.auth.getSession().then(({data})=>{if(data&&data.session&&!done)onLogin(data.session.user,false)});
})();
