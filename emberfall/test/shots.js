// More screenshots: a boss fight with telegraphs, a late scene, the touch layout on a phone, the credits.
const { chromium } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '/tmp/emberfall-shots2'; const port = process.argv[3] || 8765; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/emberfall/index.html`); await page.waitForFunction(() => window.EF && EF.main && EF.main.state === 'title', null, { timeout: 60000 });
  // jump to act 5 boss with a full party at level 10
  await page.evaluate(() => { const M = EF.main; M.G.started = true; for (const id of ['rook', 'ysolde', 'brannoc', 'tamsin', 'wren']) { M.G.roster.push(id); M.G.heroes[id] = { level: 10, xp: 0, points: 0, items: { weapon: null, armor: null, trinket: null }, talents: {} }; }
    const a = EF.STORY.actById('a5'); M.stage = { act: 'a5', step: 'boss' }; M.startFight(a, a.boss, true); });
  await page.waitForTimeout(2500); await page.screenshot({ path: out + '/20-boss-intro.png' });
  await page.evaluate(() => { EF.main.combat.auto = true; }); await page.waitForTimeout(6000); await page.screenshot({ path: out + '/21-boss-mid.png' });
  await page.waitForTimeout(5000); await page.screenshot({ path: out + '/22-boss-late.png' });
  // the court scene (act 8 open) and the final scene
  await page.evaluate(() => { const M = EF.main; M.G.roster.push('mouse'); M.G.heroes.mouse = { level: 10, xp: 0, points: 0, items: {}, talents: {} }; M.stage = { act: 'a8', step: 'open' }; M.runStep(); });
  await page.waitForTimeout(400); for (let i = 0; i < 2; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(400); } await page.waitForTimeout(1200); await page.screenshot({ path: out + '/23-court-scene.png' });
  await page.evaluate(() => { const M = EF.main; M.stage = { act: 'a9', step: 'mid' }; M.runStep(); }); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/24-paleking-scene.png' });
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); } await page.waitForTimeout(800); await page.screenshot({ path: out + '/25-paleking-scene2.png' });
  await page.evaluate(() => { const M = EF.main; M.stage = { act: 'a3', step: 'open' }; M.runStep(); }); await page.waitForTimeout(400); await page.keyboard.press('Space'); await page.waitForTimeout(2500); await page.screenshot({ path: out + '/26-frosthold.png' });
  await page.evaluate(() => { EF.main.back = 'title'; EF.main.go('credits'); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/27-credits.png' });
  // phone: touch layout
  const ctx = await browser.newContext({ ...require('playwright').devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const ph = await ctx.newPage(); ph.on('pageerror', e => errors.push('phone ' + e.message));
  await ph.goto(`http://127.0.0.1:${port}/emberfall/index.html`); await ph.waitForFunction(() => window.EF && EF.main && EF.main.state === 'title', null, { timeout: 60000 });
  await ph.evaluate(() => { const M = EF.main; M.G.started = true; M.G.roster.push('rook', 'ysolde'); M.G.heroes.rook = { level: 3, xp: 0, points: 0, items: {}, talents: {} }; M.G.heroes.ysolde = { level: 3, xp: 0, points: 0, items: {}, talents: {} }; const a = EF.STORY.actById('a2'); M.stage = { act: 'a2', step: 'fight1' }; M.startFight(a, a.fight1, false); });
  await ph.waitForTimeout(2200); await ph.screenshot({ path: out + '/28-phone-fight.png' });
  await ph.touchscreen.tap(60, 310); await ph.waitForTimeout(300); await ph.screenshot({ path: out + '/29-phone-touch.png' });
  console.log('errors:', errors.length ? errors : 'none'); await browser.close(); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
