// Plays a fight in a headless browser (phone landscape), screenshots it and lists console errors.
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
  await page.waitForFunction(() => window.__v2 && window.__v2.fight && document.getElementById('loading').hidden, null, { timeout: 15000 });
  if (name === 'phone') {
    await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/${name}-1-start.png` });
    // target the knife bandit by tapping it
    const xy = await page.evaluate(() => { const f = window.__v2.fight; return f.units.find((u) => u.id === 'knife') ? true : false; });
    await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/${name}-2-fight.png` });
    // a full meter, then the art button
    await page.evaluate(() => { window.__v2.fight.units.find((u) => u.id === 'eiryn').meter = 100; });
    await page.waitForTimeout(200); await page.evaluate(() => window.__v2.command({ type: 'special', id: 'eiryn' })); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${name}-3-art.png` });
    await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/${name}-4-after.png` });
    await page.evaluate(() => { window.__v2.fight.units.find((u) => u.id === 'kael').meter = 100; });
    await page.waitForTimeout(200); await page.evaluate(() => window.__v2.command({ type: 'special', id: 'kael' })); await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}-5-kael-art.png` });
    await page.evaluate(() => document.getElementById('auto').click());
    const done = await page.waitForFunction(() => window.__v2.fight.result, null, { timeout: 90000 }).then(() => true, () => false);
    await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/${name}-6-end.png` });
    console.log('phone result', await page.evaluate(() => window.__v2.fight.result), 'ended', done);
  } else { await page.waitForTimeout(3000); await page.screenshot({ path: `${out}/${name}-fight.png` }); }
  await page.close();
}
await browser.close(); server.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
