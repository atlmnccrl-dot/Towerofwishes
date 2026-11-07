// HOLDFAST - phone check: emulated iPhones in landscape, touch taps on the world and the HUD,
// then save, reload the page and Continue. Usage:
// NODE_PATH=$(npm root -g) node holdfast/test/phone.js [outdir] [url]
const { chromium, devices } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-phone';
const url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); };
  for (const name of ['iPhone 13 landscape', 'iPhone SE landscape']) {
    const context = await browser.newContext(devices[name]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const ev = (fn, a) => page.evaluate(fn, a);
    const tag = name.replace(/ /g, '_');
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 30000 });
    await page.tap('#t-new'); await page.waitForTimeout(300); await page.tap('#p-begin'); await page.waitForTimeout(1500);
    await page.touchscreen.tap(300, 180); await page.waitForTimeout(800);   // skip the opening
    await page.screenshot({ path: out + '/' + tag + '-start.png' });
    // Tap the clearing (camera centred on it first) to make camp.
    const c = await ev(() => { const st = HF.debug.G.st; HF.R.cam.x = (st.clearing.x + 0.5) * 32; HF.R.cam.y = (st.clearing.y + 0.5) * 32; return HF.R.w2s((st.clearing.x + 0.5) * 32, (st.clearing.y + 0.5) * 32); });
    await page.waitForTimeout(200); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(500);
    check(await ev(() => !!HF.debug.G.st.camp), name + ': touch tap makes camp');
    // Tap a tree.
    const t = await ev(() => { const st = HF.debug.G.st; for (const id in st.units) if (st.units[id].side === 'a') delete st.units[id]; const n = Object.values(st.nodes).filter(n => n.type === 'tree').sort((a, b) => Math.hypot(a.x - st.clearing.x, a.y - st.clearing.y) - Math.hypot(b.x - st.clearing.x, b.y - st.clearing.y))[0]; HF.R.cam.x = (n.x + 0.5) * 32; HF.R.cam.y = (n.y + 0.5) * 32; return HF.R.w2s((n.x + 0.5) * 32, (n.y + 1) * 32 - 8); });
    await page.waitForTimeout(200); await page.touchscreen.tap(t.x, t.y); await page.waitForTimeout(400);
    const tk = await ev(([x, y]) => { const u = HF.debug.S.present(HF.debug.G.st)[0]; const pk = HF.debug.pickAt(x, y); return { task: u.task && u.task.t, pick: pk.unit ? 'unit ' + pk.unit.side : pk.node ? 'node ' + pk.node.type : pk.b ? 'b' : 'ground', sel: HF.debug.U.sel, cine: HF.debug.C.busy(), open: HF.debug.U.open, mode: HF.debug.U.mode }; }, [t.x, t.y]);
    check(tk.task === 'gather', name + ': touch tap on a tree orders gathering ' + JSON.stringify(tk));
    await ev(() => { const { G, S } = HF.debug; for (let k = 0; k < 2400 && G.st.res.wood < 12; k++) S.step(G.st, 0.05); });
    await ev(() => { const { G, S } = HF.debug; G.st.res.stone = Math.max(8, G.st.res.stone); G.st.res.wood = Math.max(12, G.st.res.wood); for (let k = 0; k < 40; k++) S.step(G.st, 0.05); });
    await page.waitForTimeout(400);
    // Build drawer by touch.
    await page.tap('#act-build'); await page.waitForTimeout(400);
    await page.screenshot({ path: out + '/' + tag + '-drawer.png' });
    await page.tap('.card[data-type="heart"]'); await page.waitForTimeout(300);
    await ev(() => { const st = HF.debug.G.st; HF.R.cam.x = (st.clearing.x + 0.5) * 32; HF.R.cam.y = (st.clearing.y + 0.5) * 32; });
    const p = await ev(() => { const st = HF.debug.G.st; return HF.R.w2s((st.clearing.x + 0.5) * 32, (st.clearing.y + 0.5) * 32); });
    await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(300);
    await page.screenshot({ path: out + '/' + tag + '-place.png' });
    await page.tap('#place-ok'); await page.waitForTimeout(300);
    check(await ev(() => !!HF.debug.S.heart(HF.debug.G.st)), name + ': campfire placed by touch');
    await ev(() => { const { G, S } = HF.debug; for (let k = 0; k < 1200; k++) S.step(G.st, 0.05); });
    // Select the survivor by tapping them, check the panel fits on screen.
    const drain = () => ev(() => { const C = HF.debug.C; HF.debug.G.setSpeed(0); for (let k = 0; k < 20 && (C.busy() || C.queue.length); k++) { if (C.busy()) C.skip(); else C.update(0.01, HF.debug.G.st); } C.returnTo = null; });
    await drain(); await page.waitForTimeout(600); await drain();
    const u = await ev(() => { const u = HF.debug.S.present(HF.debug.G.st)[0]; HF.debug.C.returnTo = null; HF.R.cam.x = u.x; HF.R.cam.y = u.y; return HF.R.w2s(u.x, u.y - 16); });
    await page.waitForTimeout(150); await page.touchscreen.tap(u.x, u.y); await page.waitForTimeout(500);
    const box = await page.$eval('#panel', el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: window.innerHeight, cls: el.className }; });
    check(box.cls !== 'hidden' && box.bottom <= box.h + 1 && box.top >= 0, name + ': selection panel fits (' + Math.round(box.top) + '-' + Math.round(box.bottom) + ' of ' + box.h + ')');
    await page.screenshot({ path: out + '/' + tag + '-panel.png' });
    // HUD overlap: the top bar must not overflow the screen.
    const top = await page.$eval('#top', el => { const r = el.getBoundingClientRect(); return { right: r.right, w: window.innerWidth, sw: el.scrollWidth, cw: el.clientWidth }; });
    check(top.right <= top.w + 1, name + ': top bar fits');
    // Save, reload, continue.
    await drain();
    const before = await ev(() => { const { G, S } = HF.debug; G.setSpeed(0); G.save(false); return { day: S.day(G.st), wood: Math.round(G.st.res.wood), b: Object.keys(G.st.buildings).length, obj: G.st.obj }; });
    await page.reload(); await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 30000 });
    await page.waitForTimeout(400);
    check(await page.$eval('#t-continue', el => el.style.display !== 'none'), name + ': Continue offered after reload');
    await page.tap('#t-continue'); await page.waitForTimeout(800);
    const after = await ev(() => { const { G, S } = HF.debug; return { day: S.day(G.st), wood: Math.round(G.st.res.wood), b: Object.keys(G.st.buildings).length, obj: G.st.obj }; });
    check(after.day === before.day && after.b === before.b && after.obj === before.obj && Math.abs(after.wood - before.wood) <= 1, name + ': save restored ' + JSON.stringify(after));
    await page.screenshot({ path: out + '/' + tag + '-continued.png' });
    check(!errors.length, name + ': no console errors ' + errors.join(' | '));
    await context.close();
  }
  await browser.close();
  console.log(fails ? fails + ' FAILURES' : 'all phone checks passed');
  process.exit(fails ? 1 : 0);
})();
