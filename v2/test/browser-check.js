// Edits the team, plays every wave in a headless browser (phone landscape), screenshots it and lists console errors.
// NODE_PATH=$(npm root -g) node v2/test/browser-check.js <outDir>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || '/tmp/v2-shots'; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
// the page is served the way the artifact host serves it: wrapped in a document skeleton
const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${body}</body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(u === '/' ? wrap(d.toString()) : d); });
}).listen(8791);
const browser = await chromium.launch();
const errors = [];
for (const [name, vp] of [['phone', { width: 844, height: 390 }], ['desktop', { width: 1280, height: 720 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, hasTouch: name === 'phone', isMobile: name === 'phone' });
  page.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push(name + ' failed: ' + r.url()));
  await page.goto('http://localhost:8791/');
  await page.waitForFunction(() => window.__v2 && !document.getElementById('team').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}-1-team.png` });
  if (name === 'phone') {
    // change the team by tapping: drop one, add a recruit, swap two slots
    await page.click('#slots .slot.filled .x');
    await page.click('#roster .card:not(.in)');
    await page.click('#slots .slot:nth-child(1)'); await page.click('#slots .slot:nth-child(2)');
    await page.screenshot({ path: `${out}/${name}-2-team-edited.png` });
    console.log('team', JSON.stringify(await page.evaluate(() => window.__v2.save.team)));
    const waves = await page.$$eval('#waves .wave', (b) => b.length);
    for (let w = 0; w < waves; w++) {
      await page.click(`#waves .wave:nth-child(${w + 1})`);
      await page.click('#fight');
      await page.waitForFunction(() => window.__v2.battle && !document.getElementById('hud').hidden, null, { timeout: 30000 });
      await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/${name}-3-wave${w}-a.png` });
      while ((await page.textContent('#speed')) !== '3×') await page.click('#speed');   // 3x to the end
      await page.waitForTimeout(3500); await page.screenshot({ path: `${out}/${name}-3-wave${w}-b.png` });
      const done = await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 }).then(() => true, () => false);
      await page.screenshot({ path: `${out}/${name}-4-wave${w}-result.png` });
      console.log('wave', w, 'result', await page.evaluate(() => window.__v2.battle && [window.__v2.battle.result, Math.round(window.__v2.battle.t)]), 'shown', done);
      await page.click('#toteam');
    }
  } else {
    await page.click('#fight');
    await page.waitForFunction(() => window.__v2.battle && !document.getElementById('hud').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(4000); await page.screenshot({ path: `${out}/${name}-battle.png` });
  }
  await page.close();
}
await browser.close(); server.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
