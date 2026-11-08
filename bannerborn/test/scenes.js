// Mid-fight screenshots of chosen stages with a strong five-hero team (recruits and legends), on AUTO.
// usage: NODE_PATH=$(npm root -g) node test/scenes.js /tmp/bb-scenes 4,7,15,23,29
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/bb-scenes';
const list = (process.argv[3] || '4,7,15,23,29').split(',').map(Number);
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8123/index.html?test');
  await p.waitForFunction(() => window.BB && BB.UI && BB.UI.current === 'title', null, { timeout: 30000 });
  for (const idx of list) {
    await p.evaluate((idx) => {
      const S = BB.newSave(Date.now()); BB.save = S;
      S.settings.auto = true; BB.MISSIONS.forEach((m) => (S.seen['cine_' + m.id] = 1)); [2, 3, 4].forEach((c) => (S.seen['cine_ch' + c] = 1));
      const st = BB.MISSIONS[idx];
      BB.MISSIONS.slice(0, idx).forEach((m) => (S.cleared[m.id] = 1));
      const legends = Object.keys(BB.LEGENDS).filter((id) => BB.MISSIONS.findIndex((m) => m.legend === id) < idx);
      for (const id of legends.slice(0, 2)) BB.joinLegend(S, id);
      const pool = BB.ROSTER.filter((c) => c.role === 'hero');
      for (const arch of ['knight', 'mage', 'ranger', 'monk']) { const e = pool.find((c) => c.arch === arch); if (e && S.heroes.length < 5) S.heroes.push(BB.heroFromEntry(S, Object.assign({}, e, { rarity: 2 }))); }
      for (const h of S.heroes) { h.stars = 1 + Math.floor(idx / 10); h.level = Math.min(BB.levelCap(h), st.level + 2); for (const slot of BB.SLOTS) S.inventory.push(BB.makeItem(BB.rng(idx * 7 + S.heroes.indexOf(h)), slot, st.level, 1, slot === 'weapon' ? BB.weaponType(h.calling) : undefined)); BB.equipBest(S, h); }
      BB.autoFill(S);
      BB.deploy(idx);
    }, idx);
    await p.waitForFunction(() => BB.UI.current === 'hud', null, { timeout: 30000 });
    await p.waitForTimeout(9000);
    await p.screenshot({ path: out + '/stage-' + idx + '.png' });
    const st = await p.evaluate(() => { const s = BB.testHooks.scene(); return { t: Math.round(s.time), heroes: s.heroList.filter((e) => !e.dead).length, foes: s.foesAlive().length, obj: s.obj.text, result: s.result && s.result.win }; });
    console.log('stage', idx, JSON.stringify(st));
    await p.evaluate(() => { const s = BB.testHooks.scene(); s.result = s.result || { win: true, t: 99, shown: true }; s.result.shown = true; BB.UI.modal('mResults', false); });
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
