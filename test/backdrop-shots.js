// Screenshots of every dialogue-scene backdrop (js/render/backdrop.js) at a few
// moments, plus per-frame draw times.
// Usage: [PORT=8810] NODE_PATH=$(npm root -g) node test/backdrop-shots.js [outDir] [bg...]
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'shots', 'backdrops');
const only = process.argv.slice(3);
const PORT = Number(process.env.PORT) || 8810;
fs.mkdirSync(out, { recursive: true });

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><script src="/js/render/backdrop.js"></script><script>
  const c = document.getElementById('c');
  c.width = Math.round(innerWidth * devicePixelRatio);
  c.height = Math.round(innerHeight * devicePixelRatio);
  window.__bd = TowRender.backdrop.create(c);
</script></body></html>`;

const types = { '.js': 'text/javascript', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/__backdrop') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
  const f = path.join(root, rel);
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);

// Moments to capture per backdrop (seconds since the scene started).
const MOMENTS = {
  tower: [0, 6], summit: [0, 4], reset: [0.5, 1.7, 2.2, 3, 4, 5, 7, 10, 14],
  dawn: [0, 6], town: [0, 4], tavern: [0, 2], formation: [1, 4.5, 5.2, 5.9, 6.6, 9],
  forest: [0, 3], road: [0, 4], market: [0, 3], guild: [0, 3], hill: [0, 3], cave: [0, 2],
  nonexistent: [1],
};

(async () => {
  // Extra Chromium flags, e.g. CHROME_ARGS='--ignore-gpu-blocklist --enable-gpu-rasterization'
  const browser = await chromium.launch({ args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean) });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/__backdrop`);
  const names = await page.evaluate(() => TowRender.backdrop.NAMES);
  console.log('NAMES:', names.join(', '));
  const rows = [];
  for (const bg of Object.keys(MOMENTS)) {
    if (only.length && !only.includes(bg)) continue;
    for (const t of MOMENTS[bg]) {
      // First draw (may build cached layers), then 60 timed frames around t.
      const r = await page.evaluate(([bg, t]) => {
        const c = document.getElementById('c'), x = c.getContext('2d');
        const flush = () => x.getImageData(0, 0, 1, 1);
        let t0 = performance.now(); window.__bd.draw(bg, t); flush();
        const first = performance.now() - t0;
        const N = 60; t0 = performance.now();
        for (let i = 0; i < N; i++) window.__bd.draw(bg, t + i / 60);
        flush();
        const avg = (performance.now() - t0) / N;
        window.__bd.draw(bg, t);
        return { first, avg };
      }, [bg, t]);
      const file = path.join(out, `${bg}-${String(t).replace('.', '_')}.png`);
      await page.screenshot({ path: file });
      rows.push([bg, t, r.first, r.avg]);
      console.log(`${bg.padEnd(12)} t=${String(t).padEnd(4)} first ${r.first.toFixed(1).padStart(6)} ms   avg ${r.avg.toFixed(2).padStart(5)} ms/frame`);
    }
  }
  const worst = rows.reduce((m, r) => Math.max(m, r[3]), 0);
  console.log(`worst avg frame: ${worst.toFixed(2)} ms (${page.viewportSize().width}x${page.viewportSize().height} @2x)`);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
