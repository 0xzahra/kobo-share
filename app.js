'use strict';
// All money is integer kobo (₦1 = 100 kobo). Practice credits only — not real money.
const N = n => n * 100; // naira -> kobo
const START = N(500000);
const BIZ = [
  {id:'recharge',e:'📱',name:'Mama Tolu Recharge & Data Kiosk',city:'Lagos',area:'Yaba',price:N(5000),slots:200,min:N(-20),max:N(90),bad:.12},
  {id:'zobo',e:'🍹',name:'Chilled Zobo & Chapman Stand',city:'Lagos',area:'Surulere',price:N(3000),slots:250,min:N(-30),max:N(70),bad:.18},
  {id:'pos',e:'💳',name:'Express POS Stand',city:'Abuja',area:'Wuse',price:N(10000),slots:150,min:N(-60),max:N(200),bad:.1},
  {id:'buka',e:'🍲',name:'Iya Basira Buka (Mama Put)',city:'Lagos',area:'Ikeja',price:N(8000),slots:200,min:N(-80),max:N(170),bad:.15},
  {id:'barber',e:'💈',name:'Fresh Cut Barbing Salon',city:'Port Harcourt',area:'GRA',price:N(7000),slots:150,min:N(-40),max:N(140),bad:.14},
  {id:'carwash',e:'🚗',name:'Sparkle Car Wash',city:'Abuja',area:'Gwarinpa',price:N(12000),slots:120,min:N(-120),max:N(260),bad:.2},
  {id:'event',e:'🎉',name:'Owambe Event Centre',city:'Lagos',area:'Lekki',price:N(25000),slots:100,min:N(-400),max:N(700),bad:.35},
  {id:'solar',e:'☀️',name:'Solar Phone Charging Hub',city:'Kano',area:'Sabon Gari',price:N(6000),slots:180,min:N(-15),max:N(110),bad:.08},
  {id:'tailor',e:'🧵',name:'Aisha Fashion & Tailor Shop',city:'Kano',area:'Kofar Mata',price:N(9000),slots:140,min:N(-50),max:N(170),bad:.16},
  {id:'suya',e:'🍢',name:'Mallam Suya Spot',city:'Port Harcourt',area:'D-Line',price:N(4000),slots:220,min:N(-25),max:N(95),bad:.13},
];
const BYID = Object.fromEntries(BIZ.map(b => [b.id, b]));
const KEY = 'koboShare.v1';
const today = () => Math.floor((Date.now() + 3600e3) / 864e5); // Lagos day index (UTC+1)

// Deterministic PRNG from string seed
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Per-slot payout for a business on a given day (kobo, may be negative or zero)
function payout(b, day){
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
function fresh(){return {cash:START,lots:[],hist:[],last:today(),biz:[],wl:null,created:today()}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Number.isInteger(s.cash))return s}catch(e){}return fresh()}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}

const fmt = k => (k<0?'-':'')+'₦'+(Math.abs(k)/100).toLocaleString('en-NG',{minimumFractionDigits:0,maximumFractionDigits:2});
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2600)}

function held(id){return S.lots.filter(l=>l.id===id).reduce((a,l)=>a+l.q,0)}
function soldOut(b){return Math.max(0, Math.floor(b.slots*0.45) + Math.floor(rng('so'+b.id)()*b.slots*0.3))} // simulated other owners
function holdingsValue(){return S.lots.reduce((a,l)=>a+l.q*value(BYID[l.id],today()),0)}
function netWorth(){return S.cash+holdingsValue()}

function pending(){
  const t=today(); let total=0, days=[];
  for(let d=S.last+1; d<=t && d<=S.last+30; d++){
    let dayTot=0, rows=[];
    for(const l of S.lots){ if(l.d>=d) continue; const p=payout(BYID[l.id],d)*l.q; dayTot+=p; rows.push([l.id,p]); }
    if(rows.length) days.push({d,amt:dayTot,rows}); total+=dayTot;
  }
  return {total,days,n:Math.min(t-S.last,30)};
}

