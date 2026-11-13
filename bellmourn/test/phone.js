// iPhone-sized landscape check with touch: title tap, story tap, then the joystick and ATK/DASH buttons.
// NODE_PATH=$(npm root -g) node bellmourn/test/phone.js <outdir>
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-phone'; fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => window.BM && BM.ready && BM.frames > 5, null, { timeout: 120000 });
  const info = await p.evaluate(() => ({ bw: BM.r.bw, bh: BM.r.bh, scale: BM.r.scale, dpr: BM.r.dpr, canvas: [BM.r.canvas.width, BM.r.canvas.height] }));
  console.log('buffer', JSON.stringify(info));
  await p.screenshot({ path: out + '/01-title.png' });
  // tap NEW GAME: find its rect
  const r = await p.evaluate(() => { const m = BM.game.menuRects.find((x) => BM.game.titleItems[x.i].id === 'new'); const k = BM.r.scale / BM.r.dpr; return { x: (m.x + m.w / 2) * k, y: (m.y + m.h / 2) * k }; });
  await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(800); await p.screenshot({ path: out + '/02-select.png' });
  // choose a warden by tapping their name twice, then SKIP TO THE CITY
  const rectTap = async (pred) => { const q = await p.evaluate((src) => { const f = new Function('r', 'return ' + src); const m = BM.game.menuRects.find(f); if (!m) return null; const k = BM.r.scale / BM.r.dpr; return { x: (m.x + m.w / 2) * k, y: (m.y + m.h / 2) * k }; }, pred); if (q) await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(500); return !!q; };
  await rectTap('r.i === 1'); await rectTap('r.i === 1'); await p.screenshot({ path: out + '/02b-select-menu.png' });
  await rectTap('r.i === 1');
  console.log('after select:', await p.evaluate(() => BM.game.state));
  for (let i = 0; i < 16 && (await p.evaluate(() => BM.game.state)) === 'story'; i++) { await p.touchscreen.tap(420, 200); await p.waitForTimeout(250); }
  await p.waitForFunction(() => BM.game.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/03-play.png' });
  // drag the joystick up-right with CDP touch events, then tap ATK
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const before = await p.evaluate(() => ({ x: BM.game.world.hero.x, z: BM.game.world.hero.z }));
  await touch('touchStart', [{ x: 120, y: 300, id: 1 }]);
  for (let i = 0; i < 10; i++) { await touch('touchMove', [{ x: 120 + i * 4, y: 300 - i * 4, id: 1 }]); await p.waitForTimeout(60); }
  await p.waitForTimeout(800); await p.screenshot({ path: out + '/04-stick.png' });
  await touch('touchEnd', []);
  const after = await p.evaluate(() => ({ x: BM.game.world.hero.x, z: BM.game.world.hero.z }));
  console.log('moved', JSON.stringify(before), '->', JSON.stringify(after));
  const atk = await p.evaluate(() => { const b = BM.game.input.layout.find((x) => x.id === 'atk'); const k = BM.r.scale / BM.r.dpr; return { x: b.x * k, y: b.y * k }; });
  await touch('touchStart', [{ x: atk.x, y: atk.y, id: 2 }]); await p.waitForTimeout(40); const st = await p.evaluate(() => BM.game.world.hero.state); await touch('touchEnd', []);
  await p.waitForTimeout(100); await p.screenshot({ path: out + '/05-attack.png' });
  console.log('after ATK tap hero state:', st, await p.evaluate(() => BM.game.world.hero.state));
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close();
})();
