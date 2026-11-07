// HOLDFAST - headless browser check: loads the game, plays the opening by tapping, takes shots,
// reports console errors. Usage: node holdfast/test/browser.js [outdir] [url]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-shots';
const url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: false });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/01-title.png' });
  await page.click('#t-new'); await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/02-picker.png' });
  await page.click('#p-begin'); await page.waitForTimeout(6500);
  await page.screenshot({ path: out + '/03-opening.png' });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: out + '/04-opening2.png' });
  await page.mouse.click(400, 200); await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/05-play.png' });
  const r = await page.evaluate(() => { const { G, S } = HF.debug; return { obj: HF.D.OBJ[G.st.obj].id, day: S.day(G.st), units: Object.keys(G.st.units).length }; });
  console.log(JSON.stringify(r));
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})();
