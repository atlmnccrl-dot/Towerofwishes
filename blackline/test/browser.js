// Headless check: loads the game, plays a skirmish through the real input path,
// takes screenshots and fails on any console error.
// Usage: NODE_PATH=$(npm root -g) node test/browser.js /tmp/bl-shots [--phone]
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || '/tmp/bl-shots';
const phone = process.argv.includes('--phone');
fs.mkdirSync(out, { recursive: true });
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctxOpts = phone ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(2500);
  const shot = (n) => page.screenshot({ path: path.join(out, `${phone ? 'phone-' : ''}${n}.png`) });
  await shot('01-title');

  // start a skirmish by tapping the menu item (real input path)
  const r = await page.evaluate(() => window.BL.hud.regions.find((x) => x.arg === 'skirmish'));
  if (!r) throw new Error('no skirmish menu item');
  await page.mouse.click(r.x + 20, r.y + r.h / 2);
  await page.waitForTimeout(500);
  await shot('02-help');
  await page.mouse.click(300, 300); // dismiss help
  await page.waitForTimeout(300);

  // deploy a machine-gun team and a tank through the cards and a tap on the field
  async function deploy(type) {
    const card = await page.evaluate((t) => window.BL.hud.regions.find((x) => x.id === 'card' && x.arg === t), type);
    await page.mouse.click(card.x + card.w / 2, card.y + card.h / 2);
    await page.waitForTimeout(100);
    const vp = page.viewportSize();
    const px = await page.evaluate(() => window.BL.render.sx(window.__BL_GAME.S.field.bases[0]));
    await page.mouse.click(Math.min(vp.width - 60, Math.max(60, px)), Math.round(vp.height * 0.45));
    await page.waitForTimeout(150);
    return page.evaluate((t) => window.__BL_GAME.S.units.filter((u) => u.team === 0 && u.type === t).length, type);
  }
  const mgN = await deploy('mg');
  const scN = await deploy('scout');
  await shot('03-deployed');

  // select everything with the ALL button, order an attack-move toward sector A
  const all = await page.evaluate(() => window.BL.hud.regions.find((x) => x.id === 'cmd' && x.arg === 'all'));
  await page.mouse.click(all.x + all.w / 2, all.y + all.h / 2);
  const atk = await page.evaluate(() => window.BL.hud.regions.find((x) => x.id === 'cmd' && x.arg === 'attack'));
  await page.mouse.click(atk.x + atk.w / 2, atk.y + atk.h / 2);
  const ax = await page.evaluate(() => { const G = window.__BL_GAME; window.BL.R.cam.tx = 1100; return 0; });
  await page.waitForTimeout(800);
  const target = await page.evaluate(() => window.BL.render.sx(1300));
  await page.mouse.click(Math.min(page.viewportSize().width - 100, Math.max(100, target)), Math.round(page.viewportSize().height * 0.45));
  const orders = await page.evaluate(() => window.__BL_GAME.S.units.filter((u) => u.team === 0).map((u) => u.order.type + '@' + Math.round(u.order.x)));

  // fast-forward the battle in page (the same sim the loop steps), then look at it
  async function ff(sec) {
    await page.evaluate((s) => { const G = window.__BL_GAME; for (let i = 0; i < s * 30; i++) window.BL.step(G.S, window.BL.DT); }, sec);
  }
  await ff(45);
  await page.evaluate(() => { const G = window.__BL_GAME; const u = G.S.units.find((k) => k.team === 0 && k.alive); window.BL.R.cam.tx = u ? u.x + 150 : 1300; window.BL.R.cam.tz = 1.6; });
  await page.waitForTimeout(1200);
  await shot('04-advance-close');

  // give the player money and an armoured push to see vehicles and the helicopter fight
  await page.evaluate(() => { const S = window.__BL_GAME.S; S.teams[0].rp += 2000; });
  await deploy('tank');
  await deploy('heli');
  await page.evaluate(() => { const G = window.__BL_GAME; const S = G.S; window.BL.order(S, S.units.filter((u) => u.team === 0).map((u) => u.id), 'attack', 2350); });
  await ff(60);
  await page.evaluate(() => {
    const S = window.__BL_GAME.S;
    // aim the camera where the two sides are closest
    let best = 2400, bd = 1e9;
    for (const a of S.units) for (const b of S.units) if (a.team === 0 && b.team === 1 && a.alive && b.alive) { const d = Math.abs(a.x - b.x); if (d < bd) { bd = d; best = (a.x + b.x) / 2; } }
    window.BL.R.cam.tx = best; window.BL.R.cam.tz = 1.3;
  });
  await page.waitForTimeout(1200);
  await shot('05-fight');
  await page.evaluate(() => { window.BL.R.cam.tz = 0.2; });
  await page.waitForTimeout(1200);
  await shot('06-overview');

  // artillery on the enemy's side, seen up close
  await page.evaluate(() => { const S = window.__BL_GAME.S; S.teams[0].rp += 500; const e = S.units.find((u) => u.team === 1 && u.alive); window.BL.deploy(S, 0, 'arty', e ? e.x : 3500); window.BL.R.cam.tx = e ? e.x : 3500; window.BL.R.cam.tz = 1.2; });
  await page.waitForTimeout(4600);
  await shot('07-artillery');

  // pause menu
  const pz = await page.evaluate(() => window.BL.hud.regions.find((x) => x.id === 'pause'));
  await page.mouse.click(pz.x + pz.w / 2, pz.y + pz.h / 2);
  await page.waitForTimeout(300);
  await shot('08-paused');
  const resume = await page.evaluate(() => window.BL.hud.regions.find((x) => x.arg === 'resume'));
  await page.mouse.click(resume.x + 20, resume.y + resume.h / 2);

  // play on to the end
  await ff(900);
  await page.waitForTimeout(2600);
  const end = await page.evaluate(() => { const S = window.__BL_GAME.S; return { over: S.over, winner: S.winner, t: Math.round(S.t), tickets: S.teams.map((T) => Math.round(T.tickets)) }; });
  await shot('09-end');

  // frame timing over two seconds of live play
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); } requestAnimationFrame(f); }));

  console.log(JSON.stringify({ mgN, scN, orders, end, fps, errors }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) { console.error('console errors:', errors); process.exit(1); }
  if (!mgN || !scN) { console.error('deploy through the cards failed'); process.exit(1); }
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
