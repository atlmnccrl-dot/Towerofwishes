// Plays the opening in a headless browser: title -> new game -> story -> courtyard fight.
// NODE_PATH=$(npm root -g) node bellmourn/test/play.js <outdir> [port]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-play'; const port = process.argv[3] || process.env.PORT || 8790; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => window.BM && BM.ready && BM.frames > 5, null, { timeout: 90000 });
  const shot = async (n) => { await p.screenshot({ path: `${out}/${n}.png` }); };
  const st = () => p.evaluate(() => ({ state: BM.game.state, hero: BM.game.world && BM.game.world.hero && { x: +BM.game.world.hero.x.toFixed(2), z: +BM.game.world.hero.z.toFixed(2), hp: BM.game.world.hero.hp, st: BM.game.world.hero.state }, foes: BM.game.world ? BM.game.world.foes().length : 0, fps: BM.fps }));
  await p.waitForTimeout(800); await shot('01-title');
  await p.keyboard.press('Enter'); await p.waitForTimeout(600); await shot('02-story');
  await p.keyboard.press('Escape'); await p.waitForFunction(() => BM.game.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(1500); await shot('03-start');
  console.log(JSON.stringify(await st()));
  // walk north (screen up-left = W+A) through the gate
  await p.keyboard.down('KeyW'); await p.keyboard.down('KeyA'); await p.waitForTimeout(1200); await p.keyboard.up('KeyA'); await p.waitForTimeout(500); await p.keyboard.up('KeyW');
  await p.waitForTimeout(300); await shot('04-inside'); console.log(JSON.stringify(await st()));
  // light the lamp if near
  await p.keyboard.press('KeyE'); await p.waitForTimeout(400); await shot('05-lamp'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // go fight: walk toward foes and attack
  for (let i = 0; i < 40; i++) {
    const s = await p.evaluate(() => { const w = BM.game.world, h = w.hero; const f = w.foes().sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; return f ? { dx: f.x - h.x, dz: f.z - h.z } : null; });
    if (!s) break; const d = Math.hypot(s.dx, s.dz);
    // world dir -> screen keys: sx = (mx - mz)/sqrt2, sy = (mx + mz)/sqrt2
    const sx = (s.dx - s.dz), sy = (s.dx + s.dz); const keys = [];
    if (d > 1.8) { if (sx > 0.4 * d) keys.push('KeyD'); if (sx < -0.4 * d) keys.push('KeyA'); if (sy > 0.4 * d) keys.push('KeyS'); if (sy < -0.4 * d) keys.push('KeyW'); }
    for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(200); for (const k of keys) await p.keyboard.up(k);
    if (d < 2.6) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); await p.keyboard.press('KeyJ'); }
    if (i === 6) await shot('06-fight'); if (i === 9) { await p.keyboard.press('Space'); await p.waitForTimeout(60); await shot('07-dash'); }
    if (i === 14) await shot('08-fight2');
  }
  await shot('09-after'); console.log(JSON.stringify(await st()));
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close();
})();
