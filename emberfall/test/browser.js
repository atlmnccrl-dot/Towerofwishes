// Headless check: loads the game, walks title → scene → fight → results, screenshots each, reports console errors.
// Usage: NODE_PATH=$(npm root -g) node emberfall/test/browser.js <outdir> [port]
const { chromium } = require('playwright');
const fs = require('fs'); const out = process.argv[2] || '/tmp/emberfall-shots'; const port = process.argv[3] || 8765; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/emberfall/index.html`); await page.evaluate(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${port}/emberfall/index.html`);
  await page.waitForFunction(() => window.EF && EF.main && EF.main.state === 'title', null, { timeout: 60000 });
  await page.waitForTimeout(800); await page.screenshot({ path: out + '/01-title.png' });
  const click = async (x, y) => { await page.mouse.click(x * 2, y * 2); }; // viewport is 960x540 = 2x buffer
  await click(78, 139); // NEW GAME
  await page.waitForFunction(() => EF.main.state === 'scene'); await page.waitForTimeout(600); await page.screenshot({ path: out + '/02-card.png' });
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(500); }
  await page.waitForTimeout(800); await page.screenshot({ path: out + '/03-scene.png' });
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(350); }
  await page.screenshot({ path: out + '/04-scene2.png' });
  // skip the rest of the scene
  await page.evaluate(() => EF.main.scene && EF.main.scene.skip());
  await page.waitForFunction(() => EF.main.state === 'fight'); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/05-fight-intro.png' });
  // play: run right and attack
  await page.keyboard.down('KeyD'); await page.waitForTimeout(900); await page.keyboard.up('KeyD');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(220); }
  await page.screenshot({ path: out + '/06-fight-attack.png' });
  await page.keyboard.press('Space'); await page.waitForTimeout(200); await page.screenshot({ path: out + '/07-fight-dodge.png' });
  await page.keyboard.press('KeyL'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/08-fight-special.png' });
  // let auto finish the fight
  await page.evaluate(() => { EF.main.combat.auto = true; });
  await page.waitForFunction(() => EF.main.state === 'results' || EF.main.state === 'scene', null, { timeout: 120000 });
  await page.waitForTimeout(500); await page.screenshot({ path: out + '/09-results.png' });
  const st = await page.evaluate(() => ({ state: EF.main.state, res: EF.main.res && { result: EF.main.res.result, rank: EF.main.res.rank, xp: EF.main.res.xp, gold: EF.main.res.gold, stats: EF.main.res.stats } }));
  console.log(JSON.stringify(st));
  if (st.state === 'results') { await click(240, 232); await page.waitForTimeout(600); await page.screenshot({ path: out + '/10-mid-scene.png' }); }
  // map, camp, shop
  await page.evaluate(() => { EF.main.G.progress.a2 = 'open'; EF.main.go('map'); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/11-map.png' });
  await page.evaluate(() => { EF.main.G.gold = 2000; EF.main.G.heroes.rook.points = 2; EF.main.go('camp'); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/12-camp.png' });
  await page.evaluate(() => { EF.main.G.tab = 'SHOP'; }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/13-shop.png' });
  await page.evaluate(() => { EF.main.back = 'title'; EF.main.go('settings'); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/14-settings.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close(); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
