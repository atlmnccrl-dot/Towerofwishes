// End-to-end walk through the story UI in a headless browser, with screenshots.
// Usage: [PORT=8781] NODE_PATH=$(npm root -g) node test/story-browser.js <outDir>
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = process.argv[2] || '/tmp/story-shots';
const PORT = Number(process.env.PORT) || 8781;
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);

const errors = [];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(800);
  const T = () => page.evaluate(() => window.__tow);
  const node = () => page.evaluate(() => window.__tow.story.node);
  const view = () => page.evaluate(() => window.__tow.view);
  const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
  const visited = [];
  const visitedMap = new Set();
  let forkN = 0; // forks alternate between their two ways

  // Tap through scenes and cards until something other than a scene or card is up.
  async function tapThrough(maxTaps, shotEvery, stopAtWorld) {
    for (let i = 0; i < maxTaps; i++) {
      const v = await view();
      const n = await node();
      if (!visited.includes(n)) { visited.push(n); if (shotEvery) await shot('n-' + n.replace(/\./g, '_')); }
      if (v === 'world' && stopAtWorld) return;
      if (v === 'world') {
        // The map between chapters: open the current story node.
        const cur = await page.evaluate(() => { const v = window.TowCampaign.view(window.TowStory, window.__tow.story); return v.current; });
        if (!cur || !visitedMap.has(cur)) { if (cur) visitedMap.add(cur); await shot('w-' + (cur || 'end')); }
        if (!cur) return;
        await page.evaluate((id) => { window.__tow.debug.pickNode(id); window.__tow.debug.goNode(id); }, cur);
        await page.waitForTimeout(300);
        continue;
      }
      if (v === 'cine') { await shot('cine-' + n); await page.click('#btn-cine-skip'); await page.waitForTimeout(300); continue; }
      if (v === 'fight' && /\.fork\./.test(n)) { await winBattle(n.replace(/\./g, '_')); continue; }
      if (v !== 'story') return;
      const kind = await page.evaluate(() => window.__tow.story && document.getElementById('choices').hidden ? 'tap' : 'choice');
      if (kind === 'choice') { await page.click(`#options button[data-i="${forkN++ % 2}"]`); await page.waitForTimeout(300); continue; }
      await page.waitForTimeout(950);
      await page.mouse.click(420, 120); // finish the typewriter or advance
      await page.mouse.click(420, 120);
    }
  }
  // Win the current battle fast: skip the face-off and run the sim to the end.
  async function winBattle(tag) {
    await page.waitForFunction(() => window.__tow.match, null, { timeout: 5000 });
    await page.evaluate(() => window.__tow.debug.introAt(4.2));
    await page.waitForTimeout(400);
    await shot('b-' + tag + '-faceoff');
    await page.evaluate(() => window.__tow.debug.skipIntro());
    await page.waitForTimeout(1500);
    await shot('b-' + tag + '-fight');
    // Retry with fresh seeds until the team wins (losses keep the node in place).
    for (let tries = 0; tries < 6; tries++) {
      await page.evaluate(() => window.__tow.debug.advanceUntil('(s) => s.result', 200));
      await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 8000 });
      const o = await page.evaluate(() => window.__tow.match.result.outcome);
      if (tries === 0) await shot('b-' + tag + '-result');
      const action = await page.evaluate(() => document.getElementById('btn-again').dataset.action);
      await page.click('#btn-again');
      await page.waitForTimeout(300);
      if (action === 'continue') return o;
      await page.evaluate(() => window.__tow.debug.skipIntro());
    }
    throw new Error('could not win ' + tag);
  }
  async function choose(i, tag) {
    await page.waitForTimeout(300);
    await shot('c-' + tag);
    await page.click(`#options button[data-i="${i}"]`);
    await page.waitForTimeout(200);
  }

  await shot('0-menu');
  await page.click('#btn-story');
  await tapThrough(80, true);                 // the opening, the prologue, the Tower
  // The prologue fight is the guided tutorial: the coach pauses the fight.
  await page.waitForFunction(() => window.__tow.match, null, { timeout: 5000 });
  await page.evaluate(() => window.__tow.debug.skipIntro());
  await page.waitForFunction(() => !document.getElementById('coach').hidden, null, { timeout: 8000 }).catch(() => errors.push('coach never appeared'));
  await shot('t-coach-1');
  await page.click('#coach-ok');
  await page.waitForFunction(() => !document.getElementById('coach').hidden, null, { timeout: 12000 }).catch(() => errors.push('All Out coach never appeared'));
  await shot('t-coach-allout');
  await page.click('#btn-allout', { force: true });
  await page.waitForTimeout(500);
  if (!(await page.evaluate(() => window.__tow.match.allOut.uses > 0))) errors.push('coach: All Out tap did not fire');
  await winBattle('prologue');                // the Last Ascent
  await tapThrough(80, true);                 // the light, the Reset, 150 years later, the tavern, the run
  await winBattle('clearing');
  await tapThrough(20, true);
  await tapThrough(60, true);                 // walk, town, tavern, tea
  await tapThrough(40, true, true);           // to the map before Chapter Four
  await page.evaluate(() => { window.__tow.debug.pickNode('c4'); window.__tow.debug.goNode('c4'); });
  await page.waitForTimeout(300);
  await tapThrough(40, true, true);           // the Guild, the board: the map before the quarry
  // Side missions from the Guild: hire a companion, then the yard, a contract, the arcade.
  await page.evaluate(() => window.__tow.debug.world());
  await page.waitForTimeout(400);
  await shot('w-branch');
  await page.evaluate(() => { window.__tow.debug.pickNode('hire'); window.__tow.debug.goNode('hire'); });
  await page.waitForTimeout(300);
  await tapThrough(10, false, true);
  if ((await view()) !== 'select') errors.push('expected the companion pick, got ' + (await view()));
  await page.waitForTimeout(1200);
  await shot('s-select-ren');
  await page.click('.starter[data-k="brannoc"]');
  await page.waitForTimeout(1500);
  await shot('s-select-brannoc');
  await page.click('.starter[data-k="mara"]');
  await page.waitForTimeout(1500);
  await shot('s-select-mara');
  await page.click('#btn-choose');
  await tapThrough(10, true, true);
  if ((await view()) !== 'world') errors.push('after hiring: expected the map, got ' + (await view()));
  if ((await page.evaluate(() => window.__tow.story.companion)) !== 'mara') errors.push('companion not hired');
  for (const id of ['yard', 'cart', 'gauntlet']) {
    await page.evaluate((x) => { window.__tow.debug.pickNode(x); }, id);
    await page.waitForTimeout(200);
    await shot('w-card-' + id);
    await page.evaluate((x) => window.__tow.debug.goNode(x), id);
    await page.waitForTimeout(300);
    await tapThrough(20, false, true);
    await winBattle('side-' + id);
    await tapThrough(20, false, true);
    const v = await view();
    if (v !== 'world') errors.push(`after ${id}: expected the map, got ${v}`);
  }
  const inv = await page.evaluate(() => window.__tow.save.prog.inv.length);
  if (inv < 1) errors.push('no loot after side missions');
  // Team screen: equip something and learn a skill.
  await page.evaluate(() => window.__tow.debug.team());
  await page.waitForTimeout(300);
  await shot('team-1');
  await page.evaluate(() => { const b = document.querySelector('#tm-inv button'); if (b) b.click(); const s = document.querySelector('.snode.can'); if (s) s.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await page.waitForTimeout(200);
  await shot('team-2');
  const kit = await page.evaluate(() => ({ skills: Object.values(window.__tow.save.prog.skills).flat().length, equipped: Object.values(window.__tow.save.prog.equip).length }));
  if (!kit.skills) errors.push('could not learn a skill');
  await page.click('#btn-team-back');
  await page.evaluate(() => window.__tow.debug.world());
  await page.waitForTimeout(200);
  await tapThrough(30, true);
  await tapThrough(20, true);
  await winBattle('path');
  await tapThrough(20, true);
  await winBattle('cave');
  await tapThrough(20, true);
  await tapThrough(20, true);
  await winBattle('ogre');
  await tapThrough(40, true, true);           // home, then the map before Chapter Six
  // The dungeon after Chapter Five: three rooms with a choice between.
  await page.evaluate(() => { window.__tow.debug.pickNode('deep'); window.__tow.debug.goNode('deep'); });
  await page.waitForTimeout(300);
  await tapThrough(10, false);
  await winBattle('deep1');
  await tapThrough(4, false);                 // the rest
  await winBattle('deep2');
  await winBattle('deep3');
  await tapThrough(10, false, true);
  // The book's road: Chapter Six to Floor Three, every battle won.
  for (let guard = 0; guard < 40; guard++) {
    const st = await page.evaluate(() => ({ node: window.__tow.story.node, view: window.__tow.view, match: !!window.__tow.match && !window.__tow.match.result }));
    if (st.node === 'end' && st.view === 'world') break;
    if (st.match) { await winBattle(st.node.replace(/\./g, '_')); continue; }
    await tapThrough(80, true);
  }
  await page.waitForTimeout(300);
  await shot('z-end');
  const end = await page.evaluate(() => ({ node: window.__tow.story.node, view: window.__tow.view, xp: window.__tow.story.xp, flags: window.__tow.story.flags, hearts: window.__tow.save.hearts }));
  if (end.node !== 'end' || end.view !== 'world') errors.push('did not reach the end: ' + JSON.stringify(end));
  // Progress survives a reload.
  await page.reload();
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ node: window.__tow.story.node, label: document.getElementById('story-btn-label').textContent }));
  await shot('z-menu-after');
  console.log(JSON.stringify({ end, after, visited: visited.length, inv, kit, errors }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e, errors); server.close(); process.exit(1); });
