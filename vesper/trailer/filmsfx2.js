const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  await page.goto('http://127.0.0.1:8765/vesper/index.html?intro'); await page.waitForFunction(() => window.VS && VS.main && VS.main.state === 'intro', null, { timeout: 90000 });
  const r = await page.evaluate(() => { const f = VS.INTRO.st.f; return { SFX: f.SFX, SHOTS: f.SHOTS.map((s) => [s[0], s[1], s[2]]) }; });
  require('fs').writeFileSync(process.argv[2], JSON.stringify(r)); console.log(r.SFX.length, JSON.stringify(r.SFX.slice(0, 3)), JSON.stringify(r.SHOTS.slice(0, 4)));
  await b.close();
})();