function render(){
  const nw=netWorth(), pl=nw-START;
  $('#cash').textContent=fmt(S.cash); $('#nw').textContent=fmt(nw);
  $('#pl').innerHTML=`<span class="${pl>=0?'':'down'}" style="${pl>=0?'color:#9ff0c4':''}">${pl>=0?'+':''}${fmt(pl)}</span>`;
  const p=pending(), btn=$('#collect');
  if(p.n<=0){btn.disabled=true;btn.textContent='✅ Collected for today';$('#collectNote').textContent='Come back tomorrow (Lagos time) for the next payout. Patience na virtue 😄';}
  else if(!S.lots.length){btn.disabled=true;btn.textContent='Buy slots to start earning';$('#collectNote').textContent='Slots you buy today start earning from tomorrow.';}
  else{btn.disabled=false;btn.textContent=`Collect ${p.n} day${p.n>1?'s':''} payout`;$('#collectNote').textContent='Simulated payouts. Results vary and are not guaranteed.';}
  renderMarket(); renderPort(); renderHist(); renderBoard(nw);
}
function renderMarket(){
  const t=today();
  $('#listings').innerHTML=BIZ.map(b=>{
    const v=value(b,t), ch=Math.round((v-value(b,t-1))*10000/value(b,t-1))/100, taken=soldOut(b)+held(b.id), pct=Math.min(100,Math.round(taken*100/b.slots));
    return `<article class="card biz"><div class="h"><div class="emo">${b.e}</div><div><h3>${esc(b.name)}<span class="tag">example</span></h3><div class="loc">📍 ${b.area}, ${b.city}</div></div></div>
    <div class="kv"><div><small>Slot price today</small><b>${fmt(v)}</b> <span class="${ch>=0?'up':'down'} tiny">${ch>=0?'▲':'▼'}${Math.abs(ch)}%</span></div>
    <div><small>Daily / slot (not guaranteed)</small><b>${fmt(b.min)} – ${fmt(b.max)}</b></div>
    <div><small>Bad-day chance</small><b>~${Math.round(b.bad*100)}%</b></div><div><small>You own</small><b>${held(b.id)} slot${held(b.id)===1?'':'s'}</b></div></div>
    <div class="bar"><i style="width:${pct}%"></i></div><div class="tiny muted">${taken}/${b.slots} slots taken</div>
    <button class="btn" data-buy="${b.id}" ${taken>=b.slots?'disabled':''}>${taken>=b.slots?'Sold out':'Own am small small →'}</button></article>`}).join('');
}
function renderPort(){
  const ids=[...new Set(S.lots.map(l=>l.id))];
  if(!ids.length){$('#port').innerHTML='<div class="card empty">💼 You never buy any slot yet.<br>Go Market, pick one wey sweet you.</div>';return}
  const t=today();
  $('#port').innerHTML='<div class="card"><table><tr><th>Business</th><th>Slots</th><th>Cost</th><th>Value</th><th></th></tr>'+ids.map(id=>{
    const b=BYID[id], q=held(id), cost=S.lots.filter(l=>l.id===id).reduce((a,l)=>a+l.q*l.p,0), v=q*value(b,t);
    return `<tr><td>${b.e} ${esc(b.name.split(' ').slice(0,3).join(' '))}</td><td>${q}</td><td>${fmt(cost)}</td><td class="${v>=cost?'up':'down'}">${fmt(v)}</td><td><button class="btn ghost tiny" data-sell="${id}">Sell</button></td></tr>`}).join('')+
    `</table><p class="tiny muted">Total holdings: <b>${fmt(holdingsValue())}</b> · valuations fluctuate daily.</p></div>`;
}
function renderHist(){
  if(!S.hist.length){$('#hist').innerHTML='<div class="card empty">📜 No payout yet. Buy slots, come back tomorrow, collect.</div>';return}
  $('#hist').innerHTML='<div class="card"><table><tr><th>Date</th><th>What</th><th>Amount</th></tr>'+S.hist.slice(0,80).map(h=>
    `<tr><td>${new Date(h.d*864e5).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td>${esc(h.t)}</td><td class="${h.a>0?'up':h.a<0?'down':''}">${h.a>0?'+':''}${fmt(h.a)}</td></tr>`).join('')+'</table></div>';
}
const BOTS=['Chidi_Lagos','AmakaBuys','Musa.Kano','TundeOwnsAm','Ngozi PH','Halima_Abj','Emeka Big Boy','Zainab 💅','Seyi Hustle'];
function renderBoard(nw){
  const t=today(); const rows=BOTS.map((n,i)=>({n,v:START+Math.round((rng('bot'+i+t)()-.35)*N(60000))+i*N(1500)*((t%7)+1)}));
  rows.push({n:'You 🫵',v:nw,me:1}); rows.sort((a,b)=>b.v-a.v);
  $('#rank').textContent='#'+(rows.findIndex(r=>r.me)+1)+' / '+rows.length;
  $('#lb').innerHTML='<div class="card"><p class="tiny muted">Practice leaderboard (sample players are simulated).</p><table><tr><th>#</th><th>Player</th><th>Net worth</th></tr>'+
    rows.map((r,i)=>`<tr style="${r.me?'background:#fff8e1;font-weight:700':''}"><td>${['🥇','🥈','🥉'][i]||i+1}</td><td>${esc(r.n)}</td><td>${fmt(r.v)}</td></tr>`).join('')+'</table></div>';
}

