// Headless screenshots of the main screens + console errors. usage: node test/shots.js <outdir> [port]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/bb-shots';
const port = process.argv[3] || 8123;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  let p2;
  const p = await b.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  process.on('unhandledRejection', (e) => { console.log('FAIL', e.message.split('\n')[0]); console.log('ERRORS', errors.join('\n') || 'none'); process.exit(1); });
  await p.goto(`http://localhost:${port}/index.html?test`);
  await p.waitForFunction(() => document.querySelector('#title.on'), null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/01-title.png' });
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${n}.png` }); };
  // new game
  await p.click('#bNew');
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(250); if (i === 0) await shot('02-story'); await p.click('#story'); }
  await p.waitForFunction(() => document.querySelector('#camp.on'), null, { timeout: 15000 });
  await shot('07-camp');
  await p.click('#bTavern'); await p.waitForFunction(() => BB.UI.current === 'tavern', null, { timeout: 10000 }); await shot('07b-heroes');
  await p.evaluate(() => { BB.save.marks = 1; BB.UI.renderTavern(); });
  await p.click('#tiers .tier:not(.locked) button.tcard >> nth=0'); await p.waitForTimeout(900); await shot('07c-hero-card');
  await p.click('#heroBody .btn:last-child'); await p.waitForTimeout(400);
  console.log('after recruit', await p.evaluate(() => BB.save.heroes.length + ' heroes, marks ' + BB.save.marks));
  await p.click('#bTvBack'); await p.waitForTimeout(1200);
  await p.click('#bWarband'); await shot('08-warband');
  await p.click('#bWbBack'); await p.waitForTimeout(400);
  await p.click('#bWarMap'); await shot('09-map');
  await p.click('#brief > .btn:last-child');
  await p.waitForTimeout(400);
  if (await p.$('#story.on')) await p.click('#story');
  await p.waitForFunction(() => document.querySelector('#hud.on'), null, { timeout: 20000 });
  await p.waitForTimeout(400); await p.screenshot({ path: out + '/10-battle-intro.png' });
  await p.waitForFunction(() => !BB.testHooks.scene().intro, null, { timeout: 10000 });
  await shot('10b-battle-start');
  // command: plant the banner ahead, then a skill, then focus a foe
  await p.mouse.click(760, 260); await p.waitForTimeout(2500);
  await p.waitForFunction(() => BB.testHooks.scene().foesAlive().length > 0, null, { timeout: 10000 });
  await p.keyboard.press('Digit1'); await p.waitForTimeout(250); await p.screenshot({ path: out + '/11-cutin.png' });
  await p.waitForTimeout(1500);
  await p.keyboard.press('Digit2'); await p.waitForTimeout(500);
  await p.evaluate(() => { const s = BB.testHooks.scene(); const f = s.foesAlive()[0]; if (f) { s.order.focus = f; } });
  await p.click('#bAdvance').catch(() => {});
  await p.waitForTimeout(2500); await shot('11b-battle-fight');
  await p.evaluate(() => { const s = BB.testHooks.scene(); s.rally = 100; });
  await p.keyboard.press('KeyR'); await p.waitForTimeout(500); await shot('12-rally');
  console.log('orders', await p.evaluate(() => { const s = BB.testHooks.scene(); return JSON.stringify({ held: !!s.held, used: !!s.usedSkill, combo: s.combo, rallied: !!s.rallied }); }));
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
