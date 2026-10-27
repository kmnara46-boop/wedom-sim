const SYMS = ['BTCUSDT']; // 2026-10-28: 비트코인 전용 (ETH·XRP 제외)
const NAME = {BTCUSDT:'비트코인',ETHUSDT:'이더리움',XRPUSDT:'리플'};
const DEF = {start:'2026-09-28T21:00', capital:10000, mode:2, boxN:5, biasHi:0.75, biasLo:0.1, capDrop:0, core:0.3, oppTpMin:0.3, adapt:1, riskHi:60, tpTight:'0.5,0.8,1.2', trend:1, bxX:2, bxN:8, bxSide:1, bxFol:0, bxDays:30, bxLag:24, bxMaxD:30, bxTrail:0, regAdx:25, regSlope:3, regConf:5, trendN:30, trendBand:2, trendPct:0.75, trendExit:1, rsiS:66, pbS:0.95, posS:0.8, rsiL:38, pbL:0.3, posL:0.2, useVwap:1, maxTr:5, trW:'1,1,2,2,4', lev:3, addGap:0.3, cool:30, tp:'1.5,3,4.5', tpFrac:0.3, flipMax:0.5, cutTr:4, stop:4, fee:0.04, session:0};
const PDESC = {start:['시작 시각 (KST)','datetime-local'], capital:['종목별 시작 자금 ($)'], mode:['전략 버전 (2=스윙 코어, 1=단타 역추세)'], boxN:['[v2] 박스 기간 (일)'], biasHi:['[v2] 숏 전환: N일 범위 위치 ≥'], biasLo:['[v2] 롱 전환: N일 범위 위치 ≤'], capDrop:['[v2] 롱 전환 최소 하락폭 (N일 고점 대비 %, 0=사용 안 함)'], adapt:['리스크 적응형 익절 (1=켬): 매크로 리스크가 기준 이상이면 짧은 익절 사용'], riskHi:['리스크 기준 점수 (이상이면 짧은 익절)'], tpTight:['리스크 높을 때 분할 익절 지점 (% 쉼표)','text'], bxX:['박스 이탈 기준 (30일 박스에서 ±%, 0=끔)'], bxN:['박스 이탈 확정: 15분봉 종가 연속 개수'], bxSide:['이탈 반대 방향만 손절·진입 금지 (1) / 전량 손절·관망 (0)'], bxFol:['이탈 방향 추종 진입 비중 (0=안 함, 1=1차 비중)'], bxDays:['이탈 판단용 박스 기간 (일)'], bxLag:['박스 계산에서 뺄 최근 시간 (시간)'], bxMaxD:['이탈 상태 최대 유지 (일)'], bxTrail:['추종 포지션 트레일링 청산 (%, 0=안 씀)'], trend:['추세 필터 (0=끔, 1=N일 신고가/신저가권, 2=N일 이동평균, 3=BTC 장분위기: 횡보장에서만 매매)'], regAdx:['[필터3] 추세 판단 ADX 기준 (이상이면 추세)'], regSlope:['[필터3] 20일선 10일 기울기 기준 (±%)'], regConf:['[필터3] 장분위기 전환 확인 일수'], trendN:['추세 필터 기간 N (일)'], trendBand:['[필터2] 이평 완충 구간 (±%, 이 안이면 박스로 보고 양방향 허용)'], trendPct:['[필터1] 범위 위치 기준 (0.85=상단 15% 안이면 상승추세)'], trendExit:['추세 반대 포지션 청산 (1/0)'], core:['[v2] 코어 유지 비중 (최대 물량 대비)'], oppTpMin:['[v2] 반대 극단 익절 최소 수익 (%)'], rsiS:['숏: 15분 RSI ≥'], pbS:['숏: 1시간 %B ≥'], posS:['숏: 24h 범위 위치 ≥ (0~1)'], rsiL:['롱: 15분 RSI ≤'], pbL:['롱: 1시간 %B ≤'], posL:['롱: 24h 범위 위치 ≤'], useVwap:['VWAP 조건 사용 (1/0)'], maxTr:['최대 분할 횟수'], trW:['분할 비중 (쉼표)','text'], lev:['최대 노출 배수 (실배율)'], addGap:['추가 진입 간격 (% 역행)'], cool:['추가 진입 최소 간격 (분)'], tp:['분할 익절 지점 (% 쉼표)','text'], tpFrac:['익절 1회당 비중 (최대 물량 대비)'], flipMax:['스위칭 허용 손실 (%)'], cutTr:['물량조절 시작 분할 수'], stop:['안전 손절 (% 역행)'], fee:['수수료 (% 편도)'], session:['방송시간(21~03시)만 진입 (1/0)']};
let P = Object.assign({}, DEF, JSON.parse(localStorage.getItem('wedomP')||'{}'));
const D = window.WEDOM_DATA || {events:[],news:[],timeline:[]};
function mergeEv(arr){ const k=e=>`${e.at}|${e.type}|${e.p?e.p.sym:''}|${e.p?e.p.side:''}`; const m=new Map((D.events||[]).map(e=>[k(e),e])); arr.forEach(e=>m.set(k(e),e)); D.events=[...m.values()].sort((a,b)=>a.at-b.at); }
function applyLive(L){ if(L&&L.macro&&L.macro.updatedAt&&(!D.macro||L.macro.updatedAt>(D.macro.updatedAt||0))) D.macro=L.macro; if(!L||!L.updatedAt||L.updatedAt<=(D.liveAt||D.updatedAt||0)) return false; if(L.events&&L.events.length) mergeEv(L.events); if(L.news){ const m=new Map((D.news||[]).map(n=>[n.id,n])); L.news.forEach(n=>m.set(n.id,n)); D.news=[...m.values()].sort((a,b)=>b.t-a.t); } D.liveAt=L.updatedAt; return true; }