function sheet(html){const m=$('#modal');m.innerHTML=`<div class="sheet">${html}</div>`;m.hidden=false}
function closeSheet(){$('#modal').hidden=true}
function qtySheet(b,mode){
  const v=value(b,today()), max= mode==='buy' ? Math.min(Math.floor(S.cash/v), b.slots-soldOut(b)-held(b.id)) : held(b.id);
  if(max<1){toast(mode==='buy'?'Your practice credits no reach o 😅':'You no get slot to sell');return}
  sheet(`<h2>${b.e} ${mode==='buy'?'Buy':'Sell'} slots</h2><p class="muted">${esc(b.name)} · ${fmt(v)} per slot today</p>
  <div class="qty"><button data-q="-1">−</button><input id="q" type="number" min="1" max="${max}" value="1" inputmode="numeric"><button data-q="1">+</button></div>
  <p>Total: <b id="tot">${fmt(v)}</b> <span class="tiny muted">(practice credits, max ${max})</span></p>
  ${mode==='buy'?'<p class="tiny muted">Earnings not guaranteed. Bad days fit happen. Starts earning tomorrow.</p>':''}
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
  S.hist.unshift({d:today(),t:`Bought ${n} × ${b.name}`,a:-c});save();render();toast(`🎉 You don own ${n} slot${n>1?'s':''}!`)}
function sell(b,n,v){let left=n;for(const l of S.lots.filter(l=>l.id===b.id)){const k=Math.min(l.q,left);l.q-=k;left-=k;if(!left)break}
  S.lots=S.lots.filter(l=>l.q>0);S.cash+=n*v;S.hist.unshift({d:today(),t:`Sold ${n} × ${b.name}`,a:n*v});save();render();toast(`💱 Sold for ${fmt(n*v)}`)}
function collect(){
  const p=pending(); if(p.n<=0) return;
  for(const day of p.days){ for(const [id,a] of agg(day.rows)) S.hist.unshift({d:day.d,t:`${BYID[id].e} ${a<0?'Bad day':a===0?'No sales':'Payout'} · ${BYID[id].name}`,a}); }
  S.cash+=p.total; S.last=today(); save(); render();
  toast(p.total>0?`💰 Collected ${fmt(p.total)}! E don land.`:p.total<0?`😬 Rough day: ${fmt(p.total)}. Business na so.`:'😐 Nothing today. Tomorrow go better.');
}
function agg(rows){const m=new Map();for(const[id,a]of rows)m.set(id,(m.get(id)||0)+a);return m}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-buy],[data-sell]'); if(!t) return;
  if(t.dataset.tab){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.id===t.dataset.tab))}
  if(t.dataset.buy) qtySheet(BYID[t.dataset.buy],'buy');
  if(t.dataset.sell) qtySheet(BYID[t.dataset.sell],'sell');
});
$('#collect').onclick=collect;
$('#reset').onclick=()=>{if(confirm('Reset your practice account? All practice slots and history go clear.')){S=fresh();save();render();toast('Fresh start: ₦500,000 practice credits')}};
$('#bizForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));S.biz.push({...f,at:Date.now()});save();e.target.reset();$('#bizMsg').textContent="✅ Saved on this device. We'll review am — thank you!"};
$('#wlForm').onsubmit=e=>{e.preventDefault();S.wl=new FormData(e.target).get('email');save();e.target.reset();$('#wlMsg').textContent='✅ You dey the list (saved locally on this device only).'};
save(); render();
