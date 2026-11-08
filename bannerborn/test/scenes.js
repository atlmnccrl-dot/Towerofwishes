// Screenshots of specific missions mid-fight (auto battle fast-forwarded). usage: node test/scenes.js <outdir> idx[,idx...] [port]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/bb-scenes';
const list = (process.argv[3] || '0,4,5,9,11').split(',').map(Number);
const port = process.argv[4] || 8123;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html?test`);
  await p.waitForFunction(() => document.querySelector('#title.on'), null, { timeout: 30000 });
  for (const idx of list) {
    await p.evaluate((idx) => {
      BB.save = BB.newSave(); BB.save.settings.auto = true; BB.save.seen = { tutorial: 1 };
      const M = BB.MISSIONS[idx];
      for (const c of ['vanguard', 'ranger', 'warpriest', 'arcanist']) { const h = BB.newHero({ calling: c, level: M.level, captain: c === 'vanguard' }); BB.save.heroes.push(h); BB.save.team.push(h.id); }
      for (const mm of BB.MISSIONS) BB.save.seen[mm.id + 'pre'] = 1;
      BB.deploy(idx);
    }, idx);
    await p.waitForFunction(() => BB.testHooks.mode() === 'battle', null, { timeout: 20000 });
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${out}/m${idx + 1}-a.png` });
    await p.evaluate(() => { const s = BB.testHooks.scene(); for (let i = 0; i < 400 && !s.result; i++) s.update(1 / 30, null); });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/m${idx + 1}-b.png` });
    await p.evaluate(() => { const s = BB.testHooks.scene(); if (!s.result) s.win(); });
    await p.waitForTimeout(3600);
    if (idx === list[0]) await p.screenshot({ path: `${out}/results.png` });
    await p.evaluate(() => { document.getElementById('mResults').classList.remove('on'); document.getElementById('mPerk').classList.remove('on'); document.getElementById('story').classList.remove('on'); });
  }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