function loadScript(src){ return new Promise(res=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>{ s.remove(); res(true); }; s.onerror=()=>{ s.remove(); res(false); }; document.head.appendChild(s); }); }
async function reloadLive(){ let ch=false; const prev=window.WEDOM_DATA;
  if(await loadScript('data.js?ts='+Date.now())){ const N=window.WEDOM_DATA; if(N && N!==prev && N.updatedAt>(D.updatedAt||0)){ if(N.events && N.events.length) mergeEv(N.events); if(N.news){ const m=new Map((D.news||[]).map(n=>[n.id,n])); N.news.forEach(n=>m.set(n.id,n)); D.news=[...m.values()].sort((a,b)=>b.t-a.t); } if(N.timeline&&N.timeline.length) D.timeline=N.timeline; if(N.macro&&N.macro.updatedAt&&(!D.macro||N.macro.updatedAt>(D.macro.updatedAt||0))) D.macro=N.macro; D.updatedAt=N.updatedAt; ch=true; } window.WEDOM_DATA=D; }
  if(await loadScript('live.js?ts='+Date.now())) ch = applyLive(window.WEDOM_LIVE) || ch;
  return ch; }
// ---- 더따리 API 직접 조회: 페이지 열거나 새로고침하면 PC 작업(5분 주기)을 기다리지 않고 바로 최신 웨돔 매매·뉴스를 가져옴 ----
const DDARI='https://api.theddari.com/graphql';
async function gql(query, variables){ const r=await fetch(DDARI,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),cache:'no-store'}); if(!r.ok) throw new Error('theddari '+r.status); const j=await r.json(); if(j.errors) throw new Error(j.errors[0].message); return j.data; }
const evKey = e => `${e.at}|${e.type}|${e.p?e.p.sym:''}|${e.p?e.p.side:''}`;
const mapEv = e => ({at:e.at, type:e.type, video:e.videoTitle, videoId:e.videoId, ex:e.exchange, p:e.position?{sym:e.position.rawSymbol, side:e.position.side, size:e.position.size, entry:e.position.entryPrice, lev:e.position.leverage}:null, prev:e.previous?e.previous.size:null, mark:e.markPrice, exit:e.exitPrice, pnl:e.pnlUsd, pnlPct:e.pnlPct});
const NEWS_MACRO=['rates_fed','inflation_cpi','geopolitics_war','regulation_policy','bonds','fx','politics_election','crypto','jobs_labor','gdp_macro','tariff_trade','macro'], NEWS_WEAK=['oil_commodities','equity_index','ai'];
const NEWS_KW=/비트|BTC|Bitcoin|크립토|가상자산|암호화폐|이더리움|ETH|XRP|리플|스테이블|연준|파월|FOMC|CPI|금리|관세/i;
let directAt=0, directBusy=null;
async function fetchDirect(){ if(directBusy) return directBusy; directBusy=(async()=>{ let ch=false;
  // 이벤트: 최신부터 내려가며 이미 가진 시점까지만 받음 (보통 1페이지)
  const eq='query BjLiveEvents($handle: String, $kind: String, $before: String, $limit: Int) { bjLiveEvents(handle: $handle, kind: $kind, before: $before, limit: $limit) { result message data } }';
  const have=new Set((D.events||[]).map(evKey)); const lastAt=Math.max(0,...(D.events||[]).map(e=>e.at)); const got=[]; let before=null;
  for(let i=0;i<(lastAt?20:300);i++){ const v={handle:'wedombtc',kind:'all',limit:50}; if(before) v.before=before; const d=(await gql(eq,v)).bjLiveEvents.data; const evs=(d&&d.events)||[]; evs.forEach(e=>got.push(mapEv(e))); if(!d||!d.nextCursor||!evs.length) break; if(lastAt && Math.min(...evs.map(e=>e.at))<=lastAt) break; before=String(d.nextCursor); }
  const add=got.filter(e=>!have.has(evKey(e))); if(add.length){ const m=new Map((D.events||[]).map(e=>[evKey(e),e])); add.forEach(e=>m.set(evKey(e),e)); D.events=[...m.values()].sort((a,b)=>a.at-b.at); ch=true; }
  // 뉴스: PC 작업과 같은 조건
  const nq='query NewsTimeline($hours: Int, $region: String, $category: String, $minBreakingScore: Int, $keyword: String, $cursor: String, $limit: Int) { newsTimeline(hours: $hours, region: $region, category: $category, minBreakingScore: $minBreakingScore, keyword: $keyword, cursor: $cursor, limit: $limit) { items { id publishedAt title titleKo url sourceLabel region categories breakingScore keywords aiImpact aiSentiment } } }';
  const nm=new Map((D.news||[]).map(n=>[n.id,n])); const n0=nm.size;
  const res=await Promise.allSettled([{hours:24,region:'CRYPTO',limit:200},{hours:24,minBreakingScore:60,limit:200},{hours:6,minBreakingScore:45,limit:200},{hours:24,keyword:'비트코인',limit:100}].map(v=>gql(nq,v)));
  for(const r of res){ if(r.status!=='fulfilled') continue; for(const n of (r.value.newsTimeline.items||[])){ if(!n||nm.has(n.id)) continue; const cats=n.categories||[]; const title=n.titleKo||n.title;
    const rel=n.region==='CRYPTO'||cats.some(c=>NEWS_MACRO.includes(c))||(cats.some(c=>NEWS_WEAK.includes(c))&&n.breakingScore>=65)||NEWS_KW.test(title); if(!rel) continue;
    nm.set(n.id,{id:n.id,t:Date.parse(n.publishedAt),title,url:n.url,src:n.sourceLabel,region:n.region,cats,score:n.breakingScore,impact:n.aiImpact,senti:n.aiSentiment,kw:n.keywords||[]}); } }
  if(nm.size>n0){ D.news=[...nm.values()].sort((a,b)=>b.t-a.t); ch=true; }
  directAt=Date.now(); return ch; })().finally(()=>{ directBusy=null; }); return directBusy; }
