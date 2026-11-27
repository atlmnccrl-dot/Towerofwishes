// Touch controls through real pointer events at phone-landscape size (844x390, like an iPhone).
// NODE_PATH=$(npm root -g) node test/touch.js
const { chromium } = require('playwright');
const path = require('path');
const { start } = require('./serve');
const HL_angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
(async () => {
  const srv = await start(path.resolve(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${srv.address().port}/index.html`); await page.waitForTimeout(1500);
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  // tap "Begin" on the title screen
  const btn = await page.evaluate(() => { const r = HL.UI.regions.find((r) => r.w >= 110); const G = HL.G; return r && { x: (r.x + r.w / 2) * 844 / G.W, y: (r.y + r.h / 2) * 390 / G.H }; });
  await page.touchscreen.tap(btn.x, btn.y); await page.waitForTimeout(400);
  const MAP = (x, y, s) => ({ x: x * 844 / s.W, y: y * 390 / s.H });
  // the opening plays: skip it with the Skip button
  check('Begin plays the opening cutscene', await page.evaluate(() => HL.G.state === 'cut'));
  { const sk = await page.evaluate(() => { const G = HL.G, r = HL.UI.regions[HL.UI.regions.length - 1]; return { x: r.x + r.w / 2, y: r.y + r.h / 2, W: G.W, H: G.H }; });
    const pt = MAP(sk.x, sk.y, sk); await page.touchscreen.tap(pt.x, pt.y); await page.waitForTimeout(300); }
  check('Skip ends it; the game starts', await page.evaluate(() => HL.G.state === 'play'));
  const fist = await page.evaluate(() => { const G = HL.G, c = HL.Input.layout.find((c) => c.id === 'attack'); return { x: c.x * 844 / G.W, y: c.y * 390 / G.H }; });
  await page.touchscreen.tap(fist.x, fist.y); await page.waitForTimeout(50);
  check('attack button punches before you find a weapon', await page.evaluate(() => !HL.G.eq.weapon && HL.G.player.state === 'attack'));
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => { const G = HL.G; G.enemies = []; G.give('rusted_sword'); return { W: G.W, H: G.H, scale: G.scale, layout: HL.Input.layout.map((c) => ({ id: c.id, x: c.x * 844 / G.W, y: c.y * 390 / G.H, r: c.r * 844 / G.W })) }; });
  console.log('buffer', info.W + 'x' + info.H, 'scale', info.scale, '-> attack button diameter', Math.round(info.layout[0].r * 2) + ' CSS px');
  // drag the floating joystick to the right with a pointer
  const x0 = await page.evaluate(() => HL.G.player.x);
  await page.mouse.move(120, 280); await page.mouse.down(); await page.mouse.move(170, 280, { steps: 5 });
  await page.waitForTimeout(700);
  const mid = await page.evaluate(() => ({ x: HL.G.player.x, joy: !!HL.Input.st.joy }));
  await page.mouse.up(); await page.waitForTimeout(200);
  check('joystick drag moves the Wayfarer right', mid.joy && mid.x > x0 + 15, `dx=${(mid.x - x0).toFixed(1)}`);
  check('releasing the stick stops input', await page.evaluate(() => !HL.Input.st.joy));
  const at = (id) => info.layout.find((c) => c.id === id);
  await page.touchscreen.tap(at('attack').x, at('attack').y); await page.waitForTimeout(60);
  check('attack button swings the weapon', await page.evaluate(() => HL.G.player.state === 'attack'));
  await page.waitForTimeout(500);
  // press the attack button and drag up-left: the strike goes that way
  const A = at('attack');
  await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(A.x - 60, A.y - 60, { steps: 6 }); await page.waitForTimeout(120);
  const aiming = await page.evaluate(() => HL.G.player.aimA);
  await page.screenshot({ path: '/tmp/hl-aim.png' });
  await page.mouse.up(); await page.waitForTimeout(60);
  const fa = await page.evaluate(() => ({ st: HL.G.player.state, face: HL.G.player.face, yaw: HL.G.thirdPerson() ? HL.G.camYaw : -Math.PI / 2 }));
  // drag up-left on screen = up-left relative to the camera
  const fx = Math.cos(fa.yaw), fy = Math.sin(fa.yaw), rx = -fy, ry = fx, sx = -1, sy = -1, want = Math.atan2(ry * sx - fy * sy, rx * sx - fx * sy);
  check('drag from attack aims; release strikes that way (relative to the camera)', aiming != null && fa.st === 'attack' && Math.abs(HL_angDiff(fa.face, want)) < 0.3, JSON.stringify({ aiming, ...fa, want }));
  await page.waitForTimeout(500);
  await page.touchscreen.tap(at('dodge').x, at('dodge').y); await page.waitForTimeout(60);
  check('dodge button rolls', await page.evaluate(() => HL.G.player.state === 'roll'));
  await page.waitForTimeout(500);
  await page.touchscreen.tap(at('menu').x, at('menu').y); await page.waitForTimeout(200);
  check('pack button opens the item screen', await page.evaluate(() => HL.G.state === 'menu'));
  const close = await page.evaluate(() => { const G = HL.G, r = HL.UI.regions.find((r) => r.x > G.W - 40 && r.y < 5); return { x: (r.x + r.w / 2) * 844 / G.W, y: (r.y + r.h / 2) * 390 / G.H }; });
  await page.touchscreen.tap(close.x, close.y); await page.waitForTimeout(200);
  check('x closes it', await page.evaluate(() => HL.G.state === 'play'));
  // interact via the context button next to the cart
  await page.evaluate(() => { const o = HL.G.world.obj('c_cart'); HLDebug.tp(o.x, o.y + 7); });
  await page.waitForTimeout(200);
  await page.touchscreen.tap(at('interact').x, at('interact').y); await page.waitForTimeout(200);
  check('interact button searches the cart (note opens)', await page.evaluate(() => HL.G.state === 'dialog' && HL.G.flags['c:c_cart'] === 1));
  await page.touchscreen.tap(400, 200); await page.waitForTimeout(200);
  check('tap closes the note', await page.evaluate(() => HL.G.state === 'play'));
  await page.screenshot({ path: '/tmp/hl-touch.png' });
  console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
