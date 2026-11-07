// HOLDFAST - screenshots of a developed settlement (built with debug shortcuts): day, night, a raid
// on the walls, panels and dialogs, the era cinematic. Usage:
// NODE_PATH=$(npm root -g) node holdfast/test/shots.js [outdir] [url] [device]
const { chromium, devices } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-shots2';
const url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
const dev = process.argv[4];
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctxOpts = dev ? Object.assign({}, devices[dev]) : { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true };
  const page = await (await browser.newContext(ctxOpts)).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  let n = 0; const shot = async name => { await page.screenshot({ path: out + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(url + '?autostart');
  await page.waitForFunction(() => window.HF && HF.debug && HF.debug.G.st, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  // Build a settlement.
  await ev(() => {
    const { G, S, C } = HF.debug; const D = HF.D; const st = G.st;
    C.skip(); C.queue.length = 0;
    S.cmd(st, 'makeCamp', { x: st.clearing.x, y: st.clearing.y });
    const c = st.clearing;
    const B = (t, x, y, tier) => { if (S.canPlace(st, t, x, y)) return S.addBuilding(st, t, x, y, tier || 0, true); return null; };
    B('heart', c.x - 2, c.y - 1, 1); st.era = 2;
    st.obj = D.OBJ.findIndex(o => o.id === 'grow'); for (const o of D.OBJ.slice(0, st.obj)) st.objDone[o.id] = true;
    B('cabin', c.x - 9, c.y - 6); B('cabin', c.x + 4, c.y - 6); B('tent', c.x - 4, c.y - 5); B('tent', c.x + 1, c.y + 4);
    B('stockpile', c.x + 5, c.y + 1, 1); B('water', c.x - 6, c.y + 3, 1); B('workshop', c.x + 5, c.y + 4); B('study', c.x - 10, c.y);
    B('infirmary', c.x - 10, c.y + 3); B('training', c.x - 5, c.y + 6); B('farm', c.x + 9, c.y - 2); B('farm', c.x + 9, c.y + 2);
    B('tower', c.x - 3, c.y + 8); B('tower', c.x + 10, c.y + 6, 1); B('woodcamp', c.x - 13, c.y - 4);
    for (let k = -8; k <= 9; k++) { B('wall', c.x + 13, c.y + k, k % 3 === 0 ? 1 : 0); }
    for (let k = -12; k <= 12; k++) B('wall', c.x + k, c.y + 11, 1); B('gate', c.x + 13, c.y + 10);
    for (const b of Object.values(st.buildings)) if (b.crop) { b.crop.stage = b.x % 2 ? 'ripe' : 'growing'; b.crop.g = 0.7; }
    st.res = { wood: 180, stone: 140, food: 90, water: 70, metal: 30, knowledge: 40 };
    const jobs = ['wood', 'stone', 'forage', 'farm', 'build', 'guard', 'guard', 'medic', 'craft', 'research', 'labor'];
    for (let i = 0; i < 11; i++) { const u = S.makeSurvivor(st, { x: (c.x - 4 + i) * 32, y: (c.y + 2) * 32 }); u.job = jobs[i]; S.assignHome(st, u); }
    S.reveal(st, c.x, c.y, 24);
    for (let i = 0; i < 260; i++) { const x = c.x + Math.round((Math.random() - 0.5) * 18), y = c.y + Math.round((Math.random() - 0.5) * 14); st.wear[y * D.W + x] = Math.min(100, st.wear[y * D.W + x] + 30); st._.dirty.add(y * D.W + x); }
    st.hours = 24 * 7 + 10; HF.R.cam.x = c.x * 32 + 40; HF.R.cam.y = c.y * 32 + 40; HF.R.cam.z = 1.0;
  });
  for (let i = 0; i < 40; i++) { await ev(() => { const { G, S } = HF.debug; for (let k = 0; k < 20; k++) S.step(G.st, 0.05); }); }
  await page.waitForTimeout(800); await shot('settlement-day');
  await ev(() => { HF.R.cam.z = 1.9; }); await page.waitForTimeout(400); await shot('settlement-close');
  // Panels.
  const drain = () => ev(() => { const C = HF.debug.C; for (let k = 0; k < 20 && (C.busy() || C.queue.length); k++) { if (C.busy()) C.skip(); else C.update(0.01, HF.debug.G.st); } C.returnTo = null; });
  await drain(); await ev(() => { HF.R.cam.z = 1.9; const h = HF.debug.S.heart(HF.debug.G.st); HF.R.cam.x = (h.x + 2.5) * 32; HF.R.cam.y = (h.y + 1.5) * 32; });
  await ev(() => { const { G, S, U } = HF.debug; const h = S.heart(G.st); U.select({ bid: h.id }); }); await page.waitForTimeout(400); await shot('panel-heart');
  await ev(() => { const { G, S, U } = HF.debug; const u = S.present(G.st).find(x => x.job === 'guard'); U.select({ uid: u.id }); }); await page.waitForTimeout(400); await shot('panel-survivor');
  await ev(() => { HF.debug.U.select(null); HF.debug.U.openResearch('research'); }); await page.waitForTimeout(400); await shot('research');
  await ev(() => { HF.debug.U.openResearch('craft'); }); await page.waitForTimeout(300); await shot('craft');
  await ev(() => { HF.debug.U.openPeople(); }); await page.waitForTimeout(600); await shot('people');
  await ev(() => { HF.debug.U.closeModal(); HF.debug.U.openBuild(); }); await page.waitForTimeout(400); await shot('build-drawer-era2');
  await ev(() => { HF.debug.U.cat = 'defense'; HF.debug.U.openBuild(); }); await page.waitForTimeout(300); await shot('build-defense');
  await ev(() => { HF.debug.U.closeDrawer(); HF.debug.U.startPlace('cabin'); const c = HF.debug.G.st.clearing; HF.debug.U.placeAt(c.x - 14, c.y + 8); }); await page.waitForTimeout(300); await shot('placing-cabin');
  await ev(() => { HF.debug.U.cancelPlace(); });
  // Night.
  await ev(() => { const { G, S } = HF.debug; G.st.hours = 24 * 7 + 22; HF.R.cam.z = 1.1; for (let k = 0; k < 200; k++) S.step(G.st, 0.05); }); await page.waitForTimeout(600); await shot('settlement-night');
  // A raid at dusk on the east wall.
  await ev(() => { const { G, S, C } = HF.debug; const st = G.st; st.hours = 24 * 8 + 17.5; st.threat.raid = { day: 9, hour: 17.6, comp: ['raider', 'raider', 'thug', 'brute', 'thrower', 'raider', 'thug'], dirs: [0], warned: true, warnAt: 0, at: 24 * 8 + 17.6, hollow: false, first: false }; for (let k = 0; k < 40; k++) S.step(st, 0.05); });
  await page.waitForTimeout(500); await shot('raid-cinematic');
  await ev(() => { HF.debug.C.skip(); const { G, S } = HF.debug; for (let k = 0; k < 500; k++) S.step(G.st, 0.05); const f = S.foes(G.st); if (f.length) { HF.R.cam.x = f[0].x - 60; HF.R.cam.y = f[0].y; } HF.R.cam.z = 1.5; });
  await page.waitForTimeout(500); await shot('raid-at-wall');
  await ev(() => { const { G, S } = HF.debug; for (let k = 0; k < 300; k++) S.step(G.st, 0.05); });
  await page.waitForTimeout(400); await shot('raid-later');
  // Era cinematic.
  await ev(() => { const { G, S, C } = HF.debug; const st = G.st; st.hours = 24 * 9 + 11; st.relics.banner = true; st.techs.masonry = true; const h = S.heart(st); h.up = true; h.prog = 0.999; for (let k = 0; k < 600 && S.foes(st).length; k++) S.step(st, 0.05); const b = S.present(st)[0]; b.task = { t: 'build', bid: h.id, manual: true }; for (let k = 0; k < 400 && h.tier < 2; k++) S.step(st, 0.05); });
  await page.waitForTimeout(3500); await shot('era-cinematic');
  await page.waitForTimeout(4000); await shot('era-cinematic2');
  await ev(() => { HF.debug.C.skip(); HF.R.cam.z = 1.2; }); await page.waitForTimeout(1200); await shot('longhall');
  // Village buildings and a trader.
  await ev(() => { const { G, S } = HF.debug; const st = G.st; st.techs.metalwork = true; const h = S.heart(st);
    const place = (t) => { for (let r = 3; r < 16; r++) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; const x = h.x + 2 + Math.round(Math.cos(a) * r), y = h.y + 1 + Math.round(Math.sin(a) * r); if (S.canPlace(st, t, x, y)) { S.addBuilding(st, t, x, y, 0, true); return; } } };
    place('fountain'); place('market'); place('ballista'); st.hours = 24 * 10 + 11; st.lastTrader = 0; S.spawnTrader(st);
    const tr = Object.values(st.units).find(u => u.side === 'n'); const c = S.heart(st); tr.x = (c.x + 7) * 32; tr.y = (c.y + c.h) * 32; tr.arrived = true;
    HF.debug.C.queue.length = 0; HF.debug.C.skip(); HF.debug.U.select({ uid: tr.id }); HF.R.cam.x = tr.x; HF.R.cam.y = tr.y - 40; HF.R.cam.z = 1.4; });
  await page.waitForTimeout(800); await shot('trader');
  await ev(() => { const { G, S } = HF.debug; HF.debug.U.select(null); const b = Object.values(G.st.buildings).find(b => b.type === 'ballista') || S.heart(G.st); HF.R.cam.x = (b.x + 1) * 32; HF.R.cam.y = (b.y + 1) * 32; HF.R.cam.z = 1.1; });
  await page.waitForTimeout(600); await shot('village');
  const perf = await ev(async () => { const t0 = performance.now(); let n = 0; await new Promise(r => { const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return Math.round(n / 2); });
  console.log('fps (headless, software):', perf);
  const st = await ev(() => { const { G, S } = HF.debug; return { pop: S.survivors(G.st).length, era: G.st.era, foes: S.foes(G.st).length, deaths: G.st.stats.deaths }; });
  console.log(JSON.stringify(st));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