function dataAt(){ return Math.max(D.liveAt||0, D.updatedAt||0, directAt); }
const KST = 9*3600e3, M5 = 300e3, H1 = 3600e3;
const $ = id => document.getElementById(id);
const fmt = (x,d=2) => x==null||!isFinite(x) ? '-' : Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pfmt = p => p>=1000? fmt(p,1) : p>=10? fmt(p,2) : fmt(p,4);
const kst = t => { const d=new Date(t+KST); return `${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`; };
const cls = x => x>0?'up':x<0?'down':'';
const startMs = () => Date.parse(P.start+':00+09:00');


const K={};
// ---------------- indicators ----------------
function agg(bars, ms){ const out=[]; let cur=null; for(const b of bars){ const t=Math.floor(b.t/ms)*ms; if(!cur||cur.t!==t){ cur={t,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v}; out.push(cur);} else { cur.h=Math.max(cur.h,b.h); cur.l=Math.min(cur.l,b.l); cur.c=b.c; cur.v+=b.v; } } return out; }
function ema(a,n){ const k=2/(n+1); let e=null; return a.map((v,i)=>{ e = e===null? v : v*k+e*(1-k); return i>=n-1? e:null; }); }
function rsi(c,n=14){ const o=[null]; let ag=0,al=0; for(let i=1;i<c.length;i++){ const d=c[i]-c[i-1],g=Math.max(d,0),l=Math.max(-d,0); if(i<=n){ag+=g/n;al+=l/n;o.push(i===n?100-100/(1+ag/(al||1e-9)):null);} else {ag=(ag*(n-1)+g)/n; al=(al*(n-1)+l)/n; o.push(100-100/(1+ag/(al||1e-9)));} } return o; }
function boll(c,n=20,k=2){ const out=new Array(c.length).fill(null); let s=0,s2=0; for(let i=0;i<c.length;i++){ s+=c[i]; s2+=c[i]*c[i]; if(i>=n){ s-=c[i-n]; s2-=c[i-n]*c[i-n]; } if(i>=n-1){ const m=s/n, sd=Math.sqrt(Math.max(s2/n-m*m,0)); out[i]={m,up:m+k*sd,lo:m-k*sd}; } } return out; }
function stoch(r,n=14){ return r.map((v,i)=>{ if(v==null||i<n) return null; let mn=1e9,mx=-1e9; for(let j=i-n+1;j<=i;j++){ if(r[j]==null) return null; mn=Math.min(mn,r[j]); mx=Math.max(mx,r[j]); } return mx>mn?(v-mn)/(mx-mn)*100:50; }); }
function sma(a,n){ return a.map((v,i)=>{ if(i<n-1||a.slice(i-n+1,i+1).some(x=>x==null)) return null; return a.slice(i-n+1,i+1).reduce((x,y)=>x+y,0)/n; }); }
function indi(bars){ const c=bars.map(b=>b.c); const r=rsi(c); const st=sma(stoch(r),3); return {rsi:r, bb:boll(c), st, ema50:ema(c,50)}; }
function vwapSeries(m5){ const out=[]; let day=-1,pv=0,vv=0; for(const b of m5){ const d=Math.floor(b.t/86400e3); if(d!==day){day=d;pv=0;vv=0;} pv+=(b.h+b.l+b.c)/3*b.v; vv+=b.v; out.push(vv?pv/vv:b.c); } return out; }

