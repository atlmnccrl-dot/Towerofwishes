// Screenshots of the campaign world map (js/render/map.js) in several progress
// states, per-frame draw times, and a pick() check on every node centre.
// Usage: [PORT=8830] NODE_PATH=$(npm root -g) node test/map-shots.js [outDir]
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'shots', 'map');
const PORT = Number(process.env.PORT) || 8830;
fs.mkdirSync(out, { recursive: true });

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@500;700;800&family=Shippori+Mincho:wght@700;800&display=swap">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas>
<script src="/js/story.js"></script><script src="/js/campaign.js"></script><script src="/js/render/map.js"></script><script>
  const c = document.getElementById('c');
  c.width = Math.round(innerWidth * devicePixelRatio);
  c.height = Math.round(innerHeight * devicePixelRatio);
  window.__map = TowRender.map.create(c);
  window.__view = (node, extra) => TowCampaign.view(TowStory, Object.assign(TowStory.fresh(), { node, starter: 'ren' }, extra));
</script></body></html>`;

const types = { '.js': 'text/javascript', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/__map') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
  const f = path.join(root, rel);
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);

const MID = { seen: { c1: 1, c2: 1, c4: 1 }, flags: { trust: 1 } };
const STATES = [
  ['fresh', 'c1.tavern', {}, null],
  ['mid', 'c4.guild', MID, null],
  ['mid-sel', 'c4.guild', MID, 'crossing'],
  ['late', 'end', { done: { cart: 1, stray: 1, crossing: 1, deep: 1 } }, null],
  ['late-seen', 'end', { seen: { c1: 1, c2: 1, c4: 1, c5: 1 }, flags: { trust: 1 }, done: { cart: 1, stray: 1, crossing: 1, deep: 1 } }, 'c6'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/__map`);
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]));
  let pickFails = 0;
  for (const [name, node, extra, sel] of STATES) {
    const r = await page.evaluate(([node, extra, sel]) => {
      const v = __view(node, extra);
      let t0 = performance.now();
      __map.draw(v, 0, sel);
      const first = performance.now() - t0;
      const times = [];
      for (let i = 0; i < 60; i++) { t0 = performance.now(); __map.draw(v, 3 + i / 60, sel); times.push(performance.now() - t0); }
      times.sort((a, b) => a - b);
      const misses = v.nodes.filter((n) => { const p = __map.nodeScreen(n.id); return __map.pick(p.x, p.y) !== n.id; }).map((n) => n.id);
      return { first, median: times[30], p95: times[57], misses };
    }, [node, extra, sel]);
    pickFails += r.misses.length;
    await page.screenshot({ path: path.join(out, name + '.png') });
    console.log(`${name.padEnd(10)} first ${r.first.toFixed(1)} ms, median ${r.median.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms, pick misses: ${r.misses.join(',') || 'none'}`);
  }
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
  server.close();
  process.exit(errors.length || pickFails ? 1 : 0);
})();
