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

// Per-slot daily practice earnings for a business on a given day (kobo, may be negative or zero)
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
function fresh(){return {v:3,src:null,wlList:[],ch:null,cash:START,lots:[],hist:[],last:today(),biz:[],wl:null,created:today(),dep:0,wd:0,wallet:0}}
function kindOf(t){return /^Bought/.test(t)?'buy':/^Sold/.test(t)?'sell':/^(Deposit|Added)/.test(t)?'dep':/^(Withdraw|Cash out)/.test(t)?'wd':/^Retired/.test(t)?'sell':'pay'}
function migrate(s){
  if(s.v>=3) return s;
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
  s.hist=(s.hist||[]).map(h=>({...h,t:String(h.t).replace(/^Deposit ·/,'Added ·').replace(/^Withdraw ·/,'Cash out (practice) ·').replace(/simulated wallet/g,'Practice wallet').replace(/Pay[o]ut ·/,'Practice earnings ·')}));
  s.wlList=s.wlList||(s.wl?[{email:s.wl,src:'unknown',at:0}]:[]);
  s.biz=(s.biz||[]).map(x=>({...x,src:x.src||'unknown'}));
  return Object.assign(s,{v:3,src:s.src||null,ch:s.ch||null});
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
  countTo($('#cash'),S.cash); countTo($('#nw'),nw);
  $('#pl').innerHTML=`<span class="${pl>=0?'up':'down'}">${pl>=0?'▲ +':'▼ '}${fmt(pl)}</span>${PT} <span class="mono">all time</span>`;
  const st=streak(), c=S.cd||[], t=today();
  $('#streakN').textContent=st; $('#streak').classList.toggle('on',st>0);
  $('#week').innerHTML=[6,5,4,3,2,1,0].map(i=>`<i class="${c.includes(t-i)?'y':''} ${i===0?'t':''}"></i>`).join('');
  const p=pending(), btn=$('#collect'), lbl=btn.querySelector('.lbl');
  if(p.n<=0){btn.disabled=true;lbl.textContent='Collected for today';$('#collectNote').textContent='Next daily practice earnings unlock tomorrow (Lagos time). Patience na virtue.';}
  else if(!S.lots.length){btn.disabled=true;lbl.textContent='Buy slots to start earning';$('#collectNote').textContent='Slots you buy today start earning from tomorrow.';}
  else{btn.disabled=false;lbl.textContent=`Collect ${p.n} day${p.n>1?'s':''} of practice earnings`;$('#collectNote').textContent='Simulated for learning. Results vary, nothing is guaranteed.';}
  renderMarket(); renderPort(); renderAcct(); renderHist(); renderBoard(START+pl); renderChallenge();
}
function renderMarket(){
  const t=today(), st=$('#fState').value, ct=$('#fCat').value;
  const list=BIZ.filter(b=>(!st||b.state===st)&&(!ct||b.cat===ct));
  $('#mCount').textContent=`${list.length} of ${BIZ.length} listings`;
  if(!list.length){$('#listings').innerHTML=empty(`No example listings in ${esc(st||'this filter')} yet.<br>Know a good business there? List it.`);return}
  $('#listings').innerHTML=list.map((b,i)=>{
    const v=value(b,t), ch=Math.round((v-value(b,t-1))*10000/value(b,t-1))/100, taken=soldOut(b)+held(b.id), pct=Math.min(100,Math.round(taken*100/b.slots)), h=held(b.id);
    return `<article class="card biz" style="animation-delay:${Math.min(i,12)*40}ms"><div class="h"><div class="av">${ini(b.name)}</div><div><h3>${esc(b.name)}<span class="tag">example</span></h3><div class="loc">${esc(b.area)}, ${esc(b.state)} · ${esc(b.cat)}</div></div></div>
    <div class="price"><b>${fmt(v)}${PT}</b><span class="${ch>=0?'up':'down'} tiny mono">${ch>=0?'▲':'▼'} ${Math.abs(ch)}%</span><span class="tiny muted">per slot today</span></div>
    <div class="kv"><div><small>daily/slot*</small><b>${fmt(b.min)}–${fmt(b.max).slice(1)}</b></div>
    <div><small>bad-day</small><b>~${Math.round(b.bad*100)}%</b></div><div><small>you own</small><b>${h}</b></div></div>
    <div class="bar"><i style="width:${pct}%"></i></div><div class="tiny muted mono">${taken}/${b.slots} slots taken · *not guaranteed</div>
    <button class="btn" data-buy="${b.id}" ${taken>=b.slots?'disabled':''}>${taken>=b.slots?'Sold out':'Buy slots'}</button></article>`}).join('');
}
const empty = (m) => `<div class="card empty"><div class="ring"></div>${m}</div>`;
function renderPort(){
  const ids=[...new Set(S.lots.map(l=>l.id))];
  if(!ids.length){$('#port').innerHTML=empty('No slots yet.<br>Pick one from the Market wey sweet you.');return}
  const t=today();
  $('#port').innerHTML='<div class="card"><table><tr><th>Business</th><th>Slots</th><th>Cost</th><th>Value</th><th>P&amp;L</th><th></th></tr>'+ids.map(id=>{
    const b=BYID[id], q=held(id), cost=S.lots.filter(l=>l.id===id).reduce((a,l)=>a+l.q*l.p,0), v=q*value(b,t);
    return `<tr><td>${esc(b.name.split(' ').slice(0,3).join(' '))}</td><td>${q}</td><td>${fmt(cost)}${PT}</td><td>${fmt(v)}${PT}</td><td class="${v>=cost?'up':'down'}">${v>=cost?'+':''}${fmt(v-cost)}<br><span class="tiny">${pc(v-cost,cost)}</span></td><td><button class="btn ghost tiny" data-sell="${id}">Sell</button></td></tr>`}).join('')+
    `</table><p class="tiny muted">Total holdings: <b>${fmt(holdingsValue())}${PT}</b> · valuations fluctuate daily.</p></div>`;
}
const pc=(a,b)=>b?(a>=0?'+':'')+(a*100/b).toFixed(2)+'%':'—';
const KL={dep:'Deposit',wd:'Withdraw',buy:'Buy',sell:'Sell',pay:'Practice earnings'};
function renderAcct(){
  const p=pnl(), cls=p.total>=0?'up':'down', sg=x=>(x>=0?'+':'')+fmt(x);
  $('#pnl').innerHTML=`<div class="pbig ${cls}">${sg(p.total)}${PT} <span>${pc(p.total,p.contrib)}</span></div>
   <div class="kv"><div><small>realised</small><b class="${p.real>=0?'up':'down'}">${sg(p.real)}</b></div><div><small>unrealised</small><b class="${p.unreal>=0?'up':'down'}">${sg(p.unreal)}</b></div><div><small>holdings</small><b>${fmt(holdingsValue())}${PT}</b></div></div>
   <div class="kv"><div><small>practice credits</small><b>${fmt(S.cash)}${PT}</b></div><div><small>Practice wallet</small><b>${fmt(S.wallet)}${PT}</b></div><div><small>added practice credits</small><b>${fmt(S.dep)}${PT}</b></div></div>
   <p class="tiny muted">P&amp;L = (credits + slots value + Practice wallet) − (₦500,000 starting credits + added practice credits). Realised = closed sells and daily practice earnings; unrealised = open slots at today's valuation.</p>`;
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
const BOTS=['Chidi_Lagos','AmakaBuys','Musa.Kano','TundeOwnsAm','Ngozi PH','Halima_Abj','Emeka Big Boy','Zainab K','Seyi Hustle'];
function renderBoard(nw){
  const t=today(); const rows=BOTS.map((n,i)=>({n,v:START+Math.round((rng('bot'+i+t)()-.35)*N(60000))+i*N(1500)*((t%7)+1)}));
  rows.push({n:'You',v:nw,me:1}); rows.sort((a,b)=>b.v-a.v);
  $('#rank').textContent='#'+(rows.findIndex(r=>r.me)+1)+'/'+rows.length;
  $('#lb').innerHTML='<div class="card"><p class="tiny muted">Practice leaderboard (sample players are simulated). *Score = ₦500,000 + your P&amp;L, so added practice credits do not count.</p><table><tr><th>#</th><th>Player</th><th>Score*</th></tr>'+
    rows.map((r,i)=>`<tr class="${r.me?'me':''}"><td class="rk">${String(i+1).padStart(2,'0')}</td><td>${esc(r.n)}</td><td>${fmt(r.v)}${PT}</td></tr>`).join('')+'</table></div>';
}

function sheet(html){const m=$('#modal');m.innerHTML=`<div class="sheet">${html}</div>`;m.hidden=false}
function closeSheet(){$('#modal').hidden=true}
function qtySheet(b,mode){
  const v=value(b,today()), max= mode==='buy' ? Math.min(Math.floor(S.cash/v), b.slots-soldOut(b)-held(b.id)) : held(b.id);
  if(max<1){toast(mode==='buy'?'Your practice credits no reach o':'You have no slots to sell');return}
  sheet(`<h2>${mode==='buy'?'Buy':'Sell'} slots</h2><p class="muted">${esc(b.name)} · ${fmt(v)} per slot today</p>
  <div class="qty"><button data-q="-1">−</button><input id="q" type="number" min="1" max="${max}" value="1" inputmode="numeric"><button data-q="1">+</button></div>
  <p>Total: <b id="tot">${fmt(v)}</b>${PT} <span class="tiny muted">(practice credits, max ${max})</span></p>
  ${mode==='buy'?'<p class="tiny muted">Earnings not guaranteed. Bad days can happen. Starts earning tomorrow.</p>':''}
  <div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn" style="flex:1" data-confirm>${mode==='buy'?'Confirm buy':'Confirm sell'}</button></div>`);
  const q=$('#q'), clamp=()=>{let n=parseInt(q.value,10);if(!Number.isInteger(n)||n<1)n=1;if(n>max)n=max;q.value=n;$('#tot').textContent=fmt(n*v);return n};
  q.oninput=clamp;
  $('#modal').onclick=e=>{
    if(e.target===$('#modal')||e.target.dataset.close!==undefined) return closeSheet();
    if(e.target.dataset.q){q.value=(parseInt(q.value,10)||1)+ +e.target.dataset.q;clamp()}
    if(e.target.dataset.confirm!==undefined){const n=clamp(); mode==='buy'?buy(b,n,v):sell(b,n,v); closeSheet()}
  };
}
function buy(b,n,v){const c=n*v;if(c>S.cash)return toast('Not enough credits');S.cash-=c;S.lots.push({id:b.id,q:n,p:v,d:today()});
  S.hist.unshift({d:today(),t:`Bought ${n} × ${b.name}`,a:-c,k:'buy'});save();render();toast(`You now own ${n} slot${n>1?'s':''}`)}
function sell(b,n,v){let left=n;for(const l of S.lots.filter(l=>l.id===b.id)){const k=Math.min(l.q,left);l.q-=k;left-=k;if(!left)break}
  S.lots=S.lots.filter(l=>l.q>0);S.cash+=n*v;S.hist.unshift({d:today(),t:`Sold ${n} × ${b.name}`,a:n*v,k:'sell'});save();render();toast(`Sold for ${fmt(n*v)}`)}
function burst(el){if(reduce)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<18;i++){const c=document.createElement('i');c.className='coin';const a=Math.random()*Math.PI*2,d=60+Math.random()*90;
    c.style.cssText=`left:${cx}px;top:${cy}px;--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d-40}px;animation-delay:${i*12}ms`;document.body.appendChild(c);setTimeout(()=>c.remove(),1200)}
  navigator.vibrate&&navigator.vibrate(18)}
