// HOLDFAST - screenshots of a dinosaur raid on a built camp (Tyrant, Triceratops, raptors) and the HUD.
// Usage: NODE_PATH=$(npm root -g) node holdfast/test/dinoshots.js [outdir] [url]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-dino', url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + '?autostart'); await page.waitForFunction(() => window.HF && HF.debug && HF.debug.G.st, null, { timeout: 30000 });
  await page.evaluate(() => {
    const { G, S, C } = HF.debug; const st = G.st; C.skip(); C.queue.length = 0;
    S.cmd(st, 'makeCamp', { x: st.clearing.x, y: st.clearing.y }); const c = st.clearing;
    const B = (t, x, y, tier) => S.canPlace(st, t, x, y) ? S.addBuilding(st, t, x, y, tier || 0, true) : null;
    B('heart', c.x - 2, c.y - 1, 1); st.era = 2; st.obj = 13; for (const o of HF.D.OBJ.slice(0, 13)) st.objDone[o.id] = true;
    for (let i = 0; i < 4; i++) B('tent', c.x - 8 + i * 3, c.y - 5); B('stockpile', c.x + 5, c.y + 1); B('tower', c.x - 3, c.y + 6); B('cabin', c.x + 3, c.y - 6);
    for (let k = -6; k <= 6; k++) B('wall', c.x + 10, c.y + k);
    for (let i = 0; i < 10; i++) { const u = S.makeSurvivor(st, { x: (c.x - 5 + i) * 32, y: (c.y + 3) * 32 }); u.job = ['guard', 'guard', 'wood', 'build', 'forage'][i % 5]; u.gear.w = 'spear'; }
    S.reveal(st, c.x, c.y, 24); st.hours = 24 * 12 + 18.2;
    const e = (k, dx, dy) => S.spawnFoe(st, k, (c.x + dx) * 32, (c.y + dy) * 32, 50);
    e('trex', 16, 0); e('trike', 15, -4); e('raptor', 14, 3); e('raptor', 15, 4); e('raptor', 13, 5); e('stego', 17, -6);
    st.threat.active = true; st.threat.activeKind = 'dino'; st.threat.spawned = 6;
    for (let k = 0; k < 160; k++) S.step(st, 0.05);
    const t = S.foes(st).find(f => f.kind === 'trex'); HF.R.cam.x = t.x - 80; HF.R.cam.y = t.y - 40; HF.R.cam.z = 1.25;
  });
  await page.waitForTimeout(900); await page.screenshot({ path: out + '/1-tyrant.png' });
  await page.evaluate(() => { const { G, S } = HF.debug; for (let k = 0; k < 140; k++) S.step(G.st, 0.05); const t = S.foes(G.st).find(f => f.kind === 'trex') || S.foes(G.st)[0]; if (t) { HF.R.cam.x = t.x - 40; HF.R.cam.y = t.y - 40; } HF.R.cam.z = 1.0; });
  await page.waitForTimeout(700); await page.screenshot({ path: out + '/2-raid.png' });
  await page.evaluate(() => { const { G, S } = HF.debug; G.st.hours = 24 * 12 + 22.5; for (let k = 0; k < 120; k++) S.step(G.st, 0.05); const r = S.foes(G.st).find(f => f.kind === 'raptor') || S.foes(G.st)[0]; if (r) { HF.R.cam.x = r.x; HF.R.cam.y = r.y - 30; } HF.R.cam.z = 1.6; });
  await page.waitForTimeout(700); await page.screenshot({ path: out + '/3-night.png' });
  console.log(JSON.stringify(await page.evaluate(() => { const { G, S } = HF.debug; return { foes: S.foes(G.st).map(f => f.kind + ':' + Math.round(f.hp)), deaths: G.st.stats.deaths, scale: HF.R.dpr }; })));
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors'); await b.close();
})();
