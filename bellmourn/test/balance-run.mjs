// The balance check (docs/ASCENT_DESIGN.md §4): whole runs played by the autoplay bot in the headless browser,
// many seeds, for a meta profile. Each run starts from the same permanent save (the profile), so nothing carries
// over between samples. Reports how far the runs got: the Act I clear rate, the act reached, areas, bosses.
// NODE_PATH=$(npm root -g) node bellmourn/test/balance-run.mjs <profile: none|half|full|toll:N> [runs=8] [parallel=2] [turbo=10] [hero] [maxMin=30]
// Profiles: none = a first-time save (no Tower, mastery 0); half = about half the Bell Tower; full = all of it
// and every act unlocked; toll:N = full, at Toll N.
import { createRequire } from 'module';
import * as R from '../js/game/run.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const profile = process.argv[2] || 'none'; const RUNS = +(process.argv[3] || 8); const PAR = +(process.argv[4] || 2);
const TURBO = +(process.argv[5] || 10); const HERO = process.argv[6] && process.argv[6] !== '-' ? process.argv[6] : null; const MAXMIN = +(process.argv[7] || 30);
const port = process.env.PORT || 8790;

function metaFor(p) {
  const m = R.freshMeta(); m.story.seen.tutorial = true; m.runs = 1;
  if (typeof R.towerPreset === 'function') {
    if (p === 'half') R.towerPreset(m, 0.5);
    if (p === 'full' || p.startsWith('toll')) R.towerPreset(m, 1);
  }
  if (p === 'full' || p.startsWith('toll')) { for (const b of ['wheel', 'seraph', 'firstfounder', 'god']) m.codex.bosses[b] = 1; m.tolls = { max: 20, clear: 19 }; }
  if (p.startsWith('toll')) m.toll = +p.split(':')[1] || 1;
  return m;
}

async function one(browser, i) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } });
  const meta = metaFor(profile);
  await ctx.addInitScript(([m]) => { try { if (!sessionStorage.getItem('bm.bal')) { localStorage.clear(); localStorage.setItem('bellmourn.meta.v3', JSON.stringify(m)); sessionStorage.setItem('bm.bal', '1'); } } catch (e) { /* */ } }, [meta]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const hero = HERO ? `&hero=${HERO}` : `&hero=${['warden', 'huntress', 'bellbreaker', 'lamplighter'][i % 4]}`;
  const toll = profile.startsWith('toll') ? `&toll=${+profile.split(':')[1] || 1}` : '';
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?auto=${3 + i}&speed=1&turbo=${TURBO}&runs=1${hero}${toll}`);
  await p.waitForFunction(() => window.BM && BM.ready, null, { timeout: 180000 });
  const t0 = Date.now(); let res = null; let lastKey = ''; let lastT = Date.now();
  while (Date.now() - t0 < MAXMIN * 60000) {
    const s = await p.evaluate(() => { const g = BM.game, r = g.run; return { done: g.autoRunsDone | 0, sum: g.lastSummary ? { outcome: g.lastSummary.outcome, act: g.lastSummary.act, areas: g.lastSummary.areas, bosses: g.lastSummary.bosses, depth: g.lastSummary.depth, shards: g.lastSummary.shards, list: (g.lastSummary.stats && g.lastSummary.stats.bosses) || [] } : null, key: g.state + (r ? r.at + ':' + r.act : '') + (g.bossState || ''), area: g.levelId, hp: g.world && g.world.hero ? Math.round(g.world.hero.hp) : 0 }; });
    if (s.done >= 1 && s.sum) { res = s.sum; break; }
    if (s.key !== lastKey) { lastKey = s.key; lastT = Date.now(); }
    if (Date.now() - lastT > 5 * 60000) { res = { outcome: 'stuck', at: s.key, area: s.area }; break; }
    await p.waitForTimeout(1500);
  }
  if (!res) res = { outcome: 'timeout' };
  res.min = +((Date.now() - t0) / 60000).toFixed(1); res.errors = [...new Set(errs.map((e) => String(e).split('\n')[0]))].slice(0, 3);
  await ctx.close();
  return res;
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = []; let next = 0;
async function worker() { while (next < RUNS) { const i = next++; const r = await one(browser, i); results.push(r); console.log(`run ${i + 1}/${RUNS}`, JSON.stringify(r)); } }
await Promise.all(Array.from({ length: PAR }, worker));
await browser.close();
const fin = results.filter((r) => r.act);
const cleared1 = fin.filter((r) => r.act > 1 || (r.list || []).some((b) => ['silence', 'belfry'].includes(b)) || String(r.outcome).startsWith('ending') || r.outcome === 'victory').length;
const actHist = {}; for (const r of fin) actHist[r.act] = (actHist[r.act] || 0) + 1;
const avg = (k) => (fin.length ? (fin.reduce((s, r) => s + (r[k] || 0), 0) / fin.length).toFixed(1) : '-');
console.log(`PROFILE ${profile}: ${fin.length}/${RUNS} finished; Act I cleared ${cleared1}/${fin.length} (${fin.length ? Math.round(100 * cleared1 / fin.length) : 0}%); act reached ${JSON.stringify(actHist)}; areas ${avg('areas')}; bosses ${avg('bosses')}; shards ${avg('shards')}; minutes ${avg('min')}`);
