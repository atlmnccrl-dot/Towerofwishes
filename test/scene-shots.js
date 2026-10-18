// Screenshots of staged story scenes, line by line, for looking at new staging.
// Usage: NODE_PATH=$(npm root -g) node test/scene-shots.js <outDir> <node> [<node> ...]
// Each node is shot twice per line (early and late in the beat), then the run stops
// when the story leaves that node.
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || '/tmp/scene-shots';
const nodes = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const PORT = Number(process.env.PORT) || 8766;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data); });
}).listen(PORT);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?noboot`);
  await page.waitForTimeout(1200);
  for (const n of nodes) {
    await page.evaluate((id) => window.__tow.debug.storyGo(id), n);
    for (let i = 0; i < 12; i++) {
      if ((await page.evaluate(() => window.__tow.story.node)) !== n || (await page.evaluate(() => window.__tow.view)) !== 'story') break;
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(out, `${n.replace(/\./g, '_')}-${i}a.png`) });
      await page.waitForTimeout(1600);
      await page.screenshot({ path: path.join(out, `${n.replace(/\./g, '_')}-${i}b.png`) });
      await page.mouse.click(420, 120); await page.waitForTimeout(120); await page.mouse.click(420, 120);
    }
  }
  if (errors.length) console.log(errors.join('\n'));
  await browser.close(); server.close();
  console.log('shots in', out);
})();
