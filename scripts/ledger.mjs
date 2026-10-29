// 실시간 모의매매 장부 (GitHub Actions에서 10분마다 실행)
// ledger/vN/ 에 시작 시점에 얼린 engine.js, params.json, info.json 이 있고, 확정 거래는 trades.jsonl 에 덧붙이기만 한다.
// 결과 요약은 site/ledger.json (사이트 표시용) 과 ledger/vN/state.json (저장소 커밋) 에 쓴다.
import fs from 'node:fs/promises';
const ROOT = 'ledger', OUT = 'site';
const log = (...a) => console.log('[ledger]', ...a);
const meta = JSON.parse(await fs.readFile(ROOT + '/meta.json', 'utf8'));
const now = Date.now();
const stub = [{ WEDOM_DATA: { events: [], news: [], timeline: [] } }, { getItem: () => null }, { head: { appendChild() { } }, createElement() { return {}; } }];
async function getBars(from) {
  let bars = [], s = from;
  while (s < now) {
    let j = null;
    for (let t = 0; t < 4 && !Array.isArray(j); t++) { try { j = await (await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=15m&startTime=${s}&limit=1000`)).json(); } catch (e) { await new Promise(r => setTimeout(r, 1500)); } }
    if (!Array.isArray(j) || !j.length) break;
    bars.push(...j.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })));
    s = j[j.length - 1][0] + 900e3; if (j.length < 1000) break;
  }
  return bars.filter(b => b.t + 900e3 <= now);
}
const summary = { updatedAt: now, current: meta.current, versions: [] };
for (const info of meta.versions) {
  const dir = ROOT + '/' + info.v;
  try {
    if (now < info.start) { summary.versions.push({ info, status: '시작 전' }); continue; }
    const engSrc = await fs.readFile(dir + '/engine.js', 'utf8'); const PP = JSON.parse(await fs.readFile(dir + '/params.json', 'utf8'));
    const E = new Function('window', 'localStorage', 'document', engSrc + '\nreturn {runStrategy, featuresBars, boxBars, agg};')(...stub);
    const bars = await getBars(info.start - 45 * 864e5);
    const h1 = E.agg(bars, 3600e3), F = E.featuresBars(bars, h1, 900e3), BX = E.boxBars(bars, h1, 900e3, +PP.boxN);
    const r = E.runStrategy(+PP.mode === 2 ? 2 : 1, { sym: 'BTCUSDT', base: bars, h1, ms: 900e3, st: info.start, compound: false, eqStep: 4, BX }, F, PP);
    let prev = []; try { prev = (await fs.readFile(dir + '/trades.jsonl', 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { }
    const key = t => `${t.openT}|${t.closeT}|${t.side}|${t.avg.toFixed(2)}|${t.exit.toFixed(2)}`;
    const nowKeys = r.trades.map(key); let mismatch = 0; prev.forEach((t, i) => { if (nowKeys[i] !== key(t)) mismatch++; });
    const add = r.trades.slice(prev.length).map(t => ({ ...t, recordedAt: now }));
    if (add.length) await fs.appendFile(dir + '/trades.jsonl', add.map(t => JSON.stringify(t)).join('\n') + '\n');
    const allT = prev.concat(add); const wins = allT.filter(t => t.pnl > 0).length;
    const state = { updatedAt: now, lastBar: bars.length ? bars[bars.length - 1].t : null, equity: r.equity, ret: (r.equity / PP.capital - 1) * 100, mdd: r.mdd, realizedPnl: r.cash - PP.capital, unrealizedPnl: r.unr, fees: r.fees, actionCount: r.acts.length, trades: allT.length, winRate: allT.length ? wins / allT.length * 100 : null,
      pos: r.pos ? { side: r.pos.side, qty: r.pos.qty, avg: r.pos.avg, tr: r.pos.tr, unr: r.unr } : null, btcRet: r.bh, mismatch, newTrades: add.length };
    await fs.writeFile(dir + '/state.json', JSON.stringify(state, null, 1));
    const eq = r.eq.filter((p, i) => i % 4 === 0).map(p => [p.t, Math.round(p.v * 100) / 100, p.px]);
    summary.versions.push({ info, state, eq, trades: allT.slice(-50), actions: r.acts.slice(-100) });
    log(info.v, 'ret', state.ret.toFixed(2), 'trades', allT.length, 'mismatch', mismatch);
  } catch (e) { log(info.v, 'failed', e.message); summary.versions.push({ info, error: e.message }); }
}
await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(OUT + '/ledger.json', JSON.stringify(summary));