// ---------------- simulation ----------------
// Generic engine: works on any base timeframe (5m live, 15m/5m backtests)
function featuresBars(base, h1, ms){
  const m15 = ms<900e3 ? agg(base,900e3) : base; const I15=indi(m15), I1=indi(h1);
  const vw=vwapSeries(base);
  const F=new Array(base.length);
  let j15=-1, j1=-1;
  const W=Math.max(1,Math.round(86400e3/ms)), dqH=[], dqL=[];
  for(let i=0;i<base.length;i++){
    const b=base[i], tc=b.t+ms;
    while(j15+1<m15.length && m15[j15+1].t+900e3<=tc) j15++;
    while(j1+1<h1.length && h1[j1+1].t+H1<=tc) j1++;
    while(dqH.length&&base[dqH[dqH.length-1]].h<=b.h) dqH.pop(); dqH.push(i); while(dqH[0]<=i-W) dqH.shift();
    while(dqL.length&&base[dqL[dqL.length-1]].l>=b.l) dqL.pop(); dqL.push(i); while(dqL[0]<=i-W) dqL.shift();
    const hi=base[dqH[0]].h, lo=base[dqL[0]].l;
    const bb=j1>=0?I1.bb[j1]:null;
    F[i]={rsi15: j15>=0?I15.rsi[j15]:null, pB: bb&&bb.up>bb.lo?(b.c-bb.lo)/(bb.up-bb.lo):null, st1h: j1>=0?I1.st[j1]:null, pos24: hi>lo?(b.c-lo)/(hi-lo):0.5, vwap: vw[i]?(b.c/vw[i]-1)*100:0, hi24:hi, lo24:lo};
  }
  return F;
}
function features(sym){ return featuresBars(K[sym].m5, K[sym].h1, M5); }
function boxBars(base, h1, ms, N){ const W=N*24; const hiA=[], loA=[], dqH=[], dqL=[];
  for(let i=0;i<h1.length;i++){ while(dqH.length&&h1[dqH[dqH.length-1]].h<=h1[i].h) dqH.pop(); dqH.push(i); while(dqH[0]<=i-W) dqH.shift(); while(dqL.length&&h1[dqL[dqL.length-1]].l>=h1[i].l) dqL.pop(); dqL.push(i); while(dqL[0]<=i-W) dqL.shift(); hiA.push(h1[dqH[0]].h); loA.push(h1[dqL[0]].l); }
  const out=new Array(base.length).fill(null); let j=-1;
  for(let i=0;i<base.length;i++){ const tc=base[i].t+ms; while(j+1<h1.length&&h1[j+1].t+H1<=tc) j++; if(j<W) continue; const hi=Math.max(hiA[j],base[i].h), lo=Math.min(loA[j],base[i].l); out[i]={p:hi>lo?(base[i].c-lo)/(hi-lo):0.5, hi, lo}; }
  return out; }
function boxSeries(sym, N){ return boxBars(K[sym].m5, K[sym].h1, M5, N); }
// ---- BTC 장분위기 (강세/횡보/약세) : 일봉 기준 ----
const REGNAME={BULL:'강세장',SIDE:'횡보장',BEAR:'약세장'};
function classifyRegime(d, PP){ const adxMin=+(PP.regAdx??25), slp=+(PP.regSlope??3), conf=Math.max(1,+(PP.regConf??5));
  const c=d.map(b=>b.c), e50=ema(c,50), e20=ema(c,20); const n=14; let tr=0,pdm=0,mdm=0,adx=null; const dxs=[]; const out=[]; let st='SIDE', cand=null, cc=0;
  for(let i=0;i<d.length;i++){ let pdi=null,mdi=null;
    if(i>0){ const up=d[i].h-d[i-1].h, dn=d[i-1].l-d[i].l; const p=(up>dn&&up>0)?up:0, m=(dn>up&&dn>0)?dn:0; const t=Math.max(d[i].h-d[i].l,Math.abs(d[i].h-d[i-1].c),Math.abs(d[i].l-d[i-1].c));
      if(i<=n){ tr+=t; pdm+=p; mdm+=m; } else { tr=tr-tr/n+t; pdm=pdm-pdm/n+p; mdm=mdm-mdm/n+m; }
      if(i>=n){ pdi=100*pdm/(tr||1); mdi=100*mdm/(tr||1); const dx=100*Math.abs(pdi-mdi)/((pdi+mdi)||1); if(adx==null){ dxs.push(dx); if(dxs.length===n) adx=dxs.reduce((a,b)=>a+b)/n; } else adx=(adx*(n-1)+dx)/n; } }
    const slope=(e20[i]!=null&&i>=10&&e20[i-10]!=null)?(e20[i]/e20[i-10]-1)*100:null;
    let raw='SIDE'; if(e50[i]!=null&&adx!=null&&slope!=null){ if(c[i]>e50[i]&&slope>slp&&adx>=adxMin&&pdi>mdi) raw='BULL'; else if(c[i]<e50[i]&&slope<-slp&&adx>=adxMin&&mdi>pdi) raw='BEAR'; }
    if(raw!==st){ if(raw===cand) cc++; else { cand=raw; cc=1; } if(cc>=conf){ st=raw; cand=null; cc=0; } } else { cand=null; cc=0; }
    out.push({t:d[i].t, c:c[i], reg:st, raw, adx, pdi, mdi, e50:e50[i], slope, pend: cand && cand!==st ? {to:cand, n:cc, need:conf} : null}); }
  return out; }
