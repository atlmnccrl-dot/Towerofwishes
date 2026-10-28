// The store screenshots: plays the game in a headless browser with a company halfway through the
// campaign and photographs nine screens at the sizes the stores ask for (landscape).
//   NODE_PATH=$(npm root -g) node v2/tools/store-shots.mjs        ->  v2/docs/store/<device>/NN-name.jpg
// Needs Playwright with Chromium. The save it builds is for pictures only (nothing is written to disk).
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), outRoot = path.join(root, 'docs', 'store');
const DEVICES = [
  { name: 'iphone-6.9', w: 956, h: 440, dpr: 3 },    // 2868 x 1320: App Store 6.9" display
  { name: 'ipad-13', w: 1376, h: 1032, dpr: 2 },     // 2752 x 2064: App Store 13" iPad
  { name: 'android', w: 960, h: 540, dpr: 2 },       // 1920 x 1080: Google Play phone
];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const wrap = (b) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${b}</body></html>`;
const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(u === '/' ? wrap(d.toString()) : d); }); }).listen(8817);

// a company that has cleared the first three regions: sixteen heroes, levels in the thirties, gear on
async function showcase(page) {
  await page.evaluate(async () => {
    const P = await import('/src/game/progress.js'), C = await import('/src/data/campaign.js'), U = await import('/src/data/units.js');
    const g = window.__v2.game, s = P.newSave();
    const done = C.MISSIONS.filter((m) => ['r1', 'r2', 'r3'].includes(m.region));
    for (const m of done) s.cleared[m.id] = m.boss ? 3 : 2 + (m.id.length % 2);
    for (const k of Object.keys(U.UNITS).slice(0, 16)) s.roster[k] = { level: 38 + (k.length % 5), xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 6, atk: 5, def: 4 }, ups: [null, null, null, null] };
    s.gold = 18450; s.gems = 640; s.keep = { barracks: 3, treasury: 2, forge: 2, yard: 1, shrine: 3, hall: 2 }; s.mats = { r1: 41, r2: 26, r3: 19, r4: 6 }; s.flags = { at: done[done.length - 1].id }; s.stats.wins = 40;
    for (const k of ['map', 'prep', 'battle', 'extras', 'loot', 'upgrade', 'lose', 'keep']) s.flags['tip_' + k] = true;
    for (const m of C.MISSIONS) s.flags['met_' + m.id] = true;
    P.bestTeam(s); g.save = s; g.noTips = true; g.persist = () => {};
    for (const k of Object.keys(s.roster)) s.roster[k].ups.forEach((u, t) => { if (s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[0].id); });
  });
}
const browser = await chromium.launch();
for (const d of DEVICES) {
  const out = path.join(outRoot, d.name); fs.mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8817/'); await page.waitForSelector('#title', { state: 'visible' });
  const shot = (n) => page.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 92 });
  await showcase(page);
  await page.evaluate(() => window.__v2.go('title')); await page.waitForTimeout(1500); await shot('01-title');
  await page.evaluate(() => window.__v2.go('camp')); await page.waitForTimeout(2000); await shot('02-camp');
  await page.evaluate(() => window.__v2.go('keep')); await page.waitForTimeout(1500); await shot('03-stronghold');
  await page.evaluate(() => window.__v2.go('map', 'r4m3')); await page.waitForTimeout(1500); await shot('04-map');
  await page.evaluate(() => window.__v2.go('prep', 'r4m3')); await page.waitForTimeout(800); await shot('05-team');
  await page.click('#p-fight'); await page.waitForSelector('#hud', { state: 'visible' }); await page.waitForTimeout(6500); await shot('06-battle');
  await page.evaluate(() => window.__v2.skip()); await page.waitForSelector('#result', { state: 'visible' }); await page.waitForTimeout(1200); await shot('07-victory');
  await page.evaluate(() => window.__v2.go('company', 'saela')); await page.waitForTimeout(800); await shot('08-heroes');
  await page.evaluate(async () => { const S = await import('/src/data/scenes.js'); window.__v2.game.playScene(S.arrivalScene('r4', window.__v2.game.save.team.map((t) => t.key))); });
  await page.waitForTimeout(3200); await shot('09-story');
  console.log(d.name, errs.length ? errs : 'ok');
  await page.close();
}
await browser.close(); server.close();
