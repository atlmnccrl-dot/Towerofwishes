// Plays Vael in a headless browser at phone-landscape and desktop sizes: a new game, the camp, the
// map, a mission's team screen, a battle, the rewards and the recruit card, the company tabs (an
// upgrade picked, gear equipped, a rank trained), then every mission of region 1 to the end.
// Screenshots go to <outDir>; console errors are listed at the end.
// NODE_PATH=$(npm root -g) node v2/test/browser-check.js <outDir>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || '/tmp/v2-shots'; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
// the page is served the way the artifact host serves it: wrapped in a document skeleton
const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${body}</body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(u === '/' ? wrap(d.toString()) : d); });
}).listen(8791);
const browser = await chromium.launch();
const errors = [];
const visible = (page, sel) => page.waitForSelector(sel, { state: 'visible', timeout: 30000 });

for (const [name, vp] of [['phone', { width: 844, height: 390 }], ['desktop', { width: 1280, height: 720 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, hasTouch: name === 'phone', isMobile: name === 'phone' });
  page.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push(name + ' failed: ' + r.url()));
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png` });
  await page.goto('http://localhost:8791/');
  await visible(page, '#title'); await page.waitForTimeout(1500); await shot('01-title');
  await page.click('#t-new'); await visible(page, '#premise'); await page.waitForTimeout(1700); await shot('02-premise');
  await page.click('#premise-go'); await visible(page, '#camp'); await page.waitForTimeout(800); await shot('03-camp');
  await page.click('#k-campaign'); await visible(page, '#map'); await page.waitForTimeout(300); await shot('04-map');
  await page.click('#m-sheet .btn.primary'); await visible(page, '#prep'); await shot('05-prep');
  await page.click('#p-fight'); await visible(page, '#hud'); await page.waitForTimeout(3000); await shot('06-battle');
  await page.evaluate(() => window.__v2.skip());
  await visible(page, '#result'); await page.waitForTimeout(500); await shot('07-rewards');
  console.log(name, 'mission 1', await page.evaluate(() => [window.__v2.battle.result, JSON.stringify(window.__v2.game.save.cleared)]));
  if (name === 'desktop') {
    await page.click('#r-box .btn.primary'); await page.waitForTimeout(400); await shot('08-after');
    await page.close(); continue;
  }
  await page.click('#r-box .btn.primary');
  if (await page.isVisible('#join')) { await page.waitForTimeout(600); await shot('08-recruit'); await page.click('#j-card .btn.primary'); }
  await visible(page, '#map'); await shot('09-map-after');
  // the company: an upgrade at level 4, gear, training
  await page.evaluate(() => { const s = window.__v2.game.save; s.roster.corvin.level = 4; s.gold = 2000; window.__v2.game.persist(); });
  await page.click('#m-company'); await visible(page, '#company'); await page.waitForTimeout(200); await shot('10-company-stats');
  await page.click('.upg'); await page.waitForTimeout(200); await shot('11-company-upgraded');
  await page.click('.tab:nth-child(2)'); await page.waitForTimeout(100);
  const slotWithItem = await page.evaluate(() => { const s = window.__v2.game.save; return s.inv.length ? ({ weapon: 1, armor: 2, charm: 3 })[{ blade: 'weapon', edge: 'weapon', maul: 'weapon', focus: 'weapon', mail: 'armor', leathers: 'armor', robe: 'armor' }[s.inv[0].base] || 'charm'] : 0; });
  if (slotWithItem) { await page.click(`.gslot:nth-child(${slotWithItem})`); await page.click('.pitem .btn.gold'); }
  await page.waitForTimeout(150); await shot('12-company-gear');
  await page.click('.tab:nth-child(3)'); await page.click('.trow .btn'); await page.waitForTimeout(150); await shot('13-company-train');
  console.log('company', await page.evaluate(() => JSON.stringify(window.__v2.game.save.roster.corvin)));
  await page.click('#c-back'); await visible(page, '#map');
  // every other mission; after a loss, try again (stronger) until it falls
  for (let guard = 0; guard < 40; guard++) {
    const next = await page.evaluate(() => { const s = window.__v2.game.save; return ['r1m1', 'r1m2', 'r1m3', 'r1m4', 'r1m5', 'r1m6', 'r1m7', 'r1m8', 'r1m9', 'r1m10'].find((id) => !s.cleared[id]) || null; });
    if (!next) break;
    await page.evaluate(() => window.__v2.go('map'));
    await page.click('#m-sheet .btn.primary'); await visible(page, '#prep');
    await page.click('#p-fight'); await visible(page, '#hud'); await page.waitForTimeout(next === 'r1m10' || next === 'r1m4' ? 2500 : 300);
    if (next === 'r1m10' || next === 'r1m4') await shot('14-battle-' + next);
    await page.evaluate(() => window.__v2.skip());
    await visible(page, '#result');
    const res = await page.evaluate(() => window.__v2.battle.result);
    console.log(next, res);
    if (res !== 'win') { await shot('15-lost-' + next); await page.evaluate(() => { const s = window.__v2.game.save; for (const m of Object.values(s.roster)) m.level += 1; window.__v2.game.persist(); }); continue; }
    await page.click('#r-box .btn.primary');
    if (await page.isVisible('#join')) await page.click('#j-card .btn.primary');
  }
  await visible(page, '#map'); await shot('16-map-done');
  await page.click('#m-back'); await visible(page, '#camp'); await page.waitForTimeout(1500); await shot('17-camp-full');
  await page.click('#k-company'); await visible(page, '#company'); await shot('18-company-full');
  await page.reload(); await visible(page, '#title'); await page.waitForTimeout(600);
  console.log('after reload', await page.evaluate(() => [Object.keys(window.__v2.game.save.roster).length, Object.keys(window.__v2.game.save.cleared).length, !document.getElementById('t-continue').hidden]));
  await page.close();
}
await browser.close(); server.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
