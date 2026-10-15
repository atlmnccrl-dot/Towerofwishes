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

  // Tap through scenes and cards until something other than a scene or card is up.
  async function tapThrough(maxTaps, shotEvery) {
    for (let i = 0; i < maxTaps; i++) {
      const v = await view();
      const n = await node();
      if (!visited.includes(n)) { visited.push(n); if (shotEvery) await shot('n-' + n.replace(/\./g, '_')); }
      if (v !== 'story') return;
      const kind = await page.evaluate(() => window.__tow.story && document.getElementById('choices').hidden ? 'tap' : 'choice');
      if (kind === 'choice') return;
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
  await tapThrough(20, true);                 // title card, the Tower
  await winBattle('prologue');                // the Last Ascent
  await tapThrough(20, true);                 // the light, the Reset, 22 years later
  if ((await view()) !== 'select') errors.push('expected character select, got ' + (await view()));
  await page.waitForTimeout(1200);
  await shot('s-select-ren');
  await page.click('.starter[data-k="brannoc"]');
  await page.waitForTimeout(1500);
  await shot('s-select-brannoc');
  await page.click('.starter[data-k="mara"]');
  await page.waitForTimeout(1500);
  await shot('s-select-mara');
  await page.click('#btn-choose');
  await tapThrough(40, true);                 // Chapter One scenes
  await choose(0, 'approach');                // charge in
  await winBattle('clearing');
  await tapThrough(20, true);
  await choose(0, 'trust');                   // stay with her
  await tapThrough(60, true);                 // walk, town, tavern, tea
  await choose(1, 'fine');                    // let Kael pay
  await tapThrough(40, true);
  await choose(0, 'party');                   // Kael and Eiryn
  await tapThrough(30, true);
  await choose(0, 'fork');                    // longer path
  await tapThrough(20, true);
  await winBattle('path');
  await tapThrough(20, true);
  await winBattle('cave');
  await tapThrough(20, true);
  await choose(0, 'leave');
  await tapThrough(20, true);
  await winBattle('ogre');
  await tapThrough(40, true);
  await page.waitForTimeout(300);
  await shot('z-end');
  const end = await page.evaluate(() => ({ node: window.__tow.story.node, view: window.__tow.view, xp: window.__tow.story.xp, flags: window.__tow.story.flags, hearts: window.__tow.save.hearts }));
  if (end.node !== 'end' || end.view !== 'map') errors.push('did not reach the end: ' + JSON.stringify(end));
  // Progress survives a reload.
  await page.reload();
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ node: window.__tow.story.node, label: document.getElementById('story-btn-label').textContent }));
  await shot('z-menu-after');
  console.log(JSON.stringify({ end, after, visited: visited.length, errors }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e, errors); server.close(); process.exit(1); });
