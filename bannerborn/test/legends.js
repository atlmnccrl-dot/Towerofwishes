// Legendary heroes in the party, the Endless Gate, and defeat -> retry. usage: node test/legends.js <outdir> [port]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/bb-legends';
const port = process.argv[3] || 8123;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html?test`);
  await p.waitForFunction(() => document.querySelector('#title.on'), null, { timeout: 30000 });
  await p.evaluate(() => {
    BB.save = BB.newSave(); BB.save.seen = { tutorial: 1 }; for (let i = 1; i <= 12; i++) BB.save.seen['m' + i + 'pre'] = 1;
    for (const id of ['sera', 'ahmos', 'kestrel', 'talia']) { const h = BB.newHero({ legend: id, level: 8 }); BB.save.heroes.push(h); BB.save.team.push(h.id); }
    const c = BB.newHero({ captain: true, calling: 'vanguard', level: 8 }); BB.save.heroes.unshift(c);
    BB.save.cleared = { m1: 1, m2: 1, m3: 1, m4: 1, m5: 1 };
    BB.goCamp();
  });
  await p.waitForTimeout(1200); await p.screenshot({ path: out + '/l1-camp-legends.png' });
  await p.click('#bWarMap'); await p.waitForTimeout(600);
  await p.evaluate(() => { BB.UI.mapState.sel = 'endless'; BB.UI.renderBrief(); });
  await p.waitForTimeout(300); await p.screenshot({ path: out + '/l2-map-endless.png' });
  await p.click('#brief > .btn:last-child');
  await p.waitForFunction(() => BB.testHooks.mode() === 'battle', null, { timeout: 20000 });
  await p.waitForTimeout(7000); await p.screenshot({ path: out + '/l3-endless.png' });
  await p.evaluate(() => { const s = BB.testHooks.scene(); s.lose('test'); });
  await p.waitForTimeout(3500); await p.screenshot({ path: out + '/l4-endless-result.png' });
  const res = await p.evaluate(() => document.querySelector('#resBody').innerText.slice(0, 200));
  console.log('result text:', res.replace(/\n/g, ' | '));
  // defeat + retry on a mission
  await p.evaluate(() => { document.querySelector('#resBody .btn:last-child').click(); });
  await p.waitForFunction(() => BB.UI.current === 'camp', null, { timeout: 20000 });
  await p.evaluate(() => BB.deploy(5));
  await p.waitForFunction(() => BB.testHooks.mode() === 'battle' && BB.testHooks.scene().mission.id === 'm6', null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => BB.testHooks.scene().lose('test'));
  await p.waitForTimeout(3500);
  const hasRetry = await p.evaluate(() => [...document.querySelectorAll('#resBody .btn')].map((b) => b.textContent).join(','));
  console.log('defeat buttons:', hasRetry);
  await p.evaluate(() => [...document.querySelectorAll('#resBody .btn')].find((b) => b.textContent === 'Retry').click());
  await p.waitForFunction(() => BB.testHooks.mode() === 'battle' && !BB.testHooks.scene().result, null, { timeout: 20000 });
  console.log('retry started a fresh battle');
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
