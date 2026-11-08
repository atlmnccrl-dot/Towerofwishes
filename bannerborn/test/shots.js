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
  await shot('03-banner');
  await p.click('#bandSigils button:nth-child(6)');
  await p.click('#bBannerOk');
  await shot('04-forge-calling');
  await p.click('#forge .tabs button[data-tab=look]');
  await shot('05-forge-look');
  await p.click('#fConfirm');
  await p.click('#fRandom'); await shot('06-forge-comp1');
  await p.click('#fConfirm');
  await p.click('#fConfirm');
  await p.waitForFunction(() => document.querySelector('#camp.on'), null, { timeout: 15000 });
  await shot('07-camp');
  await p.click('#bWarband'); await shot('08-warband');
  await p.click('#bWbBack'); await p.waitForTimeout(400);
  await p.click('#bWarMap'); await shot('09-map');
  await p.click('#brief > .btn:last-child');
  await p.waitForTimeout(400);
  if (await p.$('#story.on')) await p.click('#story');
  await p.waitForFunction(() => document.querySelector('#hud.on'), null, { timeout: 20000 });
  await shot('10-battle-start');
  // play: hold attack and walk toward the centre
  await p.keyboard.down('KeyD'); await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); await p.keyboard.up('KeyW'); await p.keyboard.up('KeyD');
  await p.keyboard.down('KeyJ');
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(900); if (i === 2) await p.keyboard.press('KeyK'); if (i === 4) await p.keyboard.press('Space'); }
  await shot('11-battle-fight');
  await p.evaluate(() => { const s = BB.testHooks.scene(); s.rally = 100; });
  await p.keyboard.press('KeyR'); await p.waitForTimeout(300); await shot('12-rally');
  await p.keyboard.up('KeyJ');
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
