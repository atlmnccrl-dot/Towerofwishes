// Loads the game in headless Chromium at iPhone landscape size, plays a
// practice match and a story withdraw, and saves screenshots.
// Usage: [PORT=8765] node test/browser-check.js <outDir>   (serves the repo on PORT)
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'shots');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const PORT = Number(process.env.PORT) || 8765;
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '1-menu.png') });

  await page.click('#btn-practice');
  // Face-off: one card, the VS, and the countdown.
  await page.evaluate(() => window.__tow.debug.introAt(5.0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '2a-faceoff.png') });
  await page.evaluate(() => window.__tow.debug.introAt(7.7));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '2b-countdown.png') });
  await page.waitForFunction(() => window.__tow.match.phase === 'fight', null, { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '2c-openers.png') });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, '2-fight.png') });

  // Force a heavy art early, while Kael is in the thick of it.
  await page.evaluate(() => { window.__tow.match.byId.kael.superMeter = 100; });
  const sawCut = await page.waitForFunction(() => window.__tow.match.cutscene && window.__tow.match.cutscene.t > 0.7, null, { timeout: 30000 }).then(() => true, () => false);
  if (sawCut) await page.screenshot({ path: path.join(out, '4a-cutscene.png') });
  if (sawCut) { await page.waitForFunction(() => window.__tow.match.cutscene && window.__tow.match.cutscene.t > 1.45, null, { timeout: 5000 }); await page.screenshot({ path: path.join(out, '4b-impact.png') }); }

  // Wait for All Out to charge, then press it.
  await page.waitForFunction(() => window.__tow.match && (window.__tow.match.allOut.meter >= 1 || window.__tow.match.result), null, { timeout: 60000 });
  if (await page.evaluate(() => !window.__tow.match.result)) await page.click('#btn-allout');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '3-allout.png') });
  const ao = await page.evaluate(() => window.__tow.match.allOut.uses > 0);


  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 120000 });
  await page.screenshot({ path: path.join(out, '5-result.png') });
  const practice = await page.evaluate(() => ({ outcome: window.__tow.match.result.outcome, hearts: window.__tow.save.hearts }));

  // Story match: withdraw by holding the button.
  await page.click('#btn-camp');
  await page.click('#btn-story');
  await page.evaluate(() => window.__tow.debug.skipIntro());
  await page.waitForTimeout(1500);
  // The HUD hides during cinematic beats, so keep trying the hold until it lands.
  for (let i = 0; i < 6 && !(await page.evaluate(() => window.__tow.match.result)); i++) {
    await page.waitForFunction(() => !document.getElementById('hud').classList.contains('cine'), null, { timeout: 8000 }).catch(() => {});
    const box = await page.locator('#btn-withdraw').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => window.__tow.match.result, null, { timeout: 2000 }).catch(() => {});
    await page.mouse.up();
  }
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 10000 });
  const story = await page.evaluate(() => ({ outcome: window.__tow.match.result.outcome, hearts: window.__tow.save.hearts, kael: window.__tow.save.injury.kael }));
  await page.click('#btn-camp');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '6-camp.png') });

  // Reload: progress must survive.
  await page.reload();
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ hearts: window.__tow.save.hearts, kael: window.__tow.save.injury.kael.frac }));

  // Portrait phone
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '7-portrait.png') });
  const rotateShown = await page.evaluate(() => getComputedStyle(document.getElementById('rotate-lock')).display !== 'none');
  if (!rotateShown) errors.push('portrait: rotate-lock overlay not shown');

  console.log(JSON.stringify({ allOutUsed: ao, sawCutscene: sawCut, practice, story, afterReload: after, errors }, null, 1));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
