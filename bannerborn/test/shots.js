// Headless playthrough: title → new game → camp → campaign → team → battle (ultimate, auto) → results
// → heroes → hero → recruit (reveal) → team → shop → settings. Fails on console errors.
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
  // the opening cutscene plays on a new game
  await p.waitForFunction(() => BB.Cinema.on && !BB.Cinema.loading, null, { timeout: 20000 });
  await wait(3500); await shot('02-intro-cutscene');
  await p.click('#cineSkip');
  await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 15000 });
  await wait(1500); await shot('03-camp');
  await tap('.tab[data-tab="play"]'); await wait(500); await shot('04-play');
  await tap('.tab[data-tab="home"]'); await wait(700);
  await tap('#bContinue'); await wait(500); await shot('05-team-prebattle'); // the camp's Battle button goes straight to the line-up
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
  await p.click('#resBody .btn.dark:not(.adbtn)');
  await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 15000 });
  // the guide opens once, after the first victory
  await wait(400); if (!(await p.isVisible('#mGuide.on'))) errs.push('the guide did not open after the first victory'); else { await shot('10b-guide'); await tap('#bGuideClose'); }
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
  // the hero's page: every control carries its name in data-r
  const region = async (id) => {
    const b = await p.$('[data-r="' + id + '"]');
    if (!b) { errs.push('no hero-page control ' + id); return; }
    await b.click(); await wait(300);
  };
  await tap('#heroList .hc'); await wait(900); await shot('16-hero');
  const lv0 = await p.evaluate(() => BB.UI.hs.id && BB.save.heroes.find((h) => h.id === BB.UI.hs.id).level);
  // levels come from fighting: the first battle taught the captain something; grant a few battles' worth here
  if (!(await p.evaluate(() => BB.save.heroes.find((h) => h.id === BB.UI.hs.id).xp > 0 || BB.save.heroes.find((h) => h.id === BB.UI.hs.id).level > 1))) errs.push('the battle gave no experience');
  await p.evaluate(() => BB.gainXp(BB.save.heroes.find((h) => h.id === BB.UI.hs.id), 2000)); await wait(250); await shot('16b-hero-xp');
  const lv1 = await p.evaluate(() => BB.save.heroes.find((h) => h.id === BB.UI.hs.id).level);
  if (!(lv1 > lv0)) errs.push('experience did not level up: ' + lv0 + ' -> ' + lv1);
  await region('sock-weapon'); await wait(300); await shot('17-pick-gear');
  await region('item-0'); await wait(300);
  if (!(await p.evaluate(() => !!BB.save.heroes.find((h) => h.id === BB.UI.hs.id).gear.weapon))) errs.push('equip from the picker did not work');
  await region('tab-tree'); await wait(400); await shot('17b-tree');
  await region('node-m1'); await region('learn'); await region('learn'); await region('node-g1'); await region('learn'); await region('node-u1'); await wait(500); await shot('17c-tree-learned');
  if ((await p.evaluate(() => BB.talentRank(BB.save.heroes.find((h) => h.id === BB.UI.hs.id), 'm1'))) !== 2) errs.push('learning a skill did not work');
  await region('next'); await wait(500); await shot('18-hero-next');
  await p.evaluate(() => BB.UI.go('team')); await wait(400); await shot('19-team');
  if (await p.$('.tab[data-tab=forge]')) errs.push('the Forge tab is still there');
  await tap('.tab[data-tab=shop]'); await wait(1800); await shot('21-market');
  if ((await p.$$('.mk-plate')).length !== 5) errs.push('the market should have five traders (four, and the treasurer)');
  await p.evaluate(() => BB.UI.marketOpen('gems')); await wait(1500); await shot('21b-trader');
  await tap('#offers .btn'); await wait(200);
  await p.evaluate(() => BB.UI.marketOpen(null)); await wait(300);
  await tap('#bSettings'); await wait(300); await shot('22-settings');
  await tap('#bSetClose');
  await tap('.tab[data-tab=home]'); await wait(800);
  await tap('#bSpoils'); await wait(300);
  if (await p.isVisible('#mSpoils.on')) { await tap('#spTake'); await wait(200); } // enough gathered to be offered double: take it as it is
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
