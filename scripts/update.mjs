// GitHub Actions: build site/data.js for the 웨돔 모의매매 site (no dependencies, Node 20+)
import fs from 'node:fs/promises';
const SITE_URL = process.env.SITE_URL || '';
const OUT = 'site';
const API = 'https://api.theddari.com/graphql';
const gql = async (query, variables) => (await (await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const log = (...a) => console.log(new Date().toISOString(), ...a);

// previous data (for news history / timeline / fallbacks)
let old = { news: [], timeline: [] };
try {
  const r = await fetch(SITE_URL + '/data.js?ts=' + Date.now());
  if (r.ok) { const t = await r.text(); old = JSON.parse(t.replace(/^window\.WEDOM_DATA\s*=\s*/, '').replace(/;\s*$/, '')); log('prev data ok', (old.events || []).length, 'events'); }
} catch (e) { log('prev data fetch failed', e.message); }
if (!old.timeline || !old.timeline.length) { try { old.timeline = JSON.parse(await fs.readFile('seed/timeline.json', 'utf8')); } catch (e) { old.timeline = []; } }
if (!old.news || !old.news.length) { try { old.news = JSON.parse(await fs.readFile('seed/news.json', 'utf8')); } catch (e) { } }

// 1) 웨돔 events
let events = old.events || [];
try {
  const EQ = "query BjLiveEvents($handle: String, $kind: String, $before: String, $limit: Int) { bjLiveEvents(handle: $handle, kind: $kind, before: $before, limit: $limit) { result message data } }";
  let before = null, ev = [];
  for (let i = 0; i < 300; i++) {
    const v = { handle: 'wedombtc', kind: 'all', limit: 50 }; if (before) v.before = before;
    const d = (await gql(EQ, v)).data.bjLiveEvents.data;
    ev.push(...(d.events || [])); if (!d.nextCursor || !(d.events || []).length) break; before = String(d.nextCursor);
  }
  if (ev.length) events = ev.sort((a, b) => a.at - b.at).map(e => ({ at: e.at, type: e.type, video: e.videoTitle, videoId: e.videoId, ex: e.exchange,
    p: e.position ? { sym: e.position.rawSymbol, side: e.position.side, size: e.position.size, entry: e.position.entryPrice, lev: e.position.leverage } : null,
    prev: e.previous ? e.previous.size : null, mark: e.markPrice, exit: e.exitPrice, pnl: e.pnlUsd, pnlPct: e.pnlPct }));
  log('events', events.length);
  // 웨돔 원본 이벤트 영구 보관 (id 기준 누적, 지우지 않음) -> archive/wedom_events.json (워크플로가 커밋)
  try { await fs.mkdir('archive', { recursive: true }); let arc = []; try { arc = JSON.parse(await fs.readFile('archive/wedom_events.json', 'utf8')); } catch (e) { }
    const m = new Map(arc.map(x => [x.id, x])); let added = 0; for (const e of ev) { if (e && e.id && !m.has(e.id)) { m.set(e.id, e); added++; } }
    const all = [...m.values()].sort((a, b) => a.at - b.at); await fs.writeFile('archive/wedom_events.json', JSON.stringify(all, null, 0)); log('archive', all.length, '+' + added);
  } catch (e) { log('archive failed', e.message); }
} catch (e) { log('events failed', e.message); }

// 2) news
const NQ = `query NewsTimeline($hours: Int, $region: String, $category: String, $minBreakingScore: Int, $keyword: String, $cursor: String, $limit: Int) {
  newsTimeline(hours: $hours, region: $region, category: $category, minBreakingScore: $minBreakingScore, keyword: $keyword, cursor: $cursor, limit: $limit) {
    items { id publishedAt title titleKo url sourceLabel region categories breakingScore tickers keywords aiImpact aiSentiment } } }`;
const MACRO = ['rates_fed', 'inflation_cpi', 'geopolitics_war', 'regulation_policy', 'bonds', 'fx', 'politics_election', 'crypto', 'jobs_labor', 'gdp_macro', 'tariff_trade', 'macro'];
const WEAK = ['oil_commodities', 'equity_index', 'ai'];
const relevant = n => n.region === 'CRYPTO' || (n.cats || n.categories || []).some(c => MACRO.includes(c)) || ((n.cats || n.categories || []).some(c => WEAK.includes(c)) && (n.score ?? n.breakingScore) >= 65) || /비트|BTC|Bitcoin|크립토|가상자산|암호화폐|이더리움|ETH|XRP|리플|스테이블|연준|파월|FOMC|CPI|금리|관세/i.test(n.titleKo || n.title);
const map = new Map((old.news || []).map(n => [n.id, n]));
for (const v of [{ hours: 72, region: 'CRYPTO', limit: 200 }, { hours: 72, minBreakingScore: 60, limit: 200 }, { hours: 24, minBreakingScore: 50, limit: 200 }, { hours: 72, keyword: '비트코인', limit: 100 }]) {
  try { const r = await gql(NQ, v); for (const n of (r.data?.newsTimeline?.items || [])) { if (!relevant(n)) continue; map.set(n.id, { id: n.id, t: Date.parse(n.publishedAt), title: n.titleKo || n.title, url: n.url, src: n.sourceLabel, region: n.region, cats: n.categories, score: n.breakingScore, impact: n.aiImpact, senti: n.aiSentiment, kw: n.keywords }); } } catch (e) { log('news query failed', e.message); }
}
const cutoff = Date.now() - 45 * 864e5;
const news = [...map.values()].filter(n => n.t > cutoff && relevant(n)).sort((a, b) => b.t - a.t);
log('news', news.length);

// 3) embedded klines (fallback when the browser cannot reach exchange APIs) - spot mirror works from US runners
async function kl(sym, interval, start) {
  let out = [], s = start;
  while (s < Date.now()) {
    const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=${interval}&startTime=${s}&limit=1000`);
    const j = await r.json(); if (!Array.isArray(j) || !j.length) break;
    out.push(...j.map(k => [k[0], +k[1], +k[2], +k[3], +k[4], Math.round(+k[5])]));
    s = j[j.length - 1][0] + 1; if (j.length < 1000) break;
  }
  return out;
}
const S0 = Date.parse('2026-09-26T12:00:00+09:00');
let klines = old.klines || {};
try { const k = {}; for (const sym of ['BTCUSDT', 'ETHUSDT', 'XRPUSDT']) k[sym] = { m5: await kl(sym, '5m', S0), h1: await kl(sym, '1h', S0 - 35 * 864e5) }; if (k.BTCUSDT.m5.length) klines = k; log('klines', klines.BTCUSDT.m5.length); } catch (e) { log('klines failed', e.message); }

// 4) macro
async function macroFetch() {
  const out = {}; const yq = { VIX: '^VIX', OVX: '^OVX', MOVE: '^MOVE', BRENT: 'BZ=F', DXY: 'DX-Y.NYB', US10Y: '^TNX', GOLD: 'GC=F', NASDAQ: '^IXIC' };
  for (const [k, s] of Object.entries(yq)) { try { const range = ['VIX', 'OVX', 'MOVE', 'BRENT'].includes(k) ? '10y' : '2y'; const j = await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1d`, { headers: { 'user-agent': 'Mozilla/5.0' } })).json(); const R = j.chart.result[0]; out[k] = R.timestamp.map((t, i) => [t * 1000, R.indicators.quote[0].close[i]]).filter(x => x[1] != null).map(x => [x[0], +x[1].toFixed(3)]); } catch (e) { log('macro', k, 'failed'); } }
  try { const j = await (await fetch(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&start_timestamp=${Date.now() - 730 * 864e5}&end_timestamp=${Date.now()}&resolution=1D`)).json(); out.DVOL = j.result.data.map(x => [x[0], x[4]]); } catch (e) { }
  try { const j = await (await fetch('https://api.alternative.me/fng/?limit=800')).json(); out.FNG = j.data.map(x => [+x.timestamp * 1000, +x.value]).reverse(); } catch (e) { }
  out.updatedAt = Date.now(); return out;
}
let macro = old.macro || null;
// macro changes slowly: refresh at most every 30 min
if (!macro || !macro.updatedAt || Date.now() - macro.updatedAt > 25 * 60e3) { const m = await macroFetch(); if (Object.keys(m).length > 3) macro = m; log('macro keys', Object.keys(m).length); }

await fs.mkdir(OUT, { recursive: true });
const data = { updatedAt: Date.now(), events, news, timeline: old.timeline || [], klines, macro };
await fs.writeFile(OUT + '/data.js', 'window.WEDOM_DATA = ' + JSON.stringify(data) + ';');
await fs.copyFile('index.html', OUT + '/index.html');
await fs.writeFile(OUT + '/.nojekyll', '');
log('done');
