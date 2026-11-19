// Headless walkthrough of the campaign flow through the real input path:
// title → campaign → mission 01 briefing (cinematic) → H-hour → play → closing shot →
// debrief with stars and the unlock → mission 02 briefing with the new unit's dossier.
// Usage: NODE_PATH=$(npm root -g) node test/flow.js /tmp/bl-flow [--phone]
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || '/tmp/bl-flow';
const phone = process.argv.includes('--phone');
fs.mkdirSync(out, { recursive: true });
const root = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const p = path.join(root, decodeURIComponent(u === '/' ? '/index.html' : u));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const context = await browser.newContext(phone ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForTimeout(2200);
  const pre = phone ? 'phone-' : '';
  const shot = (n) => page.screenshot({ path: path.join(out, pre + n + '.png') });
  const region = (id, arg) => page.evaluate(([id, arg]) => window.BL.hud.regions.find((r) => r.id === id && (arg === undefined || r.arg === arg)), [id, arg]);
  const click = async (r) => { await page.mouse.click(r.x + Math.min(30, r.w / 2), r.y + r.h / 2); await page.waitForTimeout(250); };
  const state = () => page.evaluate(() => { const G = window.__BL_GAME; return { mode: G.mode, phase: G.phase, step: window.BL.cinema.CI.active ? window.BL.cinema.CI.steps[window.BL.cinema.CI.i].type : null }; });
  const log = [];

  await shot('f01-title');
  const skirmishLocked = !(await region('menu', 'skirmish'));
  await click(await region('menu', 'campaign'));
  await shot('f02-campaign');
  log.push(['campaign screen', await state()]);
  const m2Locked = await page.evaluate(() => !window.BL.campaign.missionOpen(window.__BL_GAME.progress, 1));
  await click(await region('begin'));

  // the briefing: catch each kind of step
  const seen = {};
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const s = await state();
    if (s.phase !== 'intro') break;
    if (s.step && !seen[s.step]) {
      seen[s.step] = true;
      await page.waitForTimeout(s.step === 'card' ? 1400 : 1800);
      await shot('f03-intro-' + s.step);
    }
    if (s.step === 'shot' && !seen.shot2) {
      const follow = await page.evaluate(() => !!window.BL.cinema.CI.steps[window.BL.cinema.CI.i].follow);
      if (follow) { seen.shot2 = true; await page.waitForTimeout(2600); await shot('f04-intro-rope'); }
    }
    await page.waitForTimeout(150);
  }
  log.push(['intro steps seen', Object.keys(seen)]);
  await page.waitForTimeout(1200);
  await shot('f05-hhour-play');
  const calmAfter = await page.evaluate(() => window.__BL_GAME.S.calm);

  // the first hint asks us to tap our squad: do it through the canvas
  await page.waitForTimeout(2500);
  const hint1 = await page.evaluate(() => window.__BL_GAME.hint && window.__BL_GAME.hint.text);
  await shot('f06-hint');
  const pos = await page.evaluate(() => { const S = window.__BL_GAME.S; const u = S.units.find((k) => k.team === 0 && k.alive && !k.members.some((m) => m.rappel)); const m = u.members.find((q) => q.alive); return { x: window.BL.render.sx(m.x), y: window.BL.render.sy(m.y + 5) }; });
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(300);
  const selected = await page.evaluate(() => window.__BL_GAME.selected.size);
  await page.waitForTimeout(3200);
  const hint2 = await page.evaluate(() => window.__BL_GAME.hint && window.__BL_GAME.hint.text);
  // order toward A by tapping the ground near the flag
  const ax = await page.evaluate(() => { const R = window.BL.R; R.cam.tx = R.cam.x = 1150; return window.BL.render.sx(1290); });
  await page.waitForTimeout(500);
  const ax2 = await page.evaluate(() => window.BL.render.sx(1290));
  const vp = page.viewportSize();
  await page.mouse.click(Math.max(40, Math.min(vp.width - 40, ax2)), Math.round(vp.height * 0.5));
  const order = await page.evaluate(() => window.__BL_GAME.S.units.filter((u) => u.team === 0).map((u) => u.order.type + '@' + Math.round(u.order.x)));
  await page.waitForTimeout(400);
  await shot('f07-order');

  // let an AI finish the mission on our side, then watch the closing shot and debrief
  await page.evaluate(() => { const G = window.__BL_GAME; G.S.ai[0] = window.BL.createAI(G.S, 0); G.S.teams[0].rp += 400; });
  let outroShot = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 90000) {
    await page.evaluate(() => { const G = window.__BL_GAME; if (G.phase === 'play') for (let i = 0; i < 30 * 20; i++) { window.BL.step(G.S, window.BL.DT); window.BL.campaign.tick(G.S, G.mission, G.ms, window.BL.DT); if (G.ms.result) break; } });
    const s = await state();
    if (s.phase === 'outro' && !outroShot) { outroShot = true; await page.waitForTimeout(1600); await shot('f08-outro'); }
    if (s.phase === 'debrief') break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2600);
  await shot('f09-debrief');
  const deb = await page.evaluate(() => { const G = window.__BL_GAME; return { result: G.ms.result, stars: G.stars, fresh: G.fresh, saved: localStorage.getItem('blackline.progress.v1') }; });

  // next mission: the MG gets its introduction
  const next = await region('menu', 'next');
  if (next) {
    await click(next);
    const t2 = Date.now();
    while (Date.now() - t2 < 40000) {
      const s = await state();
      if (s.step === 'unit') { await page.waitForTimeout(1600); await shot('f10-m2-dossier'); break; }
      if (s.phase !== 'intro') break;
      await page.waitForTimeout(200);
    }
    await page.mouse.click(vp.width / 2, vp.height / 2); // skip the rest
    await page.waitForTimeout(1500);
    await shot('f11-m2-play');
  }
  const m2 = await page.evaluate(() => { const G = window.__BL_GAME; return { mission: G.mission && G.mission.id, phase: G.phase, cards: window.BL.hud.regions.filter((r) => r.id === 'card').map((r) => r.arg) }; });

  console.log(JSON.stringify({ skirmishLocked, m2Locked, log, calmAfter, hint1, selected, hint2, order, outroShot, deb, m2, errors }, null, 1));
  await browser.close();
  server.close();
  const bad = errors.length || !seen.card || !seen.shot || !seen.unit || !seen.hhour || calmAfter || !selected || deb.result !== 'win' || !deb.fresh.includes('mg') || m2.mission !== 'm2';
  if (bad) { console.error('FLOW CHECK FAILED'); process.exit(1); }
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
