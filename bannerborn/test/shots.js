// Headless playthrough: title → new game → camp → campaign → team → battle (ultimate, auto) → results
// → heroes → hero → recruit (reveal) → team → forge → shop → settings. Fails on console errors.
// usage: NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-shots [width height]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/bb-shots';
const W = +process.argv[3] || 1280, H = +process.argv[4] || 720;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 1000 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const shot = (n) => p.screenshot({ path: out + '/' + n + '.png' });
  const wait = (ms) => p.waitForTimeout(ms);
  const tap = async (sel) => { await p.click(sel); await wait(250); };
  const screen = () => p.evaluate(() => BB.UI.current);
  await p.goto('http://localhost:8123/index.html?test');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => window.BB && BB.UI && BB.UI.current === 'title', null, { timeout: 30000 });
  await wait(1200); await shot('01-title');
  await tap('#bPlay');
  await wait(400);
  await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 15000 });
  await wait(1500); await shot('03-camp');
  await tap('#bContinue'); await wait(500); await shot('04-campaign');
  await tap('#stageCard .btn.xl'); await wait(400); await shot('05-team-prebattle');
  await p.click('#teamTop .btn.xl');
  await p.waitForFunction(() => BB.UI.current === 'hud', null, { timeout: 20000 });
  await wait(600); await shot('06-battle-intro');
  await wait(3500); await shot('07-battle');
  // charge and cast an ultimate by hand
  await p.evaluate(() => { const s = BB.testHooks.scene(); s.paused = false; s.heroList[0].energy = 100; for (const e of s.ents) if (e.side === 'hero') e.hp = e.maxhp = 99999; });
  await wait(300); await shot('08-ready');
  await p.dispatchEvent('#cards .ucard', 'pointerdown');
  await wait(450); await shot('09-cutin');
  await tap('#bAuto'); await tap('#bSpeed');
  // win quickly
  await p.evaluate(() => { const s = BB.testHooks.scene(); for (const e of s.ents) if (e.side === 'foe') { e.hp = 1; } s.heroList.forEach((h) => (h.st.atk *= 50)); });
  await p.waitForFunction(() => document.getElementById('mResults').classList.contains('on'), null, { timeout: 90000 });
  await wait(500); await shot('10-results');
  const res = await p.evaluate(() => document.getElementById('resBody').innerText);
  if (!/victory/i.test(res)) errs.push('results: no victory: ' + res.slice(0, 120));
  // Camp
  await p.click('#resBody .btn.dark');
  await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 15000 });
  // give resources so every screen shows its buttons
  await p.evaluate(() => { const S = BB.save; S.gold += 20000; S.crystals += 2000; S.sigils += 20; for (let i = 0; i < 6; i++) S.inventory.push(BB.makeItem(BB.rng(i + 1), BB.SLOTS[i % 4], 3, i % 4, i % 4 === 0 ? 'sword' : undefined)); BB.UI.refreshTop(); BB.UI.renderHome(); });
  await wait(600); await shot('11-camp-rich');
  await tap('.tab[data-tab=heroes]'); await wait(300); await shot('12-heroes');
  await tap('#bRecruit'); await wait(800); await shot('13-recruit');
  await tap('#altarInfo .btn.xl');
  await wait(600); await shot('14-reveal-open');
  await wait(3800); await shot('15-reveal');
  await tap('#rvOk');
  await tap('#bRecBack'); await wait(300);
  // the hero screen is painted on a canvas: press its regions by id
  const region = async (id) => {
    const pt = await p.evaluate((id) => { const H = BB.UI.hs, R = H.regions.find((r) => r.id === id); if (!R) return null; const rc = document.getElementById('hgCv').getBoundingClientRect(); return { x: rc.left + (H.ox + (R.x + R.w / 2) * H.S) / H.dpr, y: rc.top + (H.oy + (R.y + R.h / 2) * H.S) / H.dpr }; }, id);
    if (!pt) { errs.push('no hero-screen region ' + id); return; }
    await p.mouse.click(pt.x, pt.y); await wait(300);
  };
  await tap('#heroList .hc'); await wait(900); await shot('16-hero');
  const lv0 = await p.evaluate(() => BB.UI.hs.id && BB.save.heroes.find((h) => h.id === BB.UI.hs.id).level);
  await region('lvl'); await wait(250); await shot('16b-hero-levelup');
  const lv1 = await p.evaluate(() => BB.save.heroes.find((h) => h.id === BB.UI.hs.id).level);
  if (lv1 !== lv0 + 1) errs.push('level up did not work: ' + lv0 + ' -> ' + lv1);
  await region('sock-weapon'); await wait(300); await shot('17-pick-gear');
  await region('item-0'); await wait(300);
  if (!(await p.evaluate(() => !!BB.save.heroes.find((h) => h.id === BB.UI.hs.id).gear.weapon))) errs.push('equip from the picker did not work');
  await region('max'); await wait(300);
  await region('tab-tree'); await wait(400); await shot('17b-tree');
  await region('node-m1'); await region('learn'); await region('learn'); await region('node-g1'); await region('learn'); await region('node-u1'); await wait(500); await shot('17c-tree-learned');
  if ((await p.evaluate(() => BB.talentRank(BB.save.heroes.find((h) => h.id === BB.UI.hs.id), 'm1'))) !== 2) errs.push('learning a skill did not work');
  await region('next'); await wait(500); await shot('18-hero-next');
  await p.evaluate(() => BB.UI.go('team')); await wait(400); await shot('19-team');
  await tap('.tab[data-tab=forge]'); await wait(300); await shot('20-forge');
  await tap('.tab[data-tab=shop]'); await wait(300); await shot('21-shop');
  await tap('#offers .btn'); await wait(200);
  await tap('#bSettings'); await wait(300); await shot('22-settings');
  await tap('#bSetClose');
  await tap('.tab[data-tab=home]'); await wait(800);
  await tap('#bSpoils'); await wait(300);
  // a defeat: results offer a retry
  await p.evaluate(() => BB.deploy(1));
  await p.waitForFunction(() => BB.UI.current === 'hud', null, { timeout: 20000 });
  await wait(3500);
  await tap('#bPause'); await shot('23-pause');
  await tap('#bRetreat');
  await p.waitForFunction(() => document.getElementById('mResults').classList.contains('on'), null, { timeout: 20000 });
  await wait(400); await shot('24-defeat');
  console.log('screen at end:', await screen());
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
