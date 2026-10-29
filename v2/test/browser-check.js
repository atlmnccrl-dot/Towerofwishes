// Plays Vael in a headless browser at phone-landscape and desktop sizes: a new game, the camp, the
// wheel (a leader for the run), the map, a mission's team screen, a battle, the rewards and the freed-hero card, the company tabs (an
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
// waits for a screen; a boon on offer (after a win in a run) is picked on the way, as a player would
async function visible(page, sel) {
  for (let t = 0; t < 150; t++) {
    if (await page.isVisible(sel)) return;
    if (await page.isVisible('#boons') && sel !== '#boons') { await page.locator('#boons .boon').first().click(); await page.waitForTimeout(900); continue; }
    await page.waitForTimeout(200);
  }
  return page.waitForSelector(sel, { state: 'visible', timeout: 1000 });
}
// filmed scenes come up on new games, recruits, regions and bosses: skip them (one is filmed in full below)
async function skipScenes(page) { for (let k = 0; k < 6; k++) { await page.waitForTimeout(250); if (await page.isVisible('#scene')) await page.click('#sc-skip'); else return; } }
// a run needs a leader: when the wheel comes up, spin it and take who it lands on
async function wheel(page) { await page.waitForTimeout(150); if (!await page.isVisible('#wheel')) return; await page.click('#w-spin'); await visible(page, '#w-go'); await page.click('#w-go'); }
async function prepare(page) { await page.click('#m-sheet .btn.primary'); await wheel(page); await visible(page, '#prep'); }

