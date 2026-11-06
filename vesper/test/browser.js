// Headless check: title, a scene, a fight, a boss card, every beat of both moon arts, defeat, a boon
// pick, settings. Screenshots each and reports console errors.
// Usage: NODE_PATH=$(npm root -g) node vesper/test/browser.js <outdir> [port]   (serve the repo root)
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '/tmp/vesper-shots', port = process.argv[3] || 8765;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const url = `http://127.0.0.1:${port}/vesper/index.html`;
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.VS && VS.main && VS.main.state === 'title', null, { timeout: 60000 });
  const shot = async (name, wait) => { await page.waitForTimeout(wait == null ? 120 : wait); await page.screenshot({ path: `${out}/${name}.png` }); };
  await shot('01-title', 900);

  // New night: the prologue scene.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => VS.main.state === 'scene');
  await shot('02-card', 700);
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await shot('03-line', 500);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => VS.main.state === 'fight');
  await shot('04-fight', 1500);
  // Play a little: walk right, cut, dash, parry.
  await page.keyboard.down('KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyD');
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(140); }
  await shot('05-combo', 60);
  await page.keyboard.press('Space'); await shot('06-dash', 90);
  // Auto until the boss arrives, then the card.
  await page.evaluate(() => { VS.main.save.opts.auto = true; });
  await page.waitForFunction(() => VS.main.fight.card, null, { timeout: 90000 });
  await shot('07-boss-card', 500);
  await page.waitForFunction(() => !VS.main.fight.card, null, { timeout: 5000 });
  await shot('08-boss-fight', 1500);
  const r1 = await page.evaluate(() => { const s = VS.main.fight.s; return { wave: s.wave, hp: s.hero.hp, moon: s.moon, boss: VS.sim.foes(s).map((u) => u.key + ':' + u.hp) }; });
  console.log('fight', JSON.stringify(r1));

  // The Last Ditch Effort, beat by beat (frozen), from the theatre.
  await page.evaluate(() => { VS.main.save.opts.auto = false; VS.main.go('title'); VS.main.theatre(); });
  await page.waitForFunction(() => VS.main.fight && VS.main.fight.s.cine, null, { timeout: 5000 });
  const beats = await page.evaluate(() => VS.cine.BEATS.ldx);
  await page.evaluate(() => { VS.main.hold = true; });
  for (const [name, a, b] of beats) for (const k of [0.35, 0.8]) {
    await page.evaluate((t) => { VS.main.fight.s.cine.t = t; }, a + (b - a) * k);
    await shot(`10-ldx-${String(a.toFixed(2)).padStart(5, '0')}-${name}-${Math.round(k * 100)}`, 80);
  }
  await page.evaluate(() => { VS.main.hold = false; });
  await page.waitForFunction(() => !VS.main.fight.s.cine, null, { timeout: 12000 });
  await shot('11-after-ldx', 250);
  const r2 = await page.evaluate(() => { const s = VS.main.fight.s; return { hero: s.hero.hp + '/' + s.hero.maxHp, boss: VS.sim.foes(s).map((u) => u.key + ':' + u.hp + '/' + u.maxHp) }; });
  console.log('after ldx', JSON.stringify(r2));

  // The Red Moon at full health.
  await page.evaluate(() => { const s = VS.main.fight.s; s.hero.hp = s.hero.maxHp; s.moon = 100; VS.sim.startArt(s); VS.main.hold = true; });
  const mb = await page.evaluate(() => VS.cine.BEATS.moon);
  for (const [name, a, b] of mb) { await page.evaluate((t) => { VS.main.fight.s.cine.t = t; }, a + (b - a) * 0.6); await shot(`12-moon-${name}`, 80); }
  await page.evaluate(() => { VS.main.hold = false; });

  // Defeat, a boon pick, settings.
  await page.evaluate(() => { VS.main.lost = { stage: 2 }; VS.main.go('lost'); });
  await shot('13-lost', 300);
  await page.evaluate(() => { VS.main.result = { stage: 1, stats: { maxCombo: 12, parries: 3, perfects: 2, arts: 2 }, time: 41.2 }; VS.main.boons = VS.DATA.BOONS.slice(0, 3); VS.main.go('boon'); });
  await shot('14-boon', 300);
  await page.mouse.click(384, 250); await page.waitForTimeout(400);
  console.log('after boon', await page.evaluate(() => VS.main.state + ' ' + JSON.stringify(VS.main.save.boons) + ' stage ' + VS.main.save.stage));
  await page.evaluate(() => VS.main.go('settings')); await shot('15-settings', 200);
  // Every stage's arena.
  for (let i = 0; i < 6; i++) { await page.evaluate((i) => { VS.main.startFight(i); }, i); await shot(`16-arena-${i}`, 900); }
  // A touch layout.
  await page.evaluate(() => { VS.R.touch = true; VS.main.startFight(3); }); await shot('17-touch', 900);
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