let BTCD = null; // BTC 일봉 (실시간 모의매매용)
// 매크로 리스크 점수 (VIX, OVX, MOVE 1년 백분위 + 브렌트 20일 상승률 백분위) 일별 시계열
function riskDaily(M){ if(!M) return []; const keys=['VIX','OVX','MOVE','BRENT']; const per={};
  for(const k of keys){ const s=M[k]; if(!s||s.length<120) continue; const m=new Map();
    for(let i=60;i<s.length;i++){ let v, w; if(k==='BRENT'){ if(i<20) continue; v=(s[i][1]/s[i-20][1]-1)*100; w=[]; for(let j=Math.max(20,i-364);j<=i;j++) w.push((s[j][1]/s[j-20][1]-1)*100); } else { v=s[i][1]; w=s.slice(Math.max(0,i-364),i+1).map(x=>x[1]); } let c=0; for(const x of w) if(x<=v) c++; m.set(Math.floor(s[i][0]/86400e3), c/w.length*100); }
    per[k]=m; }
  const days=new Set(); Object.values(per).forEach(m=>m.forEach((_,d)=>days.add(d)));
  const out=[...days].sort((a,b)=>a-b).map(d=>{ const v=Object.values(per).map(m=>m.get(d)).filter(x=>x!=null); return {d, t:d*86400e3, s: v.length>=3? v.reduce((a,b)=>a+b,0)/v.length : null}; }).filter(x=>x.s!=null);
  return out; }
function riskBars(base, ms, M){ const R=riskDaily(M); const out=new Array(base.length).fill(null); if(!R.length) return out; let j=-1;
  for(let i=0;i<base.length;i++){ const tc=base[i].t+ms; while(j+1<R.length && R[j+1].t+86400e3<=tc) j++; out[i]= j>=0 && tc-R[j].t < 5*86400e3 ? R[j].s : null; } return out; }
function regimeBars(base, h1, ms, PP, regd){ const mode=+PP.trend, out=new Array(base.length).fill(0); if(!mode) return out;
  if(mode===4){ const a=regimeBars(base,h1,ms,{...PP,trend:3},regd), b=regimeBars(base,h1,ms,{...PP,trend:1}); const o=a.map((v,i)=>v===9?9:b[i]); o.reg=a.reg; return o; }
  if(mode===3){ const daily = regd || BTCD || agg(h1, 86400e3); const R3=classifyRegime(daily, PP); let j=-1;
    for(let i=0;i<base.length;i++){ const tc=base[i].t+ms; while(j+1<R3.length&&R3[j+1].t+86400e3<=tc) j++; out[i] = j<0 ? 9 : (R3[j].reg==='SIDE'?0:9); }
    out.reg = R3; return out; }
  const N=+PP.trendN, W=N*24;
  let hiA=[], loA=[], em=[];
  if(mode===1){ const dqH=[], dqL=[]; for(let i=0;i<h1.length;i++){ while(dqH.length&&h1[dqH[dqH.length-1]].h<=h1[i].h) dqH.pop(); dqH.push(i); while(dqH[0]<=i-W) dqH.shift(); while(dqL.length&&h1[dqL[dqL.length-1]].l>=h1[i].l) dqL.pop(); dqL.push(i); while(dqL[0]<=i-W) dqL.shift(); hiA.push(h1[dqH[0]].h); loA.push(h1[dqL[0]].l); } }
  else { em = ema(h1.map(b=>b.c), W); }
  let j=-1, st=0;
  for(let i=0;i<base.length;i++){ const tc=base[i].t+ms; while(j+1<h1.length&&h1[j+1].t+H1<=tc) j++; if(j<W) continue; const c=base[i].c;
    if(mode===1){ const p=(c-loA[j])/(hiA[j]-loA[j]||1); if(p>=+PP.trendPct) st=1; else if(p<=1-PP.trendPct) st=-1; else if(p<0.5&&st>0) st=0; else if(p>0.5&&st<0) st=0; out[i]=st; }
    else { const bd=(+PP.trendBand||0)/100; out[i] = em[j]==null?0 : c>em[j]*(1+bd)? 1 : c<em[j]*(1-bd)? -1 : 0; } }
  return out; }
