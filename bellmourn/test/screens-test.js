// Renders every menu screen (js/ui) with the SAMPLE data shaped like the contract, on a phone (844x390 at
// deviceScaleFactor 3, touch) and a PC window (960x540, mouse), screenshots each in its key states
// (dealing, hover/selected, result...), drives them with real taps, clicks and keys, checks the handlers
// fire, and fails on any console error. The screens run on a bare page (the UI canvas, the real Input),
// stepped frame by frame so every shot is deterministic.
// NODE_PATH=$(npm root -g) node bellmourn/test/screens-test.js [outdir] [only]
// REAL=1 ... renders with the owners' real modules instead (run.js, boons.js, events.js, challenges.js).
const { chromium } = require('playwright');
const fs = require('fs');
const port = process.env.PORT || 8790; const real = process.env.REAL === '1'; const out = process.argv[2] || '/tmp/bm-screens'; const only = process.argv[3] || '';
fs.mkdirSync(out, { recursive: true });

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>:root { --sal: env(safe-area-inset-left); --sar: env(safe-area-inset-right); } html,body{margin:0;background:#06080c;overflow:hidden;height:100%;touch-action:none} canvas{display:block;position:fixed;left:0;top:0;image-rendering:pixelated;touch-action:none}</style>
<script type="importmap">{ "imports": { "three": "./vendor/three.module.min.js" } }</script></head>
<body><canvas id="ui"></canvas><script>if (new URLSearchParams(location.search).get('real') !== '1') window.BM_UI_SAMPLE = true;</script><script type="module">
import { UI } from './js/engine/ui.js';
import { Input } from './js/engine/input.js';
import * as SCR from './js/ui/index.js';
import { SAMPLE, DATA, loadData } from './js/ui/data.js';
const REAL = new URLSearchParams(location.search).get('real') === '1';
let R = null;
if (REAL) {
  // the owners' real modules: a real run (A), real offers (B), real events (C), real challenges (D)
  await loadData();
  const run = await import('./js/game/run.js'), bo = await import('./js/game/boons.js'), ev = await import('./js/game/events.js');
  const meta = JSON.parse(JSON.stringify(SAMPLE.META)); meta.mastery.warden.xp = 520; meta.codex.boons = Object.fromEntries(Object.keys(bo.BOONS).slice(0, 30).map((k) => [k, true]));
  const r = run.newRun(meta, 'warden', 4242); let rng = run.rngOf(7);
  for (let i = 0; i < 6; i++) { const o = bo.offerBoons(r, rng, 3)[0]; if (o) bo.addBoon(r, o.id, ['common', 'rare', 'epic', 'legendary'][i % 4]); }
  r.hp = Math.round((r.maxHp || 110) * 0.6); r.embers = 160; r.tonics = 2;
  const nx = run.nextNodes(r); if (nx && nx[0]) { run.enterNode(r, (nx[0].id || nx[0])); }
  const evs = Object.values(ev.EVENTS); const pickE = (i) => evs[i % evs.length];
  const metaEnd = JSON.parse(JSON.stringify(meta)); const r2 = JSON.parse(JSON.stringify(r)); r2.stats.areas = ['gate', 'market']; r2.stats.bosses = ['gaoler']; r2.stats.kills = 140; r2.act = 1;
  let summary = null; try { summary = run.endRun(metaEnd, r2, 'death'); } catch (e) { console.warn('endRun', e.message); }
  R = { run: r, meta, offers: bo.offerBoons(r, rng, 3), events: [pickE(0), pickE(7), pickE(19)], stock: run.merchantStock ? run.merchantStock(r) : SAMPLE.STOCK, summary, metaEnd };
}
const cv = document.getElementById('ui');
const r = { onResize: null, unproject: () => ({ x: 0, y: 0, z: 0 }) };
function size() { const dpr = Math.min(devicePixelRatio || 1, 3); const pw = Math.round(innerWidth * dpr), ph = Math.round(innerHeight * dpr); const s = Math.max(1, Math.round(ph / 200)); Object.assign(r, { dpr, scale: s, bw: Math.ceil(pw / s), bh: Math.ceil(ph / s) }); }
size();
const ui = new UI(cv, r); const input = new Input(cv, r);
const calls = []; const sound = { play: (n) => calls.push('sound:' + n) };
const game = { ui, input, sound, settings: {} };
const clone = (o) => JSON.parse(JSON.stringify(o));
let scr = null, name = '';
const H = (keys) => Object.fromEntries(keys.map((k) => [k, (...a) => { calls.push(k + (a.length ? ':' + a.map((x) => typeof x === 'object' ? (x && x.id) : x).join(',') : '')); return undefined; }]));
const DATA_FOR = REAL ? {
  map: () => [SCR.MapScreen, { run: R.run, map: R.run.map }, H(['pick'])],
  boon: () => [SCR.BoonScreen, { run: R.run, offers: R.offers, rerollCost: 35, rerolls: 1 }, H(['pick', 'reroll'])],
  event: () => [SCR.EventScreen, { run: R.run, event: R.events[0] }, H(['choose'])],
  event2: () => [SCR.EventScreen, { run: R.run, event: R.events[1] }, H(['choose'])],
  event3: () => [SCR.EventScreen, { run: R.run, event: R.events[2] }, H(['choose'])],
  shrine: () => [SCR.ShrineScreen, { run: R.run, meta: R.meta }, H(['heal', 'upgrade', 'reroll', 'tonic', 'leave'])],
  merchant: () => [SCR.MerchantScreen, { run: R.run, stock: clone(R.stock) }, H(['buy', 'leave'])],
  summary: () => [SCR.SummaryScreen, { summary: R.summary || clone(SAMPLE.SUMMARY), meta: R.metaEnd }, H(['done'])],
  select: () => [SCR.SelectScreen, { meta: R.meta }, H(['choose', 'tower', 'challenges', 'codex', 'back'])],
  tower: () => [SCR.TowerScreen, { meta: R.meta }, H(['buy', 'back'])],
  challenges: () => [SCR.ChallengesScreen, { meta: R.meta }, H(['back'])],
  codex: () => [SCR.CodexScreen, { meta: R.meta }, H(['back'])],
  talents: () => [SCR.TalentScreen, { meta: R.meta, hero: 'warden' }, H(['pick', 'start', 'back'])],
  shrineScene: () => [SCR.ShrineScreen, { run: R.run, meta: R.meta, inScene: true, veil: 0.42, prices: { heal: 0, upgrade: 60, reroll: 35, tonic: 45 } }, H(['heal', 'upgrade', 'reroll', 'tonic', 'leave'])],
} : {
  map: () => [SCR.MapScreen, { run: clone(SAMPLE.RUN), map: SAMPLE.MAP }, H(['pick'])],
  boon: () => [SCR.BoonScreen, { run: clone(SAMPLE.RUN), offers: SAMPLE.offers(), rerollCost: 30, rerolls: 0, title: 'CHOOSE A BOON' }, H(['pick', 'reroll'])],
  event: () => [SCR.EventScreen, { run: clone(SAMPLE.RUN), event: SAMPLE.EVENTS[0] }, H(['choose'])],
  event2: () => [SCR.EventScreen, { run: clone(SAMPLE.RUN), event: SAMPLE.EVENTS[1] }, H(['choose'])],
  event3: () => [SCR.EventScreen, { run: clone(SAMPLE.RUN), event: SAMPLE.EVENTS[2] }, H(['choose'])],
  shrine: () => [SCR.ShrineScreen, { run: clone(SAMPLE.RUN), meta: clone(SAMPLE.META) }, H(['heal', 'upgrade', 'reroll', 'tonic', 'leave'])],
  merchant: () => [SCR.MerchantScreen, { run: clone(SAMPLE.RUN), stock: clone(SAMPLE.STOCK) }, H(['buy', 'leave'])],
  summary: () => [SCR.SummaryScreen, { summary: clone(SAMPLE.SUMMARY) }, H(['done'])],
  select: () => [SCR.SelectScreen, { meta: clone(SAMPLE.META) }, H(['choose', 'tower', 'challenges', 'codex', 'back'])],
  tower: () => [SCR.TowerScreen, { meta: clone(SAMPLE.META) }, H(['buy', 'back'])],
  challenges: () => [SCR.ChallengesScreen, { meta: clone(SAMPLE.META) }, H(['back'])],
  codex: () => [SCR.CodexScreen, { meta: clone(SAMPLE.META) }, H(['back'])],
  talents: () => [SCR.TalentScreen, { meta: clone(SAMPLE.META), hero: 'warden' }, H(['pick', 'start', 'back'])],
  shrineScene: () => [SCR.ShrineScreen, { run: clone(SAMPLE.RUN), meta: clone(SAMPLE.META), inScene: true, veil: 0.42, prices: { heal: 0, upgrade: 60, reroll: 35, tonic: 45 } }, H(['heal', 'upgrade', 'reroll', 'tonic', 'leave'])],
};
// a stand-in for the 3D Haven behind the in-scene shrine: a dark room and a fire on the left
function fakeScene() { const g = ui.g; for (let y = 0; y < ui.h; y++) { g.fillStyle = 'rgb(' + (20 + y / 8 | 0) + ',' + (14 + y / 12 | 0) + ',12)'; g.fillRect(0, y, ui.w, 1); } g.fillStyle = '#ff9a40'; g.fillRect(ui.w * 0.22, ui.h * 0.55, 10, 14); g.fillStyle = '#ffe0a0'; g.fillRect(ui.w * 0.22 + 3, ui.h * 0.58, 4, 9); g.fillStyle = '#0a0806'; g.fillRect(ui.w * 0.3, ui.h * 0.5, 8, 26); }
const SH = window.SH = {
  calls, names: Object.keys(DATA_FOR),
  open(n) { const [C, d, h] = DATA_FOR[n](); name = n; scr = new C(game); scr.open(d, h); calls.length = 0; SH.step(1 / 60); return true; },
  step(sec, dt = 1 / 60) { const n = Math.max(1, Math.round(sec / dt)); for (let i = 0; i < n; i++) { const f = input.frame(); ui.t += dt; scr.update(dt, f); ui.clear(); if (name === 'shrineScene') fakeScene(); scr.draw(ui); } return scr.phase || ''; },
  // a hit area's centre in CSS pixels (for taps and clicks)
  at(id) { const it = scr.items.find((x) => x.id === id || (id.endsWith('*') && String(x.id).startsWith(id.slice(0, -1)))); if (!it) return null; const k = r.scale / r.dpr; return { x: (it.x + it.w / 2) * k, y: (it.y + it.h / 2) * k, w: it.w * k, h: it.h * k, id: it.id }; },
  ids() { return scr.items.map((x) => x.id); },
  nextNode() { return scr.nextIds ? scr.nextIds()[0] : null; },
  info() { return { bw: r.bw, bh: r.bh, scale: r.scale, dpr: r.dpr, sample: DATA.sample.slice() }; },
  smallest() { const k = r.scale / r.dpr; let m = 1e9, id = ''; for (const it of scr.items) { if (it.small) continue; const s = Math.min(it.w, it.h) * k; if (s < m) { m = s; id = it.id; } } return { min: Math.round(m), id }; },
  // a page of the event vignettes (six at a time), each with its name
  vignettes(page, t = 1.5) { const keys = SCR.SCENE_KEYS.slice(page * 6, page * 6 + 6); ui.clear(); ui.rect(0, 0, ui.w, ui.h, '#06070a'); const cw = Math.floor((ui.w - 16) / 3), ch = Math.floor((ui.h - 24) / 2);
    keys.forEach((k, i) => { const x = 4 + (i % 3) * (cw + 4), y = 4 + Math.floor(i / 3) * (ch + 8); SCR.drawVignette(ui, { scene: k }, x, y, cw, ch - 6, t); ui.text(k.toUpperCase(), x, y + ch - 5, { color: '#e8b860' }); }); return keys.length; },
  // a screen API call (showResult etc.)
  call(fn, ...a) { return scr[fn](...a); },
  get scr() { return scr; },
};
window.SH_READY = true;
</script></body></html>`;

(async () => {
  const b = await chromium.launch();
  const errs = []; let shots = 0; const fails = [];
  const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('  FAIL', msg); } };
  for (const dev of [
    { tag: 'phone', opts: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { tag: 'pc', opts: { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 } },
  ]) {
    const ctx = await b.newContext(dev.opts); const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') errs.push(dev.tag + ': ' + m.text()); });
    p.on('pageerror', (e) => errs.push(dev.tag + ': PAGEERROR ' + e.message));
    p.on('response', (r) => { if (r.status() >= 400) errs.push(dev.tag + ': HTTP ' + r.status() + ' ' + r.url()); });
    await p.route(/\/bellmourn\/__screens\.html/, (route) => route.fulfill({ body: PAGE, contentType: 'text/html' }));
    await p.goto(`http://127.0.0.1:${port}/bellmourn/__screens.html${real ? '?real=1' : ''}`);
    try { await p.waitForFunction(() => window.SH_READY, null, { timeout: 30000 }); } catch (e) { console.log('the page did not start:\n' + errs.join('\n')); process.exit(1); }
    const info = await p.evaluate(() => SH.info()); console.log(dev.tag, 'buffer', info.bw + 'x' + info.bh, 'scale', info.scale, 'dpr', info.dpr);
    const touch = dev.tag === 'phone';
    const shot = async (n) => { await p.screenshot({ path: `${out}/${dev.tag}-${n}.png` }); shots++; };
    const step = (s) => p.evaluate((s) => SH.step(s), s);
    const open = (n) => p.evaluate((n) => SH.open(n), n);
    const at = (id) => p.evaluate((id) => SH.at(id), id);
    const tap = async (id) => { const q = await at(id); if (!q) { check(false, dev.tag + ' no hit area ' + id); return null; } if (touch) await p.touchscreen.tap(q.x, q.y); else await p.mouse.click(q.x, q.y); await step(0.05); return q; };
    const hover = async (id) => { const q = await at(id); if (q && !touch) { await p.mouse.move(q.x, q.y); await step(0.05); } return q; };
    const calls = () => p.evaluate(() => SH.calls.filter((c) => !c.startsWith('sound:')));
    const minTarget = async (n) => { const s = await p.evaluate(() => SH.smallest()); check(s.min >= (touch ? 30 : 24), `${dev.tag} ${n}: smallest target ${s.min}px (${s.id})`); return s; };
    const want = (n) => !only || only.split(',').includes(n);

    if (want('boon')) {
      await open('boon'); await step(0.3); await shot('boon-1-dealing');
      await step(1.2); await shot('boon-2-idle');
      if (touch) { await tap('card1'); await step(0.2); } else { await hover('card1'); await step(0.2); }
      await shot('boon-3-selected'); await minTarget('boon');
      if (touch) await tap('take1'); else await tap('card1');
      await step(0.25); await shot('boon-4-picked'); await step(0.8);
      const c = await calls(); const want1 = await p.evaluate(() => SH.scr.offers[1].id); check(c.includes('pick:' + want1), dev.tag + ' boon pick handler: ' + c.join(' '));
      await open('boon'); await step(1.6); await tap('reroll'); await step(0.2); await shot('boon-5-reroll'); await step(0.6);
      check((await calls()).includes('reroll'), dev.tag + ' reroll handler');
    }
    if (want('map')) {
      await open('map'); await step(0.8); await shot('map-1-idle');
      const nn = await p.evaluate(() => SH.nextNode()); await tap('node:' + nn); await step(0.4); await shot('map-2-confirm'); await minTarget('map');
      await tap('go'); await step(1.0); const c = await calls(); check(c.some((x) => x.startsWith('pick:')), dev.tag + ' map pick: ' + c.join(' '));
    }
    if (want('event')) {
      for (const [k, n] of [['event', 1], ['event2', 2], ['event3', 3]]) {
        await open(k); await step(0.5); if (n === 1) await shot('event-1-typing');
        await step(2.5); if (!touch) await hover('choice1'); await step(0.1); await shot(`event-${n}-choices`);
        if (n === 1) { await minTarget('event'); await tap('choice0'); await step(0.1); const c = await calls(); check(c.includes('choose:0'), dev.tag + ' event choose: ' + c.join(' '));
          await p.evaluate(() => SH.call('showResult', ['THE COAL BURNS INTO YOUR PALM.', 'SOMETHING ANSWERS IN YOUR BLOOD.'], () => SH.calls.push('done'), { hp: -15, boon: 'offer', embers: 20 }));
          await step(0.5); await shot('event-1-result-typing'); await step(2); await shot('event-1-result');
          await tap('continue'); await step(0.1); check((await calls()).includes('done'), dev.tag + ' event result done'); }
      }
    }
    if (want('shrine')) {
      await open('shrine'); await step(1); if (!touch) await hover('opt:heal'); await step(0.1); await shot('shrine-1'); await minTarget('shrine');
      await tap('opt:heal'); await step(0.3); check((await calls()).includes('heal'), dev.tag + ' shrine heal');
      await tap('opt:upgrade'); await step(0.4); await shot('shrine-2-upgrade');
      const pickId = (await p.evaluate(() => SH.ids())).find((i) => String(i).startsWith('up:'));
      if (pickId) { await tap(pickId); await step(0.3); await shot('shrine-3-upgrade-picked'); check((await calls()).some((c) => c.startsWith('upgrade:')), dev.tag + ' shrine upgrade'); } else check(false, dev.tag + ' no upgrade rows');
    }
    if (want('shrine')) { await open('shrineScene'); await step(1); await shot('shrine-4-in-haven'); const fr = await p.evaluate(() => SH.scr.layout(SH.scr.ui)); check(fr.freeX1 > fr.freeX0, dev.tag + ' shrine leaves the scene free: ' + JSON.stringify(fr)); }
    if (want('merchant')) {
      await open('merchant'); await step(1); await shot('merchant-1'); await tap('item:1'); await step(0.2); await shot('merchant-2-selected'); await minTarget('merchant');
      await tap('buy'); await step(0.4); await shot('merchant-3-bought'); check((await calls()).some((c) => c.startsWith('buy:')), dev.tag + ' merchant buy');
    }
    if (want('summary')) {
      await open('summary'); await step(1.4); await shot('summary-1-counting'); await step(6); await shot('summary-2-unlocks');
      await tap('done'); await step(0.1); check((await calls()).includes('done'), dev.tag + ' summary done');
    }
    if (want('select')) {
      await open('select'); await step(0.8); await shot('select-1'); await minTarget('select');
      await tap('hero:kestrel'); await step(0.5); await shot('select-2-locked');
      await tap('hero:huntress'); await step(0.5); await tap('begin'); await step(0.2); check((await calls()).includes('choose:huntress'), dev.tag + ' select choose: ' + (await calls()).join(' '));
      for (const k of ['tower', 'challenges', 'codex']) { await open('select'); await step(0.4); await tap('btn:' + k); await step(0.1); check((await calls()).includes(k), dev.tag + ' select ' + k); }
    }
    if (want('tower')) {
      await open('tower'); await step(0.8); await tap('up:1'); await step(0.2); await shot('tower-1'); await minTarget('tower');
      await tap('buy'); await step(0.4); await shot('tower-2-bought'); check((await calls()).some((c) => c.startsWith('buy:')), dev.tag + ' tower buy');
    }
    if (want('challenges')) {
      await open('challenges'); await step(0.8); await shot('challenges-1'); await minTarget('challenges');
      await tap('tab:hero'); await step(0.3); await shot('challenges-2-wardens');
      await tap('back'); await step(0.1); check((await calls()).includes('back'), dev.tag + ' challenges back');
    }
    if (want('codex')) {
      await open('codex'); await step(0.8); await shot('codex-1-foes'); await minTarget('codex');
      await tap('tab:boons'); await step(0.3); const e = (await p.evaluate(() => SH.ids())).find((i) => String(i).startsWith('entry:')); if (e) await tap(e); await step(0.3); await shot('codex-2-boons');
      await tap('tab:bosses'); await step(0.3); await shot('codex-3-bosses');
      await tap('tab:lore'); await step(0.3); await shot('codex-4-lore');
    }
    if (want('talents')) {
      await open('talents'); await step(0.8); await shot('talents-1'); await minTarget('talents');
      const tals = (await p.evaluate(() => SH.ids())).filter((i) => String(i).startsWith('tal:')); await tap(tals[1] || tals[0]); await step(0.3); await shot('talents-2-picked'); check((await calls()).some((c) => c.startsWith('pick:')), dev.tag + ' talent pick');
      await tap('start'); await step(0.1); check((await calls()).includes('start'), dev.tag + ' talent start');
    }
    // keyboard on the PC: arrows move focus, Enter activates
    if (!touch && want('keys')) {
      await open('boon'); await step(1.6); await p.keyboard.press('ArrowRight'); await step(0.05); await p.keyboard.press('ArrowRight'); await step(0.1); await shot('keys-boon-focus');
      await p.keyboard.press('Enter'); await step(1); check((await calls()).some((c) => c.startsWith('pick:')), 'pc keyboard boon pick');
      await open('event'); await step(3); await p.keyboard.press('ArrowDown'); await step(0.05); await p.keyboard.press('Enter'); await step(0.1); check((await calls()).some((c) => c.startsWith('choose:')), 'pc keyboard event choose: ' + (await calls()).join(' '));
    }
    if (!touch && want('vignettes')) { const n = await p.evaluate(() => Math.ceil(SH.vignettes(0, 0) ? 99 : 0)); for (let pg = 0; pg < 5; pg++) { const k = await p.evaluate((pg) => SH.vignettes(pg), pg); if (!k) break; await shot('vignettes-' + (pg + 1)); } void n; }
    if (want('boon')) console.log(' ', dev.tag, 'sample data in use:', (await p.evaluate(() => SH.info())).sample.join(', ') || 'none');
    await ctx.close();
  }
  await b.close();
  console.log(shots + ' screenshots in ' + out);
  console.log(errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : 'no console errors');
  console.log(fails.length ? fails.length + ' checks failed' : 'all checks passed');
  process.exit(errs.length || fails.length ? 1 : 0);
})();
