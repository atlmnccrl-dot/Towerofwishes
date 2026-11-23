// Phone held upright (or an in-app viewer that won't rotate): the game draws itself turned a quarter.
// Checks the picture is landscape inside a portrait screen and that taps and drags land where they should.
// NODE_PATH=$(npm root -g) node test/portrait.js
const { chromium } = require('playwright');
const path = require('path');
const { start } = require('./serve');
(async () => {
  const srv = await start(path.resolve(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${srv.address().port}/index.html`); await page.waitForTimeout(2500);
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const st = await page.evaluate(() => ({ rot: HL.G.rot, W: HL.G.W, H: HL.G.H, loading: !!document.getElementById('loading') }));
  check('upright phone: game turned to landscape, loading screen gone', st.rot && st.W > st.H && !st.loading, JSON.stringify(st));
  // logical (buffer) point -> screen point for the quarter turn
  const toScreen = (bx, by, s) => { const lx = (bx / s.W) * 844, ly = (by / s.H) * 390; return { x: 390 - ly, y: lx }; };
  const r = await page.evaluate(() => { const r = HL.UI.regions.find((r) => r.w >= 110); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
  const b = toScreen(r.x, r.y, st);
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(500);
  check('tap on Begin (turned) starts the game', await page.evaluate(() => HL.G.state === 'play'));
  await page.evaluate(() => { HL.G.enemies = []; });
  const x0 = await page.evaluate(() => HL.G.player.x);
  // drag the stick to the player's right = down the physical screen
  const s0 = toScreen(st.W * 0.15, st.H * 0.7, st), s1 = toScreen(st.W * 0.15 + 18, st.H * 0.7, st);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s1.x, s1.y, { steps: 5 }); await page.waitForTimeout(600);
  const x1 = await page.evaluate(() => HL.G.player.x); await page.mouse.up();
  check('stick drag moves the Wayfarer right in game space', x1 > x0 + 12, 'dx=' + (x1 - x0).toFixed(1));
  // the attack button, turned: bare hands first, then with the sword
  const btn = await page.evaluate(() => { const c = HL.Input.layout.find((c) => c.id === 'attack'); return { x: c.x, y: c.y }; });
  const ab = toScreen(btn.x, btn.y, st);
  await page.waitForTimeout(400);
  check('starts without a weapon', await page.evaluate(() => !HL.G.eq.weapon));
  await page.touchscreen.tap(ab.x, ab.y); await page.waitForTimeout(50);
  check('attack button punches with bare hands (turned screen)', await page.evaluate(() => HL.G.player.state === 'attack'));
  await page.waitForTimeout(500);
  await page.evaluate(() => HL.G.give('rusted_sword'));
  // hold the stick and tap attack at the same time (two fingers)
  const cdp = await page.context().newCDPSession(page);
  const tp = (x, y, id) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(s0.x, s0.y, 1)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tp(s1.x, s1.y, 1)] });
  await page.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(s1.x, s1.y, 1), tp(ab.x, ab.y, 2)] });
  await page.waitForTimeout(50);
  const mid = await page.evaluate(() => ({ st: HL.G.player.state, joy: !!HL.Input.st.joy }));
  await page.waitForTimeout(40);
  await page.screenshot({ path: process.argv[2] || '/tmp/hl-portrait.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('sword strike while the other thumb holds the stick', mid.st === 'attack' && mid.joy, JSON.stringify(mid));
  console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
