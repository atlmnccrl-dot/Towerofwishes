// HOLDFAST - screenshots of the opening cinematic at key moments. Usage:
// NODE_PATH=$(npm root -g) node holdfast/test/opening.js [outdir] [url]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-opening', url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url); await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 30000 });
  await page.click('#t-new'); await page.waitForTimeout(300); await page.click('#p-begin');
  const t0 = Date.now();
  for (const [t, n] of [[1.15, 'lightning'], [3.6, 'run'], [6.4, 'pack'], [9.0, 'treeline'], [11.0, 'turnback'], [13.2, 'title'], [16.5, 'settle']]) {
    const wait = t * 1000 - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: out + '/' + String(t).padStart(5, '0') + '-' + n + '.png' });
  }
  await page.waitForTimeout(3000);
  console.log(JSON.stringify(await page.evaluate(() => ({ busy: HF.C.busy(), hours: HF.debug.G.st.hours, rain: HF.debug.G.st.weather.rain, actors: (HF.R.actors || []).length, hidden: Object.values(HF.debug.G.st.units).some(u => u.cineHide) }))));
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors'); await b.close();
})();
