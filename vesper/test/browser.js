// Headless check: title, a scene, a fight, a boss card, every beat of both moon arts, the boon pick,
// defeat, pause, settings, credits, every arena and the touch layout. Screenshots each and reports
// console errors. Usage: NODE_PATH=$(npm root -g) node vesper/test/browser.js <outdir> [port]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '/tmp/vesper-shots', port = process.argv[3] || 8765;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const url = `http://127.0.0.1:${port}/vesper/index.html`;
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.VS && VS.main && VS.main.state === 'title', null, { timeout: 60000 });
  const shot = async (name, wait) => { await page.waitForTimeout(wait == null ? 150 : wait); await page.screenshot({ path: `${out}/${name}.png` }); };
  const button = (text) => page.locator('#ui .btn', { hasText: text }).first().click();
  await shot('01-title', 900);

  await button('New night');
  await page.waitForFunction(() => VS.ui.current === 'heroes'); await shot('01b-heroes', 600);
  await page.locator('#ui .card').first().click();
  await page.waitForFunction(() => VS.main.state === 'scene');
  await shot('02-card', 700);
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await shot('03-line', 500);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => VS.main.state === 'fight');
  await shot('04-fight', 1500);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(130); }
  await shot('05-combo', 40);
  await page.keyboard.press('Space'); await page.waitForTimeout(120); await page.keyboard.press('KeyJ'); await shot('06-dash-cut', 60);
  await page.keyboard.press('Escape'); await shot('07-pause', 400);
  if (!(await page.evaluate(() => VS.ui.current === 'pause'))) errors.push('pause menu did not open');
  await button('Resume'); await page.waitForTimeout(200);
  await page.evaluate(() => { VS.main.save.opts.auto = true; });
  await page.waitForFunction(() => VS.main.fight.card, null, { timeout: 90000 });
  await shot('08-boss-card', 500);
  await page.waitForFunction(() => !VS.main.fight.card, null, { timeout: 5000 });
  await shot('09-boss-fight', 1500);

  // The Last Ditch Effort, beat by beat (frozen), from the theatre.
  await page.evaluate(() => { VS.main.save.opts.auto = false; VS.main.theatre(); });
  await page.waitForFunction(() => VS.main.fight && VS.main.fight.s.cine, null, { timeout: 5000 });
  const beats = await page.evaluate(() => VS.cine.BEATS.ldx);
  await page.evaluate(() => { VS.main.hold = true; });
  for (const [name, a, b] of beats) { await page.evaluate((t) => { VS.main.fight.s.cine.t = t; }, a + (b - a) * 0.6); await shot(`10-ldx-${a.toFixed(2)}-${name}`, 80); }
  await page.evaluate(() => { VS.main.hold = false; });
  await page.waitForFunction(() => !VS.main.fight.s.cine, null, { timeout: 12000 });
  await shot('11-after-ldx', 250);
  console.log('after ldx', await page.evaluate(() => { const s = VS.main.fight.s; return s.hero.hp + '/' + s.hero.maxHp + ' ' + VS.sim.foes(s).map((u) => u.key + ':' + u.hp).join(','); }));
  await page.waitForFunction(() => VS.main.state === 'title', null, { timeout: 5000 });

  // The boon pick after a won hour.
  await page.evaluate(() => { VS.main.startFight(0); const s = VS.main.fight.s; s.stats.maxCombo = 14; s.stats.parries = 3; s.time = 41.2; s.result = 'win'; });
  await page.waitForFunction(() => VS.ui.current === 'boon'); await shot('12-boon', 500);
  await page.locator('#ui .card').first().click();
  await page.waitForFunction(() => VS.main.state === 'scene');
  console.log('after boon', await page.evaluate(() => JSON.stringify(VS.main.save.boons) + ' stage ' + VS.main.save.stage));

  // Defeat.
  await page.evaluate(() => { VS.main.startFight(2); const s = VS.main.fight.s; s.hero.hp = 0; s.result = 'lose'; });
  await page.waitForFunction(() => VS.ui.current === 'lost'); await shot('13-lost', 400);
  await button('Try the hour again'); await page.waitForFunction(() => VS.main.state === 'fight');

  // Settings and credits.
  await page.evaluate(() => VS.main.title()); await page.waitForTimeout(200);
  await button('Settings'); await button('Music'); await shot('14-settings', 300);
  console.log('music after one press', await page.evaluate(() => VS.main.save.opts.music));
  await button('Back'); await button('Credits'); await shot('15-credits', 300); await button('Back');

  for (let i = 0; i < 6; i++) { await page.evaluate((i) => VS.main.startFight(i), i); await shot(`16-arena-${i}`, 1200); }
  await page.close();

  // A phone, touch controls.
  const ctx = await browser.newContext({ ...devices['iPhone 14 landscape'] });
  const ph = await ctx.newPage(); ph.on('pageerror', (e) => errors.push('PHONE ' + e.message));
  await ph.goto(url); await ph.waitForFunction(() => VS.main && VS.main.state === 'title', null, { timeout: 60000 });
  await ph.waitForTimeout(600); await ph.screenshot({ path: `${out}/17-phone-title.png` });
  await ph.evaluate(() => { VS.R.touch = true; VS.main.startFight(3); VS.main.save.opts.auto = true; });
  await ph.waitForFunction(() => VS.main.fight.s.wave === VS.main.fight.s.waves.length - 1 && !VS.main.fight.card, null, { timeout: 90000 });
  await ph.waitForTimeout(1500); await ph.screenshot({ path: `${out}/18-phone-boss.png` });
  await ctx.close();
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