function collect(){
  const p=pending(); if(p.n<=0) return;
  for(const day of p.days){ for(const [id,a] of agg(day.rows)) S.hist.unshift({d:day.d,t:`${a<0?'Bad day':a===0?'No sales':'Practice earnings'} · ${BYID[id].name}`,a,k:'pay'}); }
  S.cash+=p.total; S.last=today(); S.cd=[...(S.cd||[]).filter(d=>d>today()-60),today()]; save();
  const btn=$('#collect'); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); if(p.total>0) burst(btn);
  render(); $('#share').hidden=false;
  toast(p.total>0?`+${fmt(p.total)} collected. E don land.`:p.total<0?`Rough day: ${fmt(p.total)}. Business na so.`:'Nothing today. Tomorrow go better.');
}
function agg(rows){const m=new Map();for(const[id,a]of rows)m.set(id,(m.get(id)||0)+a);return m}

function movePill(){const on=$('.tabs button.on'),pill=$('.pill');if(!on)return;pill.style.width=on.offsetWidth+'px';pill.style.transform=`translateX(${on.offsetLeft-6}px)`}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-buy],[data-sell],[data-pick]');
  if(t&&t.dataset.pick){pick(t.dataset.pick);return} if(!t) return;
  if(t.dataset.tab){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.id===t.dataset.tab));movePill();
    const top=$('.panes').getBoundingClientRect().top+scrollY-90; if(scrollY>top) scrollTo({top,behavior:'smooth'})}
  if(t.dataset.buy) qtySheet(BYID[t.dataset.buy],'buy');
  if(t.dataset.sell) qtySheet(BYID[t.dataset.sell],'sell');
});
addEventListener('resize',movePill);
$('#collect').onclick=collect;
const DEP_CAP=N(5000000);
function deposit(n){if(S.dep+n>DEP_CAP)return toast('Practice credit limit is ₦5,000,000');S.cash+=n;S.dep+=n;S.hist.unshift({d:today(),t:`Added · ${fmt(n)} practice credits (free, not real money)`,a:n,k:'dep'});save();render();toast(`+${fmt(n)} practice credits added`)}
function withdraw(n){if(!(n>0))return toast('Enter an amount');if(n>S.cash)return toast('Not enough practice credits');S.cash-=n;S.wallet+=n;S.wd+=n;S.hist.unshift({d:today(),t:`Cash out (practice) · ${fmt(n)} to Practice wallet`,a:-n,k:'wd'});save();render();toast(`${fmt(n)} moved to Practice wallet`)}
document.addEventListener('click',e=>{const d=e.target.closest('[data-dep]');if(d)deposit(N(+d.dataset.dep));const w=e.target.closest('[data-wd]');if(w)withdraw(w.dataset.wd==='all'?S.cash:N(+w.dataset.wd))});
$('#wdForm').onsubmit=e=>{e.preventDefault();const v=Math.round(parseFloat($('#wdAmt').value)*100);withdraw(v);$('#wdAmt').value=''};
$('#fState').innerHTML='<option value="">All 37 states</option>'+STATES.map(s=>{const n=BIZ.filter(b=>b.state===s).length;return `<option value="${s}">${s} (${n})</option>`}).join('');
$('#fCat').innerHTML='<option value="">All categories</option>'+[...new Set(BIZ.map(b=>b.cat))].map(c=>`<option>${c}</option>`).join('');
$('#bizState').innerHTML='<option value="" disabled selected>Choose state</option>'+STATES.map(s=>`<option>${s}</option>`).join('');
['#fState','#fCat'].forEach(x=>$(x).onchange=renderMarket);$('#hFilter').onchange=renderHist;
$('#reset').onclick=()=>{if(confirm('Reset your practice account? All practice slots and history will be cleared.')){S=fresh();save();render();toast('Fresh start: ₦500,000 practice credits')}};
$('#bizForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));S.biz.push({...f,src:SRC,at:Date.now()});save();e.target.reset();$('#bizMsg').textContent="Interest noted on this device only. Nothing is raised, sold or collected."};
$('#wlForm').onsubmit=e=>{e.preventDefault();const em=new FormData(e.target).get('email');S.wl=em;S.wlList.push({email:em,src:SRC,at:Date.now()});save();e.target.reset();$('#wlMsg').textContent="You're on the early list (saved locally on this device only, interest only)."};
// Theme: follows system by default, remembers explicit choice
const TKEY='koboShare.theme', root=document.documentElement;
function setTheme(t){root.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='light'?'#f4f6f5':'#05070a'}
setTheme(root.dataset.theme||'dark');
$('#theme').onclick=()=>{const t=root.dataset.theme==='light'?'dark':'light';setTheme(t);try{localStorage.setItem(TKEY,t)}catch(e){}};
matchMedia('(prefers-color-scheme: light)').addEventListener('change',e=>{if(!localStorage.getItem(TKEY))setTheme(e.matches?'light':'dark')});
save(); requestAnimationFrame(movePill);
setTimeout(()=>{$('#listings').classList.add('first');render();movePill();setTimeout(()=>$('#listings').classList.remove('first'),1200)}, reduce?0:350); // brief shimmer skeleton on first paint

// ---- Weekly challenge (practice, simulated board) ----
const wk=()=>Math.floor((today()+3)/7); // week index, weeks start Monday (Lagos)
function chState(){if(!S.ch||S.ch.w!==wk())S.ch={w:wk(),picks:[]};return S.ch}
function pick(id){const c=chState();if(c.picks.find(p=>p.id===id))return;if(c.picks.length>=3)return toast('You already picked 3 this week');
  c.picks.push({id,v:value(BYID[id],today())});save();renderChallenge();toast('Picked for this week\'s challenge')}
function chScore(c){return c.picks.length?c.picks.reduce((a,p)=>a+(value(BYID[p.id],today())-p.v)*100/p.v,0)/c.picks.length:0}
function renderChallenge(){
  const c=chState(), end=(wk()*7+4)*864e5-3600e3, ms=Math.max(0,end-Date.now());
  $('#cdown').textContent=`${Math.floor(ms/864e5)}d ${Math.floor(ms/36e5)%24}h ${Math.floor(ms/6e4)%60}m`;
  const opts=BIZ.filter(b=>!c.picks.find(p=>p.id===b.id)).map(b=>`<option value="${b.id}">${esc(b.name)} (${esc(b.state)})</option>`).join('');
  $('#chPicks').innerHTML=c.picks.map(p=>{const b=BYID[p.id],ch=(value(b,today())-p.v)*100/p.v;return `<div class="row chp"><span>${esc(b.name)}</span><b class="${ch>=0?'up':'down'}">${ch>=0?'+':''}${ch.toFixed(2)}%</b></div>`}).join('')+
   (c.picks.length<3?`<div class="row"><select id="chSel" style="flex:1;margin:0">${opts}</select><button class="btn" id="chAdd">Pick (${c.picks.length}/3)</button></div>`:`<p class="tiny muted">Your 3 picks are locked in. Score: <b>${chScore(c).toFixed(2)}%</b></p>`);
  const add=$('#chAdd'); if(add) add.onclick=()=>pick($('#chSel').value);
  const rows=BOTS.map((n,i)=>({n,s:Math.round((rng('ch'+i+wk()+':'+today())()-.45)*800)/100}));
  if(c.picks.length) rows.push({n:'You',s:Math.round(chScore(c)*100)/100,me:1});
  rows.sort((a,b)=>b.s-a.s);
  $('#chBoard').innerHTML='<div class="card"><h2>This week\'s board</h2><p class="tiny muted">Sample players are simulated. Practice only, no prizes.</p><table><tr><th>#</th><th>Player</th><th>Result</th></tr>'+
   rows.map((r,i)=>`<tr class="${r.me?'me':''}"><td class="rk">${String(i+1).padStart(2,'0')}</td><td>${esc(r.n)}</td><td class="${r.s>=0?'up':'down'}">${r.s>=0?'+':''}${r.s.toFixed(2)}%</td></tr>`).join('')+'</table></div>';
}
setInterval(()=>{const e=$('#cdown');if(e&&$('#challenge').classList.contains('on'))renderChallenge()},30000);

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
  const wp=weekPct(),rk=$('#rank').textContent,st=streak();
  g.fillStyle=mu;g.font='500 40px Inter,sans-serif';g.fillText('My practice portfolio this week',80,420);
  g.fillStyle=wp>=0?ac:'#ff5c7a';g.font='800 150px Inter,sans-serif';g.fillText((wp>=0?'+':'')+wp.toFixed(2)+'%',80,580);
  g.fillStyle=fg;g.font='600 52px Inter,sans-serif';g.fillText(`rank ${rk}  ·  streak ${st} day${st===1?'':'s'}`,80,700);
  g.fillStyle=mu;g.font='400 31px Inter,sans-serif';g.fillText('A game for learning how owning a piece of a business works.',80,820);g.fillText('Fictional businesses. Not an investment.',80,870);
  g.fillStyle=ac;g.font='500 34px "JetBrains Mono",monospace';g.fillText(SITE.replace('https://',''),80,980);
  return c;
}
async function shareCard(){
  const c=makeCard(),blob=await new Promise(r=>c.toBlob(r,'image/png')),file=new File([blob],'kobo-share-practice.png',{type:'image/png'});
  const text=`My practice portfolio on Kobo Share (practice · no real money). ${SITE}`;
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text,title:'Kobo Share practice card'});return}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Practice card downloaded');
}
$('#share').onclick=shareCard;
if(S.last===today()&&(S.cd||[]).includes(today()))$('#share').hidden=false;

// ---- Admin view (?admin=1): counts by source, local data only ----
if(QS.get('admin')==='1'){
  const cnt=a=>a.reduce((m,x)=>(m[x.src||'unknown']=(m[x.src||'unknown']||0)+1,m),{});
  const wl=cnt(S.wlList),bz=cnt(S.biz),keys=[...new Set([...Object.keys(wl),...Object.keys(bz)])];
  const d=document.createElement('section');d.className='card admin';d.id='admin';
  d.innerHTML=`<h2>Admin · sign-ups by source</h2><p class="tiny muted">Local only: these counts come from this browser's localStorage, not a server. Current visit source: <b>${esc(SRC)}</b>.</p>`+
   (keys.length?'<table><tr><th>Source</th><th>Early list</th><th>Business interest</th></tr>'+keys.map(k=>`<tr><td>${esc(k)}</td><td>${wl[k]||0}</td><td>${bz[k]||0}</td></tr>`).join('')+`<tr><td><b>Total</b></td><td><b>${S.wlList.length}</b></td><td><b>${S.biz.length}</b></td></tr></table>`:'<p class="tiny muted">No entries yet.</p>');
  document.querySelector('main').prepend(d);
}
