// iPhone-sized landscape check with touch: title tap, story tap, then the joystick and the ATK button,
// the touch layout (ATK, DASH, ULT, TON, USE, II: no skill buttons, abilities fire from the attack) at every
// button size and buffer height, and the HUD at each button size with a tonic (tapped on TON) healing.
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
  // a tap registers if the hero swings (combo) or a bolt leaves (shoot): either moves the combo counter or the id counter
  const mark = () => p.evaluate(() => ({ state: BM.game.world.hero.state, combo: BM.game.world.hero.combo, id: BM.game.world.nextId }));
  const m0 = await mark();
  await touch('touchStart', [{ x: atk.x, y: atk.y, id: 2 }]); await p.waitForTimeout(120); const m1 = await mark(); await touch('touchEnd', []);
  await p.waitForTimeout(150); await p.screenshot({ path: out + '/05-attack.png' }); const m2 = await mark();
  const ok = m1.state !== 'idle' || m1.combo !== m0.combo || m2.combo !== m0.combo || m2.id > m0.id;
  console.log('ATK tap registered:', ok ? 'yes' : 'NO', JSON.stringify([m0, m1, m2]));
  // the buttons: no skill buttons any more
  const ids = await p.evaluate(() => BM.game.input.layout.map((b) => b.id).join(','));
  console.log('touch buttons:', ids, ids.includes('sk') ? 'NO (skill buttons still there)' : 'ok');
  // geometry: on screen, clear of each other, at 1.15 / 1.3 / 1.5 and buffer heights 180-240, with and without notch insets
  const geo = await p.evaluate(() => {
    const ui = BM.game.ui; const errs = []; let n = 0;
    for (const s of [1.15, 1.3, 1.5]) for (let h = 180; h <= 240; h += 10) for (const asp of [16 / 10, 16 / 9, 19.5 / 9]) for (const safe of [{ l: 0, r: 0, b: 0 }, { l: 23.5, r: 23.5, b: 10.5 }]) {
      const w = Math.ceil(h * asp); const u = Object.create(Object.getPrototypeOf(ui)); Object.assign(u, { w, h, safe, touchScale: s, t: 0 });
      const L = u.touchLayout({ world: BM.game.world, prompt: 'USE' }).filter((b) => !b.hidden); n++;
      for (const b of L) if (b.x - b.r < 0 || b.x + b.r > w - safe.r || b.y - b.r < 0 || b.y + b.r > h - safe.b) errs.push(s + ' ' + w + 'x' + h + ' ' + b.id + ' off screen');
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y) < L[i].r + L[j].r + 2) errs.push(s + ' ' + w + 'x' + h + ' ' + L[i].id + '/' + L[j].id + ' overlap');
    }
    return { n, errs: errs.slice(0, 8), bad: errs.length };
  });
  console.log('layout check:', geo.n, 'layouts,', geo.bad ? geo.bad + ' problems ' + JSON.stringify(geo.errs) : 'all on screen, no overlaps');
  // a tonic at each button size: tap TON with the hero hurt, then look at the heal on the bar and over the head
  const tonTap = async () => { const q = await p.evaluate(() => { const b = BM.game.input.layout.find((x) => x.id === 'heal'); const k = BM.r.scale / BM.r.dpr; return { x: b.x * k, y: b.y * k }; }); await touch('touchStart', [{ x: q.x, y: q.y, id: 3 }]); await p.waitForTimeout(80); await touch('touchEnd', []); };
  for (const [i, sc] of [[0, 1.15], [1, 1.3], [2, 1.5]]) {
    await p.evaluate((sc) => { const g = BM.game, h = g.world.hero; g.ui.touchScale = sc; h.hp = Math.round(h.maxHp * 0.4); h.tonics = Math.max(1, h.tonics); if (h.cds) { h.cds[0] = 0; h.cds[1] = 3; h.cdMax[1] = 8; } g.ui.gain = null; }, sc);
    await p.waitForTimeout(250); const t0 = await p.evaluate(() => ({ tonics: BM.game.world.hero.tonics, state: BM.game.world.hero.state }));
    await tonTap();
    // the game answers 'drink' and 'heal' (game.js): the flask, the motes, the bar's green flash and "+amt" over the head
    let healed = false; for (let k = 0; k < 20 && !healed; k++) { await p.waitForTimeout(100); healed = await p.evaluate(() => !!BM.game.ui.gain && BM.game.ui.floats.length > 0); }
    const t1 = await p.evaluate(() => ({ tonics: BM.game.world.hero.tonics, state: BM.game.world.hero.state, anim: BM.game.world.hero.anim }));
    const bh = await p.evaluate(() => BM.r.bw + 'x' + BM.r.bh); // the dynamic resolution may have lowered the buffer (the emulated iPhone is not "HeadlessChrome")
    console.log('touch size', sc, 'buffer ' + bh + ',', healed ? 'TON tap: the tonic was drunk and the heal shown' : 'TON tap: NO heal shown ' + JSON.stringify([t0, t1]));
    await p.waitForTimeout(150); await p.screenshot({ path: out + '/06-hud-' + sc + '.png' });
  }
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close();
})();
