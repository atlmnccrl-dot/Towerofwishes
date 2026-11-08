// Phone-sized landscape screenshots (iPhone 13-ish, 844x390 @3x emulated at 2x). usage: node test/phone.js <outdir> [port]
const { chromium, devices } = require('playwright');
const out = process.argv[2] || '/tmp/bb-phone';
const port = process.argv[3] || 8123;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html?test`);
  await p.waitForFunction(() => document.querySelector('#title.on'), null, { timeout: 30000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/p1-title.png' });
  await p.evaluate(() => {
    BB.save = BB.newSave(); BB.save.gold = 400;
    for (const c of ['vanguard', 'ranger', 'warpriest']) { const h = BB.newHero({ calling: c, captain: c === 'vanguard', level: 2 }); BB.save.heroes.push(h); BB.save.team.push(h.id); }
    BB.save.heroes[0].pendingPerks = 1;
    BB.save.inventory.push(BB.makeItem(BB.rng(3), 'chest', 2, 2), BB.makeItem(BB.rng(4), 'weapon', 2, 1, 'sword'), BB.makeItem(BB.rng(5), 'head', 2, 3));
    BB.goCamp();
  });
  await p.waitForTimeout(1200); await p.screenshot({ path: out + '/p2-camp.png' });
  await p.tap('#bHire'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/p3-forge.png' });
  await p.tap('#forge .tabs button[data-tab=look]'); await p.waitForTimeout(400); await p.screenshot({ path: out + '/p3b-forge-look.png' });
  await p.tap('#bForgeBack'); await p.waitForTimeout(800);
  await p.tap('#bWarband'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/p4-warband.png' });
  await p.tap('#bWbBack'); await p.waitForTimeout(800);
  await p.tap('#bStronghold'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/p5-stronghold.png' });
  await p.tap('#bShBack'); await p.waitForTimeout(800);
  await p.tap('#bWarMap'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/p6-map.png' });
  await p.evaluate(() => { BB.save.seen = { tutorial: 1, m1pre: 1 }; BB.deploy(0); });
  await p.waitForFunction(() => BB.testHooks.mode() === 'battle', null, { timeout: 20000 });
  await p.waitForTimeout(5000); await p.screenshot({ path: out + '/p7-battle.png' });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
