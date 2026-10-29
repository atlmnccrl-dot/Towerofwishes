// The store screenshots: plays the game in a headless browser with a company halfway through the
// campaign and photographs ten screens at the sizes the stores ask for (landscape).
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

// a company that has cleared the first three regions: six wheel heroes free and the recruits met on the way, levels in the thirties, a run under way
async function showcase(page) {
  await page.evaluate(async () => {
    const P = await import('/src/game/progress.js'), C = await import('/src/data/campaign.js'), U = await import('/src/data/units.js');
    const g = window.__v2.game, s = P.newSave();
    const done = C.MISSIONS.filter((m) => ['r1', 'r2', 'r3'].includes(m.region));
    for (const m of done) s.cleared[m.id] = m.boss ? 3 : 2 + (m.id.length % 2);
    for (const k of [...P.HEROES.slice(0, 6), ...done.map((m) => m.recruit).filter(Boolean)]) s.roster[k] = { level: 38 + (k.length % 5), xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 6, atk: 5, def: 4 }, ups: [null, null, null, null] };
    s.gold = 18450; s.gems = 640; s.keep = { barracks: 3, treasury: 2, forge: 2, yard: 1, shrine: 3, hall: 2 }; s.mats = { r1: 41, r2: 26, r3: 19, r4: 6 }; s.flags = { at: done[done.length - 1].id }; s.stats.wins = 40;
    s.run = { leader: 'wren', wins: 3, boons: { kindling: 2, chain: 1, secondwind: 1, whetstone: 1 }, pick: null }; s.runs = { count: 4, best: 12 };
    // mid-expedition in the Sunken Abbey: three steps along, a little hurt
    const X = await import('/src/game/expedition.js'); let seed = 11; const exp = X.generate('r4', 4242); s.run.exp = exp;
    const path = [exp.nodes.find((n) => n.row === 0)]; while (path.length < 3) path.push(X.nodeOf(exp, path[path.length - 1].next[0]));
    exp.at = path[2].id; exp.done = path.map((n) => n.id); s.run.hp = { wren: 0.8, corvin: 0.55, maren: 0.9 }; void seed;
    window.__showRun = JSON.parse(JSON.stringify(s.run));
    s.legacy = { renown: 1980, perks: { veterans: true, medics: true, scholars: true, provisions: true, fortune: true }, charter: 'crusaders', endings: { free: true } };
    s.story = { verdicts: { r1: 'mercy', r2: 'dread', r3: 'mercy' }, crown: 1, free: 3, order: ['r1', 'r2', 'r3', 'r4'], ending: null };
    for (const k of ['map', 'prep', 'battle', 'extras', 'loot', 'upgrade', 'lose', 'keep', 'exp']) s.flags['tip_' + k] = true;
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
  // the opening, as the wyrm is named
  await page.evaluate(async () => { const S = await import('/src/data/scenes.js'); window.__v2.game.playScene(S.OPENING); });
  await page.waitForTimeout(21800); await shot('01-opening');
  await page.click('#sc-skip'); await page.waitForTimeout(400);
  await page.evaluate(() => window.__v2.go('title')); await page.waitForTimeout(1500); await shot('02-title');
  await page.evaluate(() => { const g = window.__v2.game; g.save.run = null; window.__v2.go('wheel', () => {}); }); await page.waitForTimeout(600);
  await page.click('#w-spin'); await page.waitForTimeout(1900); await shot('03-wheel');
  await page.evaluate(() => { window.__v2.game.save.run = JSON.parse(JSON.stringify(window.__showRun)); });
  await page.evaluate(() => window.__v2.go('camp')); await page.waitForTimeout(6000); await shot('04-camp');
  await page.evaluate(() => window.__v2.go('extras', 'legacy')); await page.waitForTimeout(1200); await shot('05-legacy');
  await page.evaluate(() => window.__v2.go('exp')); await page.waitForTimeout(1500); await shot('06-road');
  await page.evaluate(() => { const b = document.querySelector('.enode.open.fight') || document.querySelector('.enode.open'); b.click(); }); await page.waitForTimeout(900); await shot('07-team');
  await page.click('#p-fight'); await page.waitForSelector('#hud', { state: 'visible' }); await page.waitForTimeout(6500); await shot('08-battle');
  await page.evaluate(() => window.__v2.skip()); await page.waitForSelector('#result', { state: 'visible' }); await page.waitForTimeout(1200); await shot('09-victory');
  await page.evaluate(() => window.__v2.go('company', 'ysolde')); await page.waitForTimeout(800); await shot('10-heroes');
  console.log(d.name, errs.length ? errs : 'ok');
  await page.close();
}
await browser.close(); server.close();
