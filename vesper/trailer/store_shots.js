// Store screenshots at the sizes the App Store and Google Play ask for, from the running game (a late-game save, the
// bot playing). Usage (the repository served on :8765):
//   NODE_PATH=$(npm root -g) node vesper/trailer/store_shots.js <outDir> [size ...]
// Sizes: iphone67 (2796x1290), ipad129 (2732x2048), android (1920x1080). Writes <outDir>/<size>/<nn_name>.png.
const { chromium } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '/tmp/store'; const pick = process.argv.slice(3);
const SIZES = { iphone67: [1398, 645, 2], ipad129: [1366, 1024, 2], android: [960, 540, 2] };
const URL = 'http://127.0.0.1:8765/vesper/index.html';

// A late-game profile: every node to the end of Act IV won, souls bound and grown, heroes freed.
const SAVE = `(() => { const P = VS.PROG, p = VS.main.save; p.seen = Object.assign(p.seen || {}, { intro: true, lastHour: true, tut: true });
  for (const n of P.NODES) { if (n.act > 4) break; if (n.type === 'shrine') { P.claimShrine(p, n.id); continue; }
    P.finish(p, n.id, { win: true, time: 40, hpFrac: 0.8, bossHits: 0, maxCombo: 40, kills: 30, chests: [], rand: Math.random }); }
  p.lvl = Math.max(p.lvl, 26); p.sp = 0; for (const k of P.SKILLS) P.buy(p, k.id);
  P.soulsInit(p); p.shards = 4000; for (const id of Object.keys(p.souls)) while (P.soulUp(p, id)) {}
  p.soul = p.souls.wing ? 'wing' : Object.keys(p.souls)[0]; p.opts.auto = false; VS.main.write(); })()`;
const ready = (pg, st) => pg.waitForFunction((st) => window.VS && VS.main && VS.main.state === st && VS.main.bgDone, st, { timeout: 180000 });
const fight = (node, wait, setup) => ({ name: node, run: async (pg) => {
  await pg.evaluate((n) => VS.main.startNode(n), node); await ready(pg, 'fight');
  await pg.evaluate((s) => { const f = VS.main.fight; f.tips = []; f.auto = true; const h = f.s.hero; h.maxHp *= 8; h.hp = h.maxHp; if (VS.R) VS.R.camK = 0.8; if (s) eval(s); }, setup || '');
  await pg.waitForTimeout(wait); } });
const scene = (def, i, t) => ({ run: async (pg) => {
  await pg.evaluate((d) => VS.main.startScene(5, VS.STORY[d], () => {}, true), def); await ready(pg, 'scene');
  await pg.evaluate(([i, t]) => { const sc = VS.main.scene.sc; sc.i = i; sc.t = t; }, [i, t]); await pg.waitForTimeout(700); } });

const SHOTS = [
  ['01_kings', scene('FC_DEED', 1, 1.0)],
  ['02_horde', fight('a3-3', 9000)],
  ['03_spell', scene('FC_DEED', 6, 2.0)],
  ['04_guardian', fight('a3-b', 12000)],
  ['05_map', { run: async (pg) => { await pg.evaluate(() => VS.main.map(VS.PROG.nextNode(VS.main.save))); await pg.waitForTimeout(2500); } }],
  ['06_souls', { run: async (pg) => { await pg.evaluate(() => VS.main.souls()); await pg.waitForTimeout(2000); } }],
  ['07_late', fight('a4-5', 14000)],
  ['08_title', { run: async (pg) => { await pg.evaluate(() => VS.main.title()); await pg.waitForTimeout(2500); } }],
];

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [size, [w, h, dpr]] of Object.entries(SIZES)) {
    if (pick.length && !pick.includes(size)) continue;
    fs.mkdirSync(`${out}/${size}`, { recursive: true });
    for (const [name, sh] of SHOTS) {
      const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); pg.on('pageerror', (e) => errs.push(name + ': ' + e.message));
      await pg.goto(URL + '?map'); await ready(pg, 'map'); await pg.evaluate(SAVE); await pg.evaluate(() => { VS.R.touch = true; });   // phones and tablets: the touch controls and hints
      try { await sh.run(pg); await pg.evaluate(() => { for (const el of document.querySelectorAll('button, span, div')) if (el.childNodes.length === 1 && / · test$/.test(el.textContent)) el.textContent = el.textContent.replace(/ · test$/, ''); });   // the preview's test-mode tag
        await pg.screenshot({ path: `${out}/${size}/${name}.png` }); console.log(size, name); } catch (e) { errs.push(size + ' ' + name + ': ' + e.message); }
      await pg.close();
    }
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
