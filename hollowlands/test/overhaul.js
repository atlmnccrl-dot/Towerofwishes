// Screenshots of the item / animation / effects overhaul (third person) + console errors.
// NODE_PATH=$(npm root -g) node test/overhaul.js /tmp/hl-over
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { start } = require('./serve');
(async () => {
  const out = process.argv[2] || '/tmp/hl-over';
  fs.mkdirSync(out, { recursive: true });
  const srv = await start(path.resolve(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  await page.goto(`http://localhost:${srv.address().port}/index.html`);
  await page.waitForTimeout(2000);
  await page.evaluate(() => { HL.G.newGame(); while (HL.G.cut) HL.G.nextShot(true); });
  await page.waitForTimeout(800);
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const T = (t) => t * 8 + 4;
  // loot on the ground around the player
  await page.evaluate(([x, y]) => { const G = HL.G; HLDebug.tp(x, y); G.give('rusted_sword'); G.eq.weapon = 'rusted_sword';
    ['iron_scrap', 'poultice', 'ashwood_spear', 'champion_mantle', 'lumen_shard'].forEach((id, i) => G.dropItem(id, 1, x - 30 + i * 14, y - 18)); }, [T(40), T(52)]);
  await page.waitForTimeout(900); await shot('01-loot');
  // pick up: walk over them
  await page.evaluate(() => { const G = HL.G; const d = G.world.drops || []; HLDebug.tp(G.player.x - 30, G.player.y - 18); });
  for (let i = 0; i < 5; i++) { await page.evaluate((i) => { const G = HL.G; G.player.x += 14; }, i); await page.waitForTimeout(200); }
  await page.waitForTimeout(300); await shot('02-pickup-cards');
  // a fight: spawn foes, hit them
  await page.evaluate(() => { const G = HL.G, p = G.player; G.spawnEnemy ? 0 : 0;
    const e = G.enemies.filter((e) => !e.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    window.__e = e; if (e) HLDebug.tp(e.x, e.y + 22); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { const e = window.__e, p = HL.G.player; if (e && !e.dead) { p.face = Math.atan2(e.y - p.y, e.x - p.x); HL.hitEnemy(e, 9 + Math.random() * 8, { fx: p.x, fy: p.y, heavy: Math.random() < 0.3 }); } }); await page.waitForTimeout(120); }
  await shot('03-fight-numbers');
  await page.evaluate(() => { const e = window.__e; if (e && !e.dead) HL.hitEnemy(e, 999, { fx: HL.G.player.x, fy: HL.G.player.y, heavy: true }); });
  await page.waitForTimeout(500); await shot('04-death');
  // chest
  const chest = await page.evaluate(() => { const G = HL.G; const o = G.world.objects.find((o) => o.id === 'c_houseA'); if (!o) return null; HLDebug.tp(o.x, o.y + 14); return o.id; });
  await page.waitForTimeout(500); await shot('05-chest-closed');
  console.log('opened', await page.evaluate(() => { const G = HL.G, o = G.world.obj('c_houseA'); G.interact({ o }); G.state = 'play'; return o.opened; }));
  await page.waitForTimeout(900); await shot('06-chest-open');
  // menu
  await page.evaluate(() => { const G = HL.G; G.give('ashwood_spear'); G.give('iron_scrap', 4); G.state = 'menu'; HL.UI.menu.tab = 'items'; HL.UI.menu.sel = 'rusted_sword'; });
  await page.waitForTimeout(400); await shot('07-items');
  await page.evaluate(() => { HL.UI.menu.tab = 'map'; }); await page.waitForTimeout(300); await shot('08-map');
  await page.evaluate(() => { HL.UI.menu.tab = 'system'; }); await page.waitForTimeout(300); await shot('09-system');
  await page.evaluate(() => HL.G.closeMenu());
  console.log('chest', chest);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close(); srv.close();
})();
