// Plays the opening in a headless browser: title -> new game -> warden -> skip to the city -> story ->
// courtyard fight -> the checkpoint lamp (it lights itself once the courtyard is clear: no button, no kneel).
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
  await p.keyboard.press('Enter'); await p.waitForTimeout(500); await shot('02-select');            // NEW GAME
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);                                       // this warden
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); // SKIP TO THE CITY
  await shot('02b-story');
  await p.keyboard.press('Escape'); await p.waitForFunction(() => BM.game.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(1500); await shot('03-start');
  console.log(JSON.stringify(await st()));
  // walk in short steps toward a point (world dir -> screen keys: sx = dx - dz, sy = dx + dz)
  const walkTo = async (x, z, near = 0.6) => {
    for (let i = 0; i < 70; i++) {
      const h = await p.evaluate(() => ({ x: BM.game.world.hero.x, z: BM.game.world.hero.z })); const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz); if (d < near) return true;
      const sx = dx - dz, sy = dx + dz, keys = []; if (sx > 0.5 * d) keys.push('KeyD'); if (sx < -0.5 * d) keys.push('KeyA'); if (sy > 0.5 * d) keys.push('KeyS'); if (sy < -0.5 * d) keys.push('KeyW');
      for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(Math.min(220, 60 + d * 40)); for (const k of keys) await p.keyboard.up(k);
    }
    return false;
  };
  // through the city gate to the courtyard lamp
  await walkTo(-5, 10.6); await walkTo(-6.4, 7.1, 0.5);
  await p.waitForTimeout(300); await shot('04-inside'); console.log(JSON.stringify(await st()));
  // go fight: walk toward foes and attack (until the courtyard's waves are all down; a slow machine needs more rounds)
  for (let i = 0; i < 180; i++) {
    const s = await p.evaluate(() => { const w = BM.game.world, h = w.hero; if ((BM.game.encs.find((e) => e.id === 'court') || {}).state === 'done') return null; const f = w.foes().sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; return f ? { dx: f.x - h.x, dz: f.z - h.z } : null; });
    if (!s) break; const d = Math.hypot(s.dx, s.dz);
    // world dir -> screen keys: sx = (mx - mz)/sqrt2, sy = (mx + mz)/sqrt2
    const sx = (s.dx - s.dz), sy = (s.dx + s.dz); const keys = [];
    if (d > 1.8) { if (sx > 0.4 * d) keys.push('KeyD'); if (sx < -0.4 * d) keys.push('KeyA'); if (sy > 0.4 * d) keys.push('KeyS'); if (sy < -0.4 * d) keys.push('KeyW'); }
    for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(200); for (const k of keys) await p.keyboard.up(k);
    if (d < 2.6) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); await p.keyboard.press('KeyJ'); }
    if (i === 6) await shot('06-fight'); if (i === 9) { await p.keyboard.press('Space'); await p.waitForTimeout(60); await shot('07-dash'); }
    if (i === 14) await shot('08-fight2');
  }
  await shot('09-after'); console.log(JSON.stringify(await st()), 'courtyard', await p.evaluate(() => (BM.game.encs.find((e) => e.id === 'court') || {}).state));
  // the courtyard is clear: walk back toward its lamp; within 3.5 m and with no foe hunting it lights by
  // itself (checkpoint, full health, saved), and the warden keeps walking
  const lampAt = await p.evaluate(() => { const l = BM.game.level.lamps.find((x) => x.id === 'court') || BM.game.level.lamps[0]; return { id: l.id, x: l.x, z: l.z }; });
  console.log('lit on the way in (before the fight):', await p.evaluate(() => JSON.stringify(BM.game.level.lamps.map((l) => l.id + ':' + l.h.lit))));
  await p.evaluate((l) => { const h = BM.game.world.hero; h.hp = Math.round(h.maxHp * 0.5); h.x = l.x + 7; h.z = l.z + 1.5; }, lampAt);
  await p.waitForFunction(() => !BM.game.world.combat, null, { timeout: 15000 }).catch(() => {});
  await walkTo(lampAt.x + 2.4, lampAt.z + 1.2, 0.6); await p.waitForTimeout(400); await shot('10-lamp-lit');
  const lit = await p.evaluate(() => ({ lamp: BM.game.save.lamp, hpFull: BM.game.world.hero.hp === BM.game.world.hero.maxHp, state: BM.game.world.hero.state, prompt: BM.game.prompt }));
  console.log('lamp lit by walking up:', lit.lamp && lit.lamp.endsWith(lampAt.id) && lit.hpFull ? 'yes' : 'NO', JSON.stringify(lit));
  // once per visit: hurt again beside it, nothing; walk away more than 6 m and back, restored
  await p.evaluate(() => { BM.game.world.hero.hp = Math.round(BM.game.world.hero.maxHp * 0.5); }); await p.waitForTimeout(500);
  const stay = await p.evaluate(() => BM.game.world.hero.hp < BM.game.world.hero.maxHp);
  await p.evaluate((l) => { const h = BM.game.world.hero; h.x = l.x + 7; h.z = l.z + 1.5; }, lampAt); await p.waitForTimeout(300);
  await walkTo(lampAt.x + 2.4, lampAt.z + 1.2, 0.6); await p.waitForTimeout(400);
  const back = await p.evaluate(() => BM.game.world.hero.hp === BM.game.world.hero.maxHp);
  console.log('restore once per visit:', stay && back ? 'yes' : 'NO', JSON.stringify({ stayedHurt: stay, restoredOnReturn: back }));
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close();
})();