for (const [name, vp] of [['phone', { width: 844, height: 390 }], ['desktop', { width: 1280, height: 720 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, hasTouch: name === 'phone', isMobile: name === 'phone' });
  page.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push(name + ' failed: ' + r.url()));
  // tips are modal cards: a player taps "Got it" before anything else, and so does every click here
  const click0 = page.click.bind(page), dismiss = async () => {
    if (await page.isVisible('#boons')) { await click0('#boons .boon'); await page.waitForTimeout(900); }
    for (let k = 0; k < 3 && await page.isVisible('#tip'); k++) { await click0('#tip .btn'); await page.waitForTimeout(150); }
  };
  page.click = async (sel, o) => { if (!sel.startsWith('#tip') && !sel.startsWith('#boons')) await dismiss(); return click0(sel, o); };
  // every screenshot also checks the page for leaked placeholders in its text
  const shot = async (n) => {
    const bad = await page.evaluate(() => (document.body.innerText.match(/\b(null|undefined|NaN)\b/g) || []).join(','));
    if (bad) errors.push(`${name} ${n}: page text shows ${bad}`);
    return page.screenshot({ path: `${out}/${name}-${n}.png` });
  };
  await page.goto('http://localhost:8791/');
  await visible(page, '#title'); await page.waitForTimeout(1500); await shot('01-title');
  await page.click('#t-new'); await visible(page, '#scene'); await page.waitForTimeout(9000); await shot('02-opening'); await page.waitForTimeout(16000); await shot('02a-opening'); await skipScenes(page);
  // a new company is Corvin alone: no wheel until a second wheel hero joins (it is spun later, in the missions)
  await visible(page, '#camp');
  console.log(name, 'start', await page.evaluate(() => JSON.stringify(Object.keys(window.__v2.game.save.roster))));
  await page.evaluate(() => { window.__v2.game.fastWheel = true; }); await page.waitForTimeout(800); await shot('03-camp');
  await page.click('#k-campaign'); await visible(page, '#map'); await page.waitForTimeout(300); await shot('04-map');
  await prepare(page); await shot('05-prep');
  await page.click('#p-fight'); await skipScenes(page); await visible(page, '#hud'); await page.waitForTimeout(1200); await shot('06a-intro'); await page.waitForTimeout(3600); await shot('06b-tip'); await dismiss(); await page.waitForTimeout(1500); await shot('06-battle');
  await page.evaluate(() => window.__v2.skip());
  await visible(page, '#result'); await page.waitForTimeout(500); await shot('07-rewards');
  for (let k = 0; k < 6 && await page.evaluate(() => window.__v2.battle.result !== 'win'); k++) {
    await page.click('#r-box .btn.primary'); await wheel(page); await visible(page, '#prep'); await page.click('#p-fight'); await skipScenes(page); await visible(page, '#hud');
    await page.evaluate(() => window.__v2.skip()); await visible(page, '#result');
  }
  console.log(name, 'mission 1', await page.evaluate(() => [window.__v2.battle.result, JSON.stringify(window.__v2.game.save.cleared)]));
  if (name === 'desktop') {
    await page.click('#r-box .btn.primary'); await skipScenes(page); await page.waitForTimeout(400); await shot('08-after');
    await page.close(); continue;
  }
  await page.click('#r-map');
  await page.waitForTimeout(2500); if (await page.isVisible('#scene')) await shot('08-recruit'); await skipScenes(page);
  if (await page.isVisible('#join')) { await page.waitForTimeout(600); await shot('08b-reveal'); await page.click('#j-card .btn.primary'); }
  await visible(page, '#map'); await shot('09-map-after');
  // the company: an upgrade at level 4, gear, training
  await page.evaluate(() => { const s = window.__v2.game.save; s.roster[Object.keys(s.roster)[0]].level = 4; s.gold = 2000; window.__v2.game.persist(); });
  await page.click('#m-company'); await visible(page, '#company'); await page.waitForTimeout(200); await shot('10-company-stats');
  await page.click('.upg'); await page.waitForTimeout(200); await shot('11-company-upgraded');
  await page.click('.tab:nth-child(2)'); await page.waitForTimeout(100);
  const slotWithItem = await page.evaluate(() => { const s = window.__v2.game.save; return s.inv.length ? ({ weapon: 1, armor: 2, charm: 3 })[{ blade: 'weapon', edge: 'weapon', maul: 'weapon', focus: 'weapon', mail: 'armor', leathers: 'armor', robe: 'armor' }[s.inv[0].base] || 'charm'] : 0; });
  if (slotWithItem) { await page.click(`.gslot:nth-child(${slotWithItem})`); await page.click('.pitem .btn.gold'); }
  await page.waitForTimeout(150); await shot('12-company-gear');
  await page.click('.tab:nth-child(3)'); await page.click('.trow .btn'); await page.waitForTimeout(150); await shot('13-company-train');
  console.log('company', await page.evaluate(() => JSON.stringify(window.__v2.game.save.roster[Object.keys(window.__v2.game.save.roster)[0]])));
  await page.click('#c-back'); await visible(page, '#map');
  // the camp's tents and the settings
  await page.evaluate(() => { window.__v2.game.save.gems = 500; window.__v2.go('extras', 'shop'); });
  await visible(page, '#extras'); await shot('13b-shop');
  await page.click('.ware .btn.gold'); await page.waitForTimeout(200);
  console.log('shop', await page.evaluate(() => [window.__v2.game.save.inv.length, window.__v2.game.save.stats.bought]));
  await page.click('#x-tabs .tab:nth-child(2)'); await shot('13c-bounties');
  await page.click('#x-tabs .tab:nth-child(3)'); await shot('13d-feats');
  await page.evaluate(() => window.__v2.go('camp')); await visible(page, '#camp'); await page.waitForTimeout(600); await shot('13e-camp');
  await page.click('#camp .open-settings'); await visible(page, '#settings'); await page.click('#set-export'); await page.waitForTimeout(200); await shot('13f-settings');
  const code = await page.inputValue('#save-code');
  await page.evaluate(() => { window.__v2.game.save.gold = 1; }); await page.click('#save-load'); await visible(page, '#camp');
  console.log('save code round trip', code.length, await page.evaluate(() => window.__v2.game.save.gold));
  await page.evaluate(() => window.__v2.go('map'));
  // every other mission in order; after a loss the company gets a level and tries again.
  // Screenshots: each region's map, its first battle and its boss battle.
  let losses = 0;
  for (let guard = 0; guard < 300; guard++) {
    const next = await page.evaluate(() => window.__v2.missions.find((id) => !window.__v2.game.save.cleared[id]) || null);
    if (!next) break;
    await page.evaluate((id) => window.__v2.go('map', id), next);
    const key = /m1$|m10$/.test(next);
    if (/m1$/.test(next)) await shot('14-map-' + next);
    await prepare(page);
    await page.evaluate(() => window.__v2.pickUpgrades());   // a casual player: upgrade picks, the best team and its best gear
    await page.click('#p-best');
    await page.click('#p-fight'); await skipScenes(page); await visible(page, '#hud'); await page.waitForTimeout(key ? 2600 : 200);
    if (key) await shot('15-battle-' + next);
    await page.evaluate(() => window.__v2.skip());
    await visible(page, '#result');
    const res = await page.evaluate(() => window.__v2.battle.result);
    if (res !== 'win') {
      // like the tuned casual player: replay the mission before for experience, then try again
      losses++;
      const prev = await page.evaluate((id) => { const l = window.__v2.missions; return l[l.indexOf(id) - 1] || null; }, next);
      if (prev) { await page.evaluate((id) => window.__v2.go('map', id), prev); await prepare(page); await page.click('#p-best'); await page.click('#p-fight'); await skipScenes(page); await visible(page, '#hud'); await page.evaluate(() => window.__v2.skip()); await visible(page, '#result'); }
      continue;
    }
    await page.click('#r-box .btn.primary');
    if (await page.isVisible('#join') && /m10$/.test(next) && (await page.textContent('#j-card')).includes('cleared')) await shot('16-story-' + next);
    for (let k = 0; k < 4; k++) { await skipScenes(page); if (await page.isVisible('#join')) await page.click('#j-card .btn.primary'); }
  }
  console.log('losses', losses, 'runs', await page.evaluate(() => JSON.stringify(window.__v2.game.save.runs)), 'boons now', await page.evaluate(() => JSON.stringify(window.__v2.game.save.run && window.__v2.game.save.run.boons)));
  console.log('cleared', await page.evaluate(() => Object.keys(window.__v2.game.save.cleared).length), 'recruits', await page.evaluate(() => Object.keys(window.__v2.game.save.roster).length));
  await page.evaluate(() => window.__v2.go('map', 'r6m10'));
  await visible(page, '#map'); await shot('16-map-done');
  await page.click('#m-back'); await visible(page, '#camp'); await page.waitForTimeout(1500); await shot('17-camp-full');
  await page.click('#k-company'); await visible(page, '#company'); await shot('18-company-full');
  await page.reload(); await visible(page, '#title'); await page.waitForTimeout(600);
  console.log('after reload', await page.evaluate(() => [Object.keys(window.__v2.game.save.roster).length, Object.keys(window.__v2.game.save.cleared).length, !document.getElementById('t-continue').hidden]));
  // heroic: the toggle shows on a cleared region and a heroic battle starts
  await page.click('#t-continue'); await visible(page, '#camp'); await page.click('#k-campaign'); await wheel(page); await visible(page, '#map');
  await page.click('.modes button:nth-child(2)'); await page.waitForTimeout(200); await shot('19-heroic-map');
  await prepare(page); await page.click('#p-fight'); await skipScenes(page); await visible(page, '#hud'); await page.waitForTimeout(2000); await shot('20-heroic-battle');
  console.log('heroic battle level', await page.evaluate(() => window.__v2.battle.units.find((u) => u.team === 'foe').level));
  await page.close();
}
await browser.close(); server.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
