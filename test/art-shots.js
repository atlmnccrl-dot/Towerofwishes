// Deterministic screenshots of every visual moment, for art review, plus a
// draw-time measurement under CPU throttling.
// Usage: [PORT=8770] NODE_PATH=$(npm root -g) node test/art-shots.js <outDir>
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'shots');
const PORT = Number(process.env.PORT) || 8770;
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, rel === '/' ? 'index.html' : rel);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);

const shots = [];
async function snap(page, name, settle = 900) {
  await page.waitForTimeout(settle);
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file });
  shots.push(file);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await snap(page, '01-menu', 1500);

  const D = (fn, ...args) => page.evaluate(fn, ...args);
  await D(() => { window.__tow.debug.start('practice', 3); window.__tow.debug.freeze(true); });
  for (const [t, name] of [[0.6, '02-establish'], [2.6, '03-faceoff-brute'], [5.7, '04-faceoff-kael'], [6.6, '05-vs'], [7.2, '06-count-3'], [9.0, '07-count-1']]) {
    await D((x) => window.__tow.debug.introAt(x), t);
    await snap(page, name, 700);
  }
  // Openers: the first half-second of the fight.
  await D(() => { window.__tow.debug.introAt(9.38); window.__tow.debug.freeze(false); });
  await page.waitForFunction(() => window.__tow.match.phase === 'fight');
  await page.waitForTimeout(350);
  await D(() => window.__tow.debug.freeze(true));
  await snap(page, '08-openers', 250);
  await D(() => window.__tow.debug.introAt(20)); // let FIGHT finish

  // Mid-fight wide shot.
  await D(() => { window.__tow.debug.advance(5); });
  await snap(page, '09-fight-wide');
  // Tap-to-follow (camera locked on Kael), unpaused for a moment.
  await D(() => { window.__tow.debug.follow('kael'); window.__tow.debug.freeze(false); });
  await snap(page, '09b-follow-kael', 1500);
  await D(() => { window.__tow.debug.freeze(true); window.__tow.debug.follow(null); });
  // Close-ups (fighter detail at zoom).
  for (const id of ['kael', 'eiryn', 'brute', 'knife']) {
    await D((u) => window.__tow.debug.camera({ focus: u, zoom: 2.6 }), id);
    await snap(page, '10-close-' + id, 1200);
  }
  await D(() => window.__tow.debug.camera(null));
  // A bandit wind-up telegraph.
  const tele = await D(() => window.__tow.debug.advanceUntil("(s) => s.units.some((u) => u.team === 'bandit' && u.act && u.act.phase === 'windup' && u.act.t > u.act.wind * 0.6)", 20));
  if (tele) {
    const id = await D(() => window.__tow.match.units.find((u) => u.team === 'bandit' && u.act && u.act.phase === 'windup').id);
    await D((u) => window.__tow.debug.camera({ focus: u, zoom: 1.8 }), id);
    await snap(page, '11-telegraph', 1200);
    await D(() => window.__tow.debug.camera(null));
  }
  // A strike in progress.
  const strike = await D(() => window.__tow.debug.advanceUntil("(s) => s.units.some((u) => u.act && u.act.phase === 'strike')", 20));
  if (strike) await snap(page, '12-strike', 120);

  // All Out.
  await D(() => { window.__tow.debug.allOutNow(); window.__tow.debug.advance(0.5); });
  await snap(page, '13-allout', 250);
  await D(() => window.__tow.debug.advance(5.3));
  await snap(page, '14-drained', 600);
  // Director cut-ins (eyes panels).
  for (const [id, cap] of [['kael', 'READ'], ['brute', null], ['eiryn', null]]) {
    await D((a) => window.__tow.debug.cutIn(a[0], a[1]), [id, cap]);
    await snap(page, '14b-cutin-' + id, 450);
    await page.waitForTimeout(900);
  }

  // Heavy art cutscene frames (fresh match so Kael is in the thick of it).
  await D(() => { window.__tow.debug.start('practice', 3); window.__tow.debug.skipIntro(); window.__tow.debug.advance(2.5); window.__tow.debug.superNow(); });
  const cut = await D(() => window.__tow.debug.advanceUntil('(s) => !!s.cutscene', 30));
  if (cut) {
    for (const [t, name] of [[0.6, '15-cut-charge'], [1.25, '16-cut-gleam'], [1.75, '16b-cut-dash'], [2.03, '17-cut-impact'], [2.5, '18-cut-after']]) {
      await D((x) => { const c = window.__tow.match.cutscene; if (c) { c.t = x; if (x >= c.impactAt) window.__tow.debug.advance(0.02); } }, t);
      await snap(page, name, 500);
    }
    await D(() => window.__tow.debug.advance(2));
  }

  // Performance: unfrozen fight at 1x with 4x CPU slowdown.
  await D(() => window.__tow.debug.start('practice', 5));
  await D(() => window.__tow.debug.skipIntro());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(5000);
  const drawMs = await D(() => window.__tow.drawMs);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // Result screen.
  await D(() => { const m = window.__tow.match; m.result = { outcome: 'win', time: m.t }; });
  await snap(page, '19-result', 2600);

  // Portrait phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await D(() => { window.__tow.debug.start('practice', 3); window.__tow.debug.skipIntro(); window.__tow.debug.advance(4); });
  await snap(page, '20-portrait', 1200);

  console.log(JSON.stringify({ shots: shots.length, drawMsAt4xThrottle: Number(drawMs.toFixed(2)), errors }, null, 1));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
