// HOLDFAST - the war horn (Rally) and the Tyrant's kill shot, driven through the real UI.
// Usage: NODE_PATH=$(npm root -g) node holdfast/test/epic.js [outdir] [url]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-epic', url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  let fails = 0; const check = (c, m) => { console.log((c ? 'ok ' : 'FAIL ') + m); if (!c) fails++; };
  await page.goto(url + '?autostart'); await page.waitForFunction(() => window.HF && HF.debug && HF.debug.G.st, null, { timeout: 30000 });
  await page.evaluate(() => {
    const { G, S, C } = HF.debug; const st = G.st; C.skip(); C.queue.length = 0;
    S.cmd(st, 'makeCamp', { x: st.clearing.x, y: st.clearing.y }); const c = st.clearing;
    S.addBuilding(st, 'heart', c.x - 2, c.y - 1, 1, true); st.era = 2; st.obj = 13; for (const o of HF.D.OBJ.slice(0, 13)) st.objDone[o.id] = true;
    for (let i = 0; i < 8; i++) { const u = S.makeSurvivor(st, { x: (c.x - 4 + i) * 32, y: (c.y + 3) * 32 }); u.job = 'guard'; u.gear.w = 'spear'; }
    S.reveal(st, c.x, c.y, 24); st.hours = 24 * 12 + 15;
    S.spawnFoe(st, 'trex', (c.x + 12) * 32, c.y * 32, 77); st.threat.active = true; st.threat.activeKind = 'dino'; st.threat.spawned = 1;
    HF.R.cam.x = (c.x + 6) * 32; HF.R.cam.y = c.y * 32; HF.R.cam.z = 1.2;
  });
  await page.waitForTimeout(800);
  check(await page.$eval('#act-alarm span', e => e.textContent) === 'Rally', 'alarm button becomes Rally during an attack');
  await page.tap('#act-alarm'); await page.waitForTimeout(200);
  const p = await page.evaluate(() => { const c = HF.debug.G.st.clearing; return HF.R.w2s((c.x + 9) * 32, c.y * 32); });
  await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(400);
  const r = await page.evaluate(() => { const st = HF.debug.G.st; return { rally: !!st.rally, cd: st.rallyCd, movers: HF.debug.S.present(st).filter(u => u.task && u.task.t === 'move').length }; });
  check(r.rally && r.cd > 50 && r.movers >= 4, 'rally point set, fighters charge ' + JSON.stringify(r));
  await page.screenshot({ path: out + '/1-rally.png' });
  await page.evaluate(() => { const { G, S } = HF.debug; for (let k = 0; k < 120; k++) S.step(G.st, 0.05); const t = S.foes(G.st).find(f => f.kind === 'trex'); if (t) { HF.R.cam.x = t.x; HF.R.cam.y = t.y - 40; } });
  await page.waitForTimeout(400); await page.screenshot({ path: out + '/2-fight.png' });
  // finish it: the next hit kills
  await page.evaluate(() => { const { G, S } = HF.debug; const t = S.foes(G.st).find(f => f.kind === 'trex'); const u = S.present(G.st)[0]; S.damageUnit(G.st, t, 99999, u); });
  await page.waitForFunction(() => HF.C.busy() && HF.C.active && HF.C.active.id === 'bossfall', null, { timeout: 20000 }).catch(() => {});
  check(await page.evaluate(() => HF.C.active && HF.C.active.id === 'bossfall'), 'the Tyrant\'s death plays the kill shot');
  await page.waitForTimeout(1600); await page.screenshot({ path: out + '/3-fallen.png' });
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors'); console.log(fails ? fails + ' FAILURES' : 'all epic checks passed');
  await b.close(); process.exit(fails ? 1 : 0);
})();
