// A touch-only run on a phone-sized screen: title → new game → scene taps → fight with the stick and buttons → results.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '/tmp/ef-phone'; const port = process.argv[3] || 8765; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/emberfall/index.html`); await page.evaluate(() => localStorage.clear()); await page.goto(`http://127.0.0.1:${port}/emberfall/index.html`);
  await page.waitForFunction(() => window.EF && EF.main && EF.main.state === 'title', null, { timeout: 60000 }); await page.waitForTimeout(500);
  // buffer → CSS px
  const k = await page.evaluate(() => ({ s: EF.R.scale / EF.R.dpr, ox: EF.R.offX / EF.R.dpr, oy: EF.R.offY / EF.R.dpr, W: EF.R.W }));
  const tap = async (bx, by) => page.touchscreen.tap(k.ox + bx * k.s, k.oy + by * k.s);
  await page.screenshot({ path: out + '/p1-title.png' }); await tap(78, 139); // NEW GAME
  await page.waitForFunction(() => EF.main.state === 'scene'); await page.waitForTimeout(700);
  for (let i = 0; i < 6; i++) { await tap(k.W / 2, 135); await page.waitForTimeout(450); } await page.screenshot({ path: out + '/p2-scene.png' });
  await tap(k.W - 12, 262); // SKIP
  await page.waitForFunction(() => EF.main.state === 'fight'); await page.waitForTimeout(1800); await page.screenshot({ path: out + '/p3-fight.png' });
  // drag the floating stick to the right
  const sx = k.ox + 120 * k.s, sy = k.oy + 200 * k.s;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + i * 6, y: sy, id: 1 }] }); await page.waitForTimeout(60); }
  await page.waitForTimeout(900); await page.screenshot({ path: out + '/p4-stick.png' });
  const moved = await page.evaluate(() => ({ x: Math.round(EF.main.combat.hostEnt().x), vec: EF.main.stickVec }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const L = await page.evaluate(() => EF.R.touchLayout()); const btn = id => L.buttons.find(b => b.id === id);
  for (let i = 0; i < 5; i++) { await tap(btn('attack').x, btn('attack').y); await page.waitForTimeout(220); }
  await tap(btn('dodge').x, btn('dodge').y); await page.waitForTimeout(200); await tap(btn('special').x, btn('special').y); await page.waitForTimeout(400); await page.screenshot({ path: out + '/p5-buttons.png' });
  const st = await page.evaluate(() => ({ hits: EF.main.combat.stats.hits, cd: Math.round(EF.main.combat.hostEnt().cd) }));
  await page.evaluate(() => { EF.main.combat.auto = true; }); await page.waitForFunction(() => EF.main.state === 'results', null, { timeout: 120000 }); await page.waitForTimeout(400); await page.screenshot({ path: out + '/p6-results.png' });
  await tap(k.W / 2, 232); await page.waitForTimeout(500); const after = await page.evaluate(() => EF.main.state);
  console.log(JSON.stringify({ moved, st, after })); console.log('errors:', errors.length ? errors : 'none'); await browser.close(); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
