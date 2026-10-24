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
// Streak: consecutive Lagos days with a collect
function streak(){const c=S.cd||[],t=today();let d=c.includes(t)?t:t-1,n=0;while(c.includes(d)){n++;d--}return n}

function render(){
  const nw=netWorth(), pl=nw-START;
  countTo($('#cash'),S.cash); countTo($('#nw'),nw);
  $('#pl').innerHTML=`<span class="${pl>=0?'up':'down'}">${pl>=0?'▲ +':'▼ '}${fmt(pl)}</span> <span class="mono">all time</span>`;
  const st=streak(), c=S.cd||[], t=today();
  $('#streakN').textContent=st; $('#streak').classList.toggle('on',st>0);
  $('#week').innerHTML=[6,5,4,3,2,1,0].map(i=>`<i class="${c.includes(t-i)?'y':''} ${i===0?'t':''}"></i>`).join('');
  const p=pending(), btn=$('#collect'), lbl=btn.querySelector('.lbl');
  if(p.n<=0){btn.disabled=true;lbl.textContent='Collected for today';$('#collectNote').textContent='Next payout unlocks tomorrow (Lagos time). Patience na virtue.';}
  else if(!S.lots.length){btn.disabled=true;lbl.textContent='Buy slots to start earning';$('#collectNote').textContent='Slots you buy today start earning from tomorrow.';}
  else{btn.disabled=false;lbl.textContent=`Collect ${p.n} day${p.n>1?'s':''} payout`;$('#collectNote').textContent='Simulated payouts. Results vary and are not guaranteed.';}
  renderMarket(); renderPort(); renderHist(); renderBoard(nw);
}
function renderMarket(){
  const t=today();
  $('#listings').innerHTML=BIZ.map((b,i)=>{
    const v=value(b,t), ch=Math.round((v-value(b,t-1))*10000/value(b,t-1))/100, taken=soldOut(b)+held(b.id), pct=Math.min(100,Math.round(taken*100/b.slots)), h=held(b.id);
    return `<article class="card biz" style="animation-delay:${i*40}ms"><div class="h"><div class="av">${ini(b.name)}</div><div><h3>${esc(b.name)}<span class="tag">example</span></h3><div class="loc">${b.area}, ${b.city}</div></div></div>
    <div class="price"><b>${fmt(v)}</b><span class="${ch>=0?'up':'down'} tiny mono">${ch>=0?'▲':'▼'} ${Math.abs(ch)}%</span><span class="tiny muted">per slot today</span></div>
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
  $('#port').innerHTML='<div class="card"><table><tr><th>Business</th><th>Slots</th><th>Cost</th><th>Value</th><th></th></tr>'+ids.map(id=>{
    const b=BYID[id], q=held(id), cost=S.lots.filter(l=>l.id===id).reduce((a,l)=>a+l.q*l.p,0), v=q*value(b,t);
    return `<tr><td>${esc(b.name.split(' ').slice(0,3).join(' '))}</td><td>${q}</td><td>${fmt(cost)}</td><td class="${v>=cost?'up':'down'}">${fmt(v)}</td><td><button class="btn ghost tiny" data-sell="${id}">Sell</button></td></tr>`}).join('')+
    `</table><p class="tiny muted">Total holdings: <b>${fmt(holdingsValue())}</b> · valuations fluctuate daily.</p></div>`;
}
function renderHist(){
  if(!S.hist.length){$('#hist').innerHTML=empty('No payouts yet.<br>Buy slots, come back tomorrow, collect.');return}
  $('#hist').innerHTML='<div class="card"><table><tr><th>Date</th><th>What</th><th>Amount</th></tr>'+S.hist.slice(0,80).map(h=>
    `<tr><td class="rk">${new Date(h.d*864e5).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td>${esc(h.t)}</td><td class="${h.a>0?'up':h.a<0?'down':''}">${h.a>0?'+':''}${fmt(h.a)}</td></tr>`).join('')+'</table></div>';
}
const BOTS=['Chidi_Lagos','AmakaBuys','Musa.Kano','TundeOwnsAm','Ngozi PH','Halima_Abj','Emeka Big Boy','Zainab K','Seyi Hustle'];
function renderBoard(nw){
  const t=today(); const rows=BOTS.map((n,i)=>({n,v:START+Math.round((rng('bot'+i+t)()-.35)*N(60000))+i*N(1500)*((t%7)+1)}));
  rows.push({n:'You',v:nw,me:1}); rows.sort((a,b)=>b.v-a.v);
  $('#rank').textContent='#'+(rows.findIndex(r=>r.me)+1)+'/'+rows.length;
  $('#lb').innerHTML='<div class="card"><p class="tiny muted">Practice leaderboard (sample players are simulated).</p><table><tr><th>#</th><th>Player</th><th>Net worth</th></tr>'+
    rows.map((r,i)=>`<tr class="${r.me?'me':''}"><td class="rk">${String(i+1).padStart(2,'0')}</td><td>${esc(r.n)}</td><td>${fmt(r.v)}</td></tr>`).join('')+'</table></div>';
}

function sheet(html){const m=$('#modal');m.innerHTML=`<div class="sheet">${html}</div>`;m.hidden=false}
function closeSheet(){$('#modal').hidden=true}
function qtySheet(b,mode){
  const v=value(b,today()), max= mode==='buy' ? Math.min(Math.floor(S.cash/v), b.slots-soldOut(b)-held(b.id)) : held(b.id);
  if(max<1){toast(mode==='buy'?'Your practice credits no reach o':'You have no slots to sell');return}
  sheet(`<h2>${mode==='buy'?'Buy':'Sell'} slots</h2><p class="muted">${esc(b.name)} · ${fmt(v)} per slot today</p>
  <div class="qty"><button data-q="-1">−</button><input id="q" type="number" min="1" max="${max}" value="1" inputmode="numeric"><button data-q="1">+</button></div>
  <p>Total: <b id="tot">${fmt(v)}</b> <span class="tiny muted">(practice credits, max ${max})</span></p>
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
  S.hist.unshift({d:today(),t:`Bought ${n} × ${b.name}`,a:-c});save();render();toast(`You now own ${n} slot${n>1?'s':''}`)}
function sell(b,n,v){let left=n;for(const l of S.lots.filter(l=>l.id===b.id)){const k=Math.min(l.q,left);l.q-=k;left-=k;if(!left)break}
  S.lots=S.lots.filter(l=>l.q>0);S.cash+=n*v;S.hist.unshift({d:today(),t:`Sold ${n} × ${b.name}`,a:n*v});save();render();toast(`Sold for ${fmt(n*v)}`)}
function burst(el){if(reduce)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<18;i++){const c=document.createElement('i');c.className='coin';const a=Math.random()*Math.PI*2,d=60+Math.random()*90;
    c.style.cssText=`left:${cx}px;top:${cy}px;--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d-40}px;animation-delay:${i*12}ms`;document.body.appendChild(c);setTimeout(()=>c.remove(),1200)}
  navigator.vibrate&&navigator.vibrate(18)}
function collect(){
  const p=pending(); if(p.n<=0) return;
  for(const day of p.days){ for(const [id,a] of agg(day.rows)) S.hist.unshift({d:day.d,t:`${a<0?'Bad day':a===0?'No sales':'Payout'} · ${BYID[id].name}`,a}); }
  S.cash+=p.total; S.last=today(); S.cd=[...(S.cd||[]).filter(d=>d>today()-60),today()]; save();
  const btn=$('#collect'); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); if(p.total>0) burst(btn);
  render();
  toast(p.total>0?`+${fmt(p.total)} collected. E don land.`:p.total<0?`Rough day: ${fmt(p.total)}. Business na so.`:'Nothing today. Tomorrow go better.');
}
function agg(rows){const m=new Map();for(const[id,a]of rows)m.set(id,(m.get(id)||0)+a);return m}

function movePill(){const on=$('.tabs button.on'),pill=$('.pill');if(!on)return;pill.style.width=on.offsetWidth+'px';pill.style.transform=`translateX(${on.offsetLeft-6}px)`}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-buy],[data-sell]'); if(!t) return;
  if(t.dataset.tab){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.id===t.dataset.tab));movePill();
    const top=$('.panes').getBoundingClientRect().top+scrollY-90; if(scrollY>top) scrollTo({top,behavior:'smooth'})}
  if(t.dataset.buy) qtySheet(BYID[t.dataset.buy],'buy');
  if(t.dataset.sell) qtySheet(BYID[t.dataset.sell],'sell');
});
addEventListener('resize',movePill);
$('#collect').onclick=collect;
$('#reset').onclick=()=>{if(confirm('Reset your practice account? All practice slots and history will be cleared.')){S=fresh();save();render();toast('Fresh start: ₦500,000 practice credits')}};
$('#bizForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));S.biz.push({...f,at:Date.now()});save();e.target.reset();$('#bizMsg').textContent="Saved on this device. We'll review it, thank you."};
$('#wlForm').onsubmit=e=>{e.preventDefault();S.wl=new FormData(e.target).get('email');save();e.target.reset();$('#wlMsg').textContent="You're on the list (saved locally on this device only)."};
// Theme: follows system by default, remembers explicit choice
const TKEY='koboShare.theme', root=document.documentElement;
function setTheme(t){root.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='light'?'#f4f6f5':'#05070a'}
setTheme(root.dataset.theme||'dark');
$('#theme').onclick=()=>{const t=root.dataset.theme==='light'?'dark':'light';setTheme(t);try{localStorage.setItem(TKEY,t)}catch(e){}};
matchMedia('(prefers-color-scheme: light)').addEventListener('change',e=>{if(!localStorage.getItem(TKEY))setTheme(e.matches?'light':'dark')});
save(); requestAnimationFrame(movePill);
setTimeout(()=>{$('#listings').classList.add('first');render();movePill();setTimeout(()=>$('#listings').classList.remove('first'),1200)}, reduce?0:350); // brief shimmer skeleton on first paint
