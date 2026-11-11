// Headless check: a new game (prologue, guided trial, result, map, skill tree, the next node), the
// roster, the Last Ditch Effort beat by beat, defeat, settings, credits, every arena, the phone layout. Screenshots each and reports
// console errors. Usage: NODE_PATH=$(npm root -g) node vesper/test/browser.js <outdir> [port]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '/tmp/vesper-shots', port = process.argv[3] || 8765;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const url = `http://127.0.0.1:${port}/vesper/index.html`;
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.VS && VS.main && VS.main.state === 'title', null, { timeout: 60000 });
  const shot = async (name, wait) => { await page.waitForTimeout(wait == null ? 150 : wait); await page.screenshot({ path: `${out}/${name}.png` }); };
  const button = (text) => page.locator('#ui .btn', { hasText: text }).first().click();
  await shot('01-title', 900);

  // A new game: the prologue, the trial (guided), its result, the map.
  await button('New game');
  await page.waitForFunction(() => VS.main.state === 'intro');
  await page.waitForFunction(() => VS.INTRO.st && VS.INTRO.st.t > 9, null, { timeout: 60000 });
  await shot('02-opening', 100);
  await page.keyboard.press('Escape');
  // The last hour (the end-game glimpse): it plays, then Esc skips it, then the title card.
  await page.waitForFunction(() => VS.main.state === 'fight' && VS.main.fight.showcase, null, { timeout: 60000 });
  await shot('02b-last-hour', 2500);
  await page.keyboard.press('Escape');
  // Skipping goes to the Moon raising her (a film, skippable too), then the first trial.
  await page.waitForFunction(() => VS.main.state === 'intro' && VS.INTRO.st && VS.INTRO.st.f === VS.FILMS.rise); await shot('02c-rise', 1500); await page.keyboard.press('Escape');
  await page.waitForFunction(() => VS.main.state === 'fight' && VS.main.fight.nodeId === 'a0-t');
  await shot('03-trial', 2600);
  // After the last hour (the tutorial), the first node is a plain fight: no lessons, no messages, the dead come on their own.
  await page.waitForTimeout(1500);
  if (await page.locator('#ui .ls-ok').count()) errors.push('the first fight after the tutorial opened a lesson');
  if (await page.evaluate(() => !!VS.main.fight.tut || VS.main.fight.s.scripted)) errors.push('the first fight after the tutorial is still a tutorial');
  // Moving: she answers the key (she may be knocked about by the dead meanwhile, so watch for her running or moving).
  { const x0 = await page.evaluate(() => VS.main.fight.s.hero.x); let ok = false;
    await page.keyboard.down('KeyD');
    for (let i = 0; i < 12 && !ok; i++) { await page.waitForTimeout(60); ok = await page.evaluate((x0) => { const h = VS.main.fight.s.hero; return h.state === 'move' || h.x > x0 + 5; }, x0); }
    await page.keyboard.up('KeyD'); if (!ok) errors.push('moving did not work in the first fight'); }
  const okCard = async () => {};
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(130); }
  await shot('04-combo', 40);
  // Dodging: within a few frames of the key (unless she is mid-hit), she rolls.
  { let ok = false; await okCard(); await page.keyboard.press('Space');
    for (let i = 0; i < 8 && !ok; i++) { await page.waitForTimeout(40); ok = await page.evaluate(() => VS.main.fight.s.hero.state === 'dodge'); }
    if (!ok && await page.evaluate(() => VS.main.fight.s.hero.state === 'hurt')) { await page.waitForTimeout(400); await page.keyboard.press('Space'); for (let i = 0; i < 8 && !ok; i++) { await page.waitForTimeout(40); ok = await page.evaluate(() => VS.main.fight.s.hero.state === 'dodge'); } }
    if (!ok) errors.push('dodge did not work from the start'); }
  await okCard(); await page.keyboard.press('Escape'); await shot('05-pause', 400);
  if (!(await page.evaluate(() => VS.ui.current === 'pause'))) errors.push('pause menu did not open');
  await button('Resume'); await page.waitForTimeout(200);
  await page.evaluate(() => { VS.main.save.opts.auto = true; });
  await page.waitForFunction(() => VS.ui.current === 'result', null, { timeout: 180000 });
  await shot('06-trial-result', 900);
  console.log('after trial', await page.evaluate(() => { const p = VS.main.save; return `level ${p.lvl} sp ${p.sp} cleared ${VS.PROG.cleared(p, 'a0-t')}`; }));
  await button('Continue');
  await page.waitForFunction(() => VS.main.state === 'map'); await shot('07-map', 900);
  // Learn dodge in the skill tree, then fight the next node.
  await page.locator('#ui .chip', { hasText: 'Skills' }).click();
  await page.waitForFunction(() => VS.ui.current === 'skills'); await shot('08-skills', 400);
  // A ready skill is selected first; a click on the selected one (or Learn) learns it.
  const n0 = await page.evaluate(() => VS.main.save.skills.length);
  await page.locator('#ui .sk2-node.can').first().click(); await page.waitForTimeout(200);
  if ((await page.evaluate(() => VS.main.save.skills.length)) === n0 && await page.locator('#ui [data-act="learn"]:not(.off)').count()) await page.locator('#ui [data-act="learn"]').click();
  await page.waitForTimeout(200);
  console.log('skills', await page.evaluate(() => VS.main.save.skills.join(',')));
  await page.locator('#ui .chip', { hasText: 'Back to map' }).click();
  await page.waitForFunction(() => VS.main.state === 'map');
  await page.locator('#ui .big-btn').click();
  await page.waitForFunction(() => VS.main.state === 'fight' && VS.main.fight.nodeId === 'a0-1');
  await shot('09-tip', 2600);
  await page.waitForFunction(() => VS.ui.current === 'result', null, { timeout: 120000 });
  await shot('10-result', 900);
  await button('Continue'); await page.waitForFunction(() => VS.main.state === 'map');
  // Heroes, with the locked ones.
  await page.locator('#ui .chip', { hasText: 'Vesper' }).click(); await page.waitForFunction(() => VS.ui.current === 'roster'); await shot('11-roster', 700);
  await button('Back');
  await page.evaluate(() => { VS.main.save.opts.auto = false; });

  // The Last Ditch Effort, beat by beat (frozen), from the theatre.
  await page.evaluate(() => { VS.main.save.opts.auto = false; VS.main.theatre(); });
  await page.waitForFunction(() => VS.main.fight && VS.main.fight.s.cine, null, { timeout: 5000 });
  const beats = await page.evaluate(() => VS.cine.BEATS.ldx);
  await page.evaluate(() => { VS.main.hold = true; });
  for (const [name, a, b] of beats) { await page.evaluate((t) => { VS.main.fight.s.cine.t = t; }, a + (b - a) * 0.6); await shot(`10-ldx-${a.toFixed(2)}-${name}`, 80); }
  await page.evaluate(() => { VS.main.hold = false; });
  await page.waitForFunction(() => !VS.main.fight.s.cine, null, { timeout: 12000 });
  await shot('11-after-ldx', 250);
  console.log('after ldx', await page.evaluate(() => { const s = VS.main.fight.s; return s.hero.hp + '/' + s.hero.maxHp + ' ' + VS.sim.foes(s).map((u) => u.key + ':' + u.hp).join(','); }));
  await page.waitForFunction(() => VS.main.state === 'title', null, { timeout: 5000 });

  // Defeat in a campaign fight.
  await page.evaluate(() => { VS.main.startNode('a0-1'); const s = VS.main.fight.s; s.hero.hp = 0; s.result = 'lose'; });
  await page.waitForFunction(() => VS.ui.current === 'result'); await shot('13-lost', 400);
  await button('Try again'); await page.waitForFunction(() => VS.main.state === 'fight');

  // Settings and credits.
  await page.evaluate(() => VS.main.title()); await page.waitForTimeout(200);
  await button('Settings'); await button('Music'); await shot('14-settings', 300);
  console.log('music after one press', await page.evaluate(() => VS.main.save.opts.music));
  await button('Back'); await button('Credits'); await shot('15-credits', 300); await button('Back');

  for (let i = 0; i < 6; i++) { await page.evaluate((i) => VS.main.startFight(i), i); await shot(`16-arena-${i}`, 1200); }
  await page.close();

  // A phone, touch controls.
  const ctx = await browser.newContext({ ...devices['iPhone 14 landscape'] });
  const ph = await ctx.newPage(); ph.on('pageerror', (e) => errors.push('PHONE ' + e.message));
  await ph.goto(url); await ph.waitForFunction(() => VS.main && VS.main.state === 'title', null, { timeout: 60000 });
  await ph.waitForTimeout(600); await ph.screenshot({ path: `${out}/17-phone-title.png` });
  await ph.evaluate(() => { VS.R.touch = true; VS.main.save.skills = VS.PROG.SKILLS.filter((k) => k.core).map((k) => k.id); VS.main.startFight(3); VS.main.save.opts.auto = true; });
  await ph.waitForFunction(() => VS.main.state !== 'fight' || VS.main.fight.s.time > 10, null, { timeout: 90000 });
  await ph.waitForTimeout(1500); await ph.screenshot({ path: `${out}/18-phone-fight.png` });
  await ctx.close();
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
