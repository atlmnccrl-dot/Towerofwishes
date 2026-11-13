// Screenshot helper: NODE_PATH=$(npm root -g) node bellmourn/test/shot.js <out.png> [query] [w] [h] [waitMs]
const { chromium } = require('playwright');
(async () => {
  const [out = '/tmp/bm.png', query = '', w = 960, h = 540, wait = 1500] = process.argv.slice(2);
  const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html${query ? '?' + query : ''}`);
  try { await p.waitForFunction(() => window.BM && BM.ready && BM.frames > 3, null, { timeout: 60000 }); } catch (e) { errs.push('TIMEOUT waiting for BM'); }
  await p.waitForTimeout(+wait);
  await p.screenshot({ path: out });
  console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no errors');
  await b.close();
})();
