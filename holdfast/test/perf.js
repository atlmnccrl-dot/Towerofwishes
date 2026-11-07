// HOLDFAST - frame-time check on an emulated phone (3x pixels, CPU slowed 4x) with a busy camp
// and a raid. Reports average and 95th-percentile frame time and render scale.
// Usage: NODE_PATH=$(npm root -g) node holdfast/test/perf.js [url]
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8765/holdfast/index.html';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url + '?autostart');
  await page.waitForFunction(() => window.HF && HF.debug && HF.debug.G.st, null, { timeout: 60000 });
  await page.evaluate(() => {
    const { G, S, C } = HF.debug; const st = G.st; C.skip(); C.queue.length = 0;
    S.cmd(st, 'makeCamp', { x: st.clearing.x, y: st.clearing.y }); const c = st.clearing;
    const B = (t, x, y, tier) => S.canPlace(st, t, x, y) ? S.addBuilding(st, t, x, y, tier || 0, true) : null;
    B('heart', c.x - 2, c.y - 1, 1); st.era = 2; st.obj = 13; for (const o of HF.D.OBJ.slice(0, 13)) st.objDone[o.id] = true;
    for (let i = 0; i < 6; i++) B('tent', c.x - 8 + i * 3, c.y - 5); B('stockpile', c.x + 5, c.y + 1); B('tower', c.x - 3, c.y + 6);
    for (let k = -6; k <= 6; k++) B('wall', c.x + 10, c.y + k);
    for (let i = 0; i < 14; i++) { const u = S.makeSurvivor(st, { x: (c.x - 6 + i) * 32, y: (c.y + 3) * 32 }); u.job = ['wood', 'stone', 'forage', 'build', 'guard'][i % 5]; }
    S.reveal(st, c.x, c.y, 22); st.hours = 24 * 5 + 17.5; HF.R.cam.x = c.x * 32; HF.R.cam.y = c.y * 32; HF.R.cam.z = 1.2;
  });
  const measure = (label, secs) => page.evaluate(([label, secs]) => new Promise(res => { const ts = []; const t0 = performance.now(); const f = t => { ts.push(t); if (t - t0 < secs * 1000) requestAnimationFrame(f); else { const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); res(label + ': avg ' + (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) + ' ms, p95 ' + d[Math.floor(d.length * 0.95)].toFixed(1) + ' ms, frames ' + d.length + ', scale ' + (HF.R.scale || HF.R.dpr).toFixed(2)); } }; requestAnimationFrame(f); }), [label, secs]);
  await page.waitForTimeout(2500);
  console.log(await measure('camp 1x', 4));
  await page.evaluate(() => HF.debug.G.setSpeed(3)); console.log(await measure('camp 3x', 4));
  await page.evaluate(() => { const { G, S } = HF.debug; const st = G.st; const kinds = Object.keys(HF.D.FOE).filter(k => !HF.D.FOE[k].boss).slice(0, 4); S.spawnWave(st, kinds.map(k => [k, 4]), 99, 'raider', 0); st.threat.active = true; st.threat.activeKind = 'raider'; HF.R.cam.z = 0.9; });
  await page.waitForTimeout(1500);
  console.log(await measure('raid 3x', 4));
  await page.evaluate(() => { HF.debug.G.st.hours = 24 * 5 + 22; HF.debug.G.setSpeed(1); });
  console.log(await measure('night raid 1x', 4));
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
  await browser.close();
})();