// mode 1 = v1 단타 역추세, mode 2 = v2 스윙 코어
// c = {sym, base, h1, ms, st, en, compound, eqStep, BX}
function runStrategy(mode, c, F, PP){
  const base=c.base, ms=c.ms, st=c.st, en=c.en==null?Infinity:c.en, eqStep=c.eqStep||6;
  const BX = mode===2 ? (c.BX || boxBars(base, c.h1, ms, +PP.boxN)) : null;
  const RG = c.RG || regimeBars(base, c.h1, ms, PP);
  const RK = +PP.adapt ? (c.RK || riskBars(base, ms, (typeof D!=='undefined'&&D&&D.macro)||null)) : null;
  const tpsTight = String(PP.tpTight||'0.5,0.8,1.2').split(',').map(Number).filter(x=>x>0);
  const trW=String(PP.trW).split(',').map(Number).filter(x=>x>0).slice(0,PP.maxTr);
  const tps=String(PP.tp).split(',').map(Number).filter(x=>x>0);
  const sumW=trW.reduce((a,b)=>a+b,0);
  let cash=+PP.capital, pos=null, acts=[], trades=[], eq=[], daily=[], peak=+PP.capital, mdd=0, dead=false, bias=0, lastBx=null, lastDay=-1, feesTot=0, firstC=null, lastC=null, lastT=null;
  const fee = n => n*PP.fee/100;
  const BXON = +PP.bxX>0; let BH=null, BL=null, bs=null, bcnt=0, bdir=0, nBrk=0;
  if(BXON){ const h1=c.h1, W=(+PP.bxDays||30)*24, lag=+(PP.bxLag??24); const hiA=[],loA=[],dqH=[],dqL=[];
    for(let k=0;k<h1.length;k++){ while(dqH.length&&h1[dqH[dqH.length-1]].h<=h1[k].h) dqH.pop(); dqH.push(k); while(dqH[0]<=k-W) dqH.shift(); while(dqL.length&&h1[dqL[dqL.length-1]].l>=h1[k].l) dqL.pop(); dqL.push(k); while(dqL[0]<=k-W) dqL.shift(); hiA.push(h1[dqH[0]].h); loA.push(h1[dqL[0]].l); }
    BH=new Array(base.length).fill(null); BL=new Array(base.length).fill(null); let j=-1;
    for(let k=0;k<base.length;k++){ const tc=base[k].t+ms; while(j+1<h1.length&&h1[j+1].t+H1<=tc) j++; const q=j-lag; if(q<W) continue; BH[k]=hiA[q]; BL[k]=loA[q]; } }
  const sessOk = t => { const h=new Date(t+KST).getUTCHours(); return !+PP.session || h>=21 || h<3; };
  const unitFor = () => (c.compound? Math.max(cash,0) : +PP.capital)*PP.lev/sumW;
  function fill(t, kind, side, qty, price, reason){
    if(!(qty>0)) return;
    const n=qty*price, fe=fee(n); cash-=fe; feesTot+=fe; let pnl=null;
    if(kind==='OPEN'||kind==='ADD'){
      if(!pos){ pos={side, qty:0, avg:0, tr:0, lastP:price, lastT:t, maxQty:0, tpHit:0, minMove:0, cut:false, openT:t, realized:0, fees:0, lastTp:0}; }
      pos.avg=(pos.avg*pos.qty+price*qty)/(pos.qty+qty); pos.qty+=qty; pos.tr++; pos.lastP=price; pos.lastT=t; pos.maxQty=Math.max(pos.maxQty,pos.qty);
    } else { pnl=(side==='LONG'?price-pos.avg:pos.avg-price)*qty; cash+=pnl; pos.realized+=pnl; pos.qty-=qty; }
    if(pos) pos.fees+=fe;
    const act={t, sym:c.sym, kind, side, qty, price, avg:pos?pos.avg:null, pnl, reason, tr:pos?pos.tr:0, mode};
    acts.push(act);
    if(pos && pos.qty<=pos.maxQty*0.02+1e-12){
      if(pos.qty>0){ const ex=(side==='LONG'?price-pos.avg:pos.avg-price)*pos.qty; cash+=ex; pos.realized+=ex; act.pnl=(act.pnl||0)+ex; act.qty+=pos.qty; }
      trades.push({sym:c.sym, mode, side:pos.side, openT:pos.openT, closeT:t, avg:pos.avg, exit:price, maxQty:pos.maxQty, tr:pos.tr, pnl:pos.realized-pos.fees, notional:pos.maxQty*pos.avg});
      pos=null;
    }
    act.dir = pos? (pos.side==='LONG'?1:-1) : 0;
  }
  const open = (t, side, cpx, reason) => { const u=unitFor(); fill(t,'OPEN',side,u*trW[0]/cpx,cpx,reason); if(pos) pos.unitN=u; };
  for(let i=0;i<base.length;i++){
    const b=base[i], t=b.t+ms; if(t>en) break;
    const f=F[i], cpx=b.c, bx=BX?BX[i]:null;
    if(mode===2){ if(!bx) continue; if(bx.p>=PP.biasHi) bias=-1; else if(bx.p<=PP.biasLo && (!(+PP.capDrop) || (bx.hi-cpx)/bx.hi*100>=+PP.capDrop)) bias=1; lastBx=bx; }
    if(t<st) continue;
    if(firstC==null) firstC=cpx; lastC=cpx; lastT=t;
    if(dead) break;
    let inBrk=false;
    if(BXON){
      if(bs){ const inside = cpx<=bs.hi && cpx>=bs.lo;
        if(pos&&pos.fol&&+PP.bxTrail){ const pk=pos.side==='LONG'?Math.max(pos.pk||cpx,cpx):Math.min(pos.pk||cpx,cpx); pos.pk=pk; const dd=pos.side==='LONG'?(pk-cpx)/pk*100:(cpx-pk)/pk*100; if(dd>=+PP.bxTrail) fill(t,'CLOSE',pos.side,pos.qty,cpx,'추종 트레일링 청산'); }
        if(inside || t-bs.t0>=(+PP.bxMaxD||30)*864e5){ if(pos&&pos.fol) fill(t,'CLOSE',pos.side,pos.qty,cpx,'박스 복귀: 추종 청산'); bs=null; bcnt=0; bdir=0; } else inBrk=true; }
      else if(BH[i]!=null){ const x=+PP.bxX/100, hi=BH[i], lo=BL[i]; const d = cpx>hi*(1+x)?1 : cpx<lo*(1-x)?-1 : 0;
        if(d && d===bdir) bcnt++; else { bdir=d; bcnt=d?1:0; }
        if(d && bcnt>=+PP.bxN){ bs={dir:d,hi,lo,t0:t}; nBrk++; inBrk=true;
          if(pos && (!+PP.bxSide || (d>0?pos.side==='SHORT':pos.side==='LONG'))) fill(t,'CLOSE',pos.side,pos.qty,cpx,'박스 이탈 손절 (전량)');
          if(+PP.bxFol>0){ const u=unitFor(); fill(t,'OPEN',d>0?'LONG':'SHORT',u*trW[0]*PP.bxFol/cpx,cpx,'이탈 방향 추종 진입'); if(pos){ pos.fol=1; pos.unitN=u; pos.pk=cpx; } } } } }
    if(f.rsi15==null||f.pB==null) continue;
    const rg = (inBrk && +PP.bxSide) ? bs.dir : RG[i]; const blockAll = rg===9 || (inBrk && !+PP.bxSide);
    const sigS = !blockAll && rg<=0 && f.rsi15>=PP.rsiS && f.pB>=PP.pbS && f.pos24>=PP.posS && (!+PP.useVwap||f.vwap>0);
    const sigL = !blockAll && rg>=0 && f.rsi15<=PP.rsiL && f.pB<=PP.pbL && f.pos24<=PP.posL && (!+PP.useVwap||f.vwap<0);
    if(pos && blockAll && !pos.fol && +PP.trendExit) fill(t,'CLOSE',pos.side,pos.qty,cpx,'장분위기가 횡보장이 아니라 웨돔 방식 중지 (전량 정리)');
    else if(pos && +PP.trendExit && ((rg>0&&pos.side==='SHORT')||(rg<0&&pos.side==='LONG'))) fill(t,'CLOSE',pos.side,pos.qty,cpx,`추세 필터: ${rg>0?'상승':'하락'}추세라 역방향 포지션 청산`);
    if(mode===2){
      let want = bias>0?'LONG':bias<0?'SHORT':null; if(blockAll||(want==='SHORT'&&rg>0)||(want==='LONG'&&rg<0)) want=null;
      if(pos && want && pos.side!==want) fill(t,'CLOSE',pos.side,pos.qty,cpx,`${PP.boxN}일 박스 ${(bx.p*100).toFixed(0)}% → ${want==='LONG'?'롱':'숏'} 전환`);
      if(pos){
        const mv=(pos.side==='LONG'?(cpx-pos.avg):(pos.avg-cpx))/pos.avg*100;
        if(mv<=-PP.stop) fill(t,'STOP',pos.side,pos.qty,cpx,`안전 손절 ${mv.toFixed(2)}%`);
        else {
          const LAD = (RK && RK[i]!=null && RK[i]>=+PP.riskHi) ? tpsTight : tps; while(pos && pos.tpHit<LAD.length && mv>=LAD[pos.tpHit]){ const q=Math.min(pos.qty, pos.maxQty*PP.tpFrac); const lv=LAD[pos.tpHit]; pos.tpHit++; fill(t,'TP',pos.side,q,cpx,`분할 익절 +${lv}% 도달${LAD===tpsTight?' (리스크 '+Math.round(RK[i])+', 짧은 익절)':''}`); }
          const opp = pos && (pos.side==='LONG'? sigS : sigL);
          if(pos && opp && mv>=PP.oppTpMin && t-pos.lastTp>=3*H1 && pos.qty>pos.maxQty*PP.core){ pos.lastTp=t; fill(t,'TP',pos.side,Math.min(pos.qty-pos.maxQty*PP.core, pos.maxQty*PP.tpFrac),cpx,'24h 반대 극단 일부 익절 (코어 유지)'); }
          const same = pos && (pos.side==='LONG'? sigL : sigS);
          if(pos && same && pos.tr<trW.length && sessOk(t)){
            const adv=(pos.side==='LONG'?(pos.lastP-cpx):(cpx-pos.lastP))/pos.lastP*100;
            if(adv>=PP.addGap && t-pos.lastT>=PP.cool*60e3) fill(t,'ADD',pos.side,(pos.unitN||unitFor())*trW[pos.tr]/cpx,cpx,`${pos.tr+1}차 분할 (직전 대비 ${adv.toFixed(2)}% 역행)`);
          }
        }
      }
      if(!pos && want && sessOk(t)) open(t, want, cpx, `${want==='LONG'?'롱':'숏'} 코어 진입 (${PP.boxN}일 박스 ${(bx.p*100).toFixed(0)}%)`);
    } else {
      if(pos){
        const mv = (pos.side==='LONG'?(cpx-pos.avg):(pos.avg-cpx))/pos.avg*100;
        pos.minMove=Math.min(pos.minMove,mv);
        if(mv<=-PP.stop){ fill(t,'STOP',pos.side,pos.qty,cpx,`안전 손절 ${mv.toFixed(2)}%`); }
        else {
          const opp = pos.side==='LONG'? sigS : sigL;
          if(opp && mv>=-PP.flipMax){ const ns=pos.side==='LONG'?'SHORT':'LONG'; fill(t,'CLOSE',pos.side,pos.qty,cpx,`반대 신호 청산 ${mv>=0?'+':''}${mv.toFixed(2)}%`); if(sessOk(t)) open(t, ns, cpx, '스위칭 1차 진입'); }
          else {
            const LAD = (RK && RK[i]!=null && RK[i]>=+PP.riskHi) ? tpsTight : tps; while(pos && pos.tpHit<LAD.length && mv>=LAD[pos.tpHit]){ const q=Math.min(pos.qty, pos.maxQty*PP.tpFrac); const lv=LAD[pos.tpHit]; pos.tpHit++; fill(t,'TP',pos.side,q,cpx,`분할 익절 +${lv}% 도달${LAD===tpsTight?' (리스크 '+Math.round(RK[i])+', 짧은 익절)':''}`); }
            if(pos && pos.tr>=PP.cutTr && !pos.cut && pos.minMove<=-1 && mv>-0.3 && mv<0){ pos.cut=true; fill(t,'CUT',pos.side,pos.qty*0.4,cpx,'물량 조절 (평단 근처 복귀)'); }
            const same = pos && (pos.side==='LONG'? sigL : sigS);
            if(pos && same && pos.tr<trW.length && sessOk(t)){
              const adv = (pos.side==='LONG'?(pos.lastP-cpx):(cpx-pos.lastP))/pos.lastP*100;
              if(adv>=PP.addGap && t-pos.lastT>=PP.cool*60e3) fill(t,'ADD',pos.side,(pos.unitN||unitFor())*trW[pos.tr]/cpx,cpx,`${pos.tr+1}차 분할 (직전 대비 ${adv.toFixed(2)}% 역행)`);
            }
          }
        }
      } else if(sessOk(t)) {
        if(sigS) open(t,'SHORT',cpx,'숏 신호 1차 진입');
        else if(sigL) open(t,'LONG',cpx,'롱 신호 1차 진입');
      }
    }
    const unr = pos? (pos.side==='LONG'?cpx-pos.avg:pos.avg-cpx)*pos.qty : 0;
    const v=cash+unr; if(v<=0){ dead=true; }
    peak=Math.max(peak,v); mdd=Math.max(mdd,(peak-v)/peak*100);
    if(i%eqStep===0) eq.push({t,v,px:cpx});
    const day=Math.floor((t+KST)/86400e3); if(day!==lastDay){ daily.push({t,v,px:cpx}); lastDay=day; }
  }
  const unr = pos&&lastC!=null? (pos.side==='LONG'?lastC-pos.avg:pos.avg-lastC)*pos.qty : 0;
  const equity = dead? 0 : cash+unr;
  if(lastT!=null){ eq.push({t:lastT,v:equity,px:lastC}); daily.push({t:lastT,v:equity,px:lastC}); }
  const lastF = F[Math.min(F.length-1, (()=>{ let k=base.length-1; while(k>0 && base[k].t+ms>en) k--; return k; })())];
  return {sym:c.sym, mode, acts, trades, eq, daily, pos, cash, unr, equity, mdd:dead?100:mdd, dead, fees:feesTot, nBrk, bh: firstC? (lastC/firstC-1)*100 : 0, firstC, last:lastC, st, lastT, F:lastF, bias, box:lastBx};
}
function simulate(sym, F){ return runStrategy(+P.mode===2?2:1, {sym, base:K[sym].m5, h1:K[sym].h1, ms:M5, st:startMs(), eqStep:6}, F, P); }
// ---------------- wedom positions ----------------
function wedomFor(sym){
  const ev=D.events.filter(e=>e.p&&e.p.sym===sym).sort((a,b)=>a.at-b.at);
  const steps=[]; const s={LONG:0,SHORT:0}; const trades=[]; const open={};
  // 잔량 정리: 축소 후 남은 수량이 아주 작으면(명목가 $500 미만, 예: 0.001 BTC) 사실상 청산으로 보고, 거기서 다시 늘리면 새 진입으로 취급
  const dust = e => e.p.size*(e.p.entry||e.mark||0) < 500;
  for(const e0 of ev){
    let e=e0; const sd=e.p.side;
    if(e.type==='POSITION_DECREASE' && dust(e)) e={...e, type:'POSITION_CLOSE'};
    else if(e.type==='POSITION_INCREASE' && !open[sd] && s[sd]===0) e={...e, type:'POSITION_OPEN'};
    if(e.type==='POSITION_CLOSE') s[sd]=0; else s[sd]=e.p.size;
    steps.push({t:e.at, L:s.LONG, S:s.SHORT, e});
    if(e.type==='POSITION_OPEN') open[sd]={side:sd, openT:e.at, maxQty:e.p.size, pnl:0, n:1};
    else if(open[sd]){ const o=open[sd]; o.n++; o.maxQty=Math.max(o.maxQty,e.p.size); if(e.pnl) o.pnl+=e.pnl; if(e.type==='POSITION_CLOSE'){ o.closeT=e.at; o.avg=e.p.entry; o.exit=e.exit; trades.push(o); delete open[sd]; } }
  }
  for(const sd in open){ const o=open[sd]; o.open=true; trades.push(o); }
  return {ev, steps, trades: trades.sort((a,b)=>a.openT-b.openT)};
}
function dirAt(steps, t){ let lo=0,hi=steps.length-1,a=-1; while(lo<=hi){const m=(lo+hi)>>1; if(steps[m].t<=t){a=m;lo=m+1;}else hi=m-1;} if(a<0) return 0; const s=steps[a]; const e=s.e; const px=e.mark||1; const nl=s.L, ns=s.S; if(nl===0&&ns===0) return 0; return nl>ns?1:ns>nl?-1:0; }
function simDirAt(acts, t){ let d=0; for(const a of acts){ if(a.t>t) break; d=a.dir; } return d; }

