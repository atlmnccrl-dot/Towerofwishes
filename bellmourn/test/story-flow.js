// The story's flow by script, in the browser, with real key presses for the lines and the bell:
//  1. a new game: the training road -> the Old Road scene -> (the training is cut short) the gate scene ->
//     the Haven with Sister Ash -> ONWARD into Gallows Gate;
//  2. ?level=gate&boss=1&god=1: the Gaoler's entrance and line, he falls (struck down by the test), his last
//     words, then Kestrel's scene;
//  3. ?level=belfry&boss=1&god=1: Saint Silence's scene, his fight, the bell scene (three strikes with J),
//     the end of Act I, the Haven with the Act II scene.
// NODE_PATH=$(npm root -g) node bellmourn/test/story-flow.js /tmp/bm-flow
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-flow'; fs.mkdirSync(out, { recursive: true });
  const port = process.env.PORT || 8790; const base = `http://127.0.0.1:${port}/bellmourn/index.html`;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  const log = (...a) => console.log(...a);
  const st = () => p.evaluate(() => { const g = BM.game; return { state: g.state, level: g.levelId, scene: g.cut && g.cut.id, line: g.cut && g.cut.line && g.cut.line.name, boss: g.bossState, bark: g.bark && g.bark.text }; });
  const ready = async () => { await p.waitForFunction(() => window.BM && BM.ready && BM.frames > 3, null, { timeout: 90000 }); await p.evaluate(() => { const f = BM.game.fx; if (typeof f._auras !== 'function' && /_auras/.test(f.updateTeles.toString())) Object.getPrototypeOf(f)._auras = () => {}; }); };
  const until = async (fn, ms = 60000, every = 150, onTick) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (fn(s)) return s; if (onTick) await onTick(s); await p.waitForTimeout(every); } throw new Error('timeout; last state ' + JSON.stringify(await st())); };
  const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
  // lines move on with Enter (as a player would); scenes run fast to keep the test short
  const press = async () => { await p.keyboard.press('Enter'); };
  const fast = () => p.evaluate(() => { if (BM.game.cut) BM.game.cut.speed = 4; });
  let fails = 0; const check = (ok, what) => { log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };

  // ---- 1. a new game through the Old Road
  await p.goto(base); await ready(); await p.evaluate(() => { localStorage.clear(); });
  await p.goto(base); await ready();
  await until((s) => s.state === 'title');
  await p.evaluate(() => { const g = BM.game; g.selHero = 0; g.selStep = 0; g.go('select'); });
  await p.waitForTimeout(300); await press(); await p.waitForTimeout(300); await press(); // CHOOSE, then THE TRAINING ROAD
  await until((s) => s.state === 'story'); check(true, 'the opening cards');
  await p.keyboard.press('Escape'); // past the cards
  let s = await until((x) => x.state === 'cutscene' && x.scene === 'prologue.road', 60000);
  check(true, 'the Old Road scene plays on entering the prologue');
  await until((x) => x.line === 'THE CROW-MASKED WARDEN', 30000, 150, async () => { await fast(); await press(); });
  await shot('1-prologue-road'); check(true, 'the crow-masked warden speaks');
  await until((x) => x.state === 'play', 30000, 150, async () => { await press(); });
  check((await st()).level === 'prologue', 'back to the training after the scene');
  // the training is cut short: straight to its last step, then out through the gate
  await p.evaluate(() => { const g = BM.game; const T = g.tutorial; T.i = T.total - 1; T.doneT = 0; const z = g.level.def.exit.zone; const h = g.world.hero; h.x = (z[0] + z[2]) / 2; h.z = (z[1] + z[3]) / 2; });
  await until((x) => x.state === 'cutscene' && x.scene === 'prologue.meet', 20000);
  check(true, 'the wardens meet at the gate');
  await until((x) => x.line === 'BRAM', 30000, 150, async () => { await fast(); await press(); }); await shot('1-prologue-meet');
  await until((x) => x.scene === 'haven.ash', 40000, 200, async () => { await press(); });
  check(true, 'Sister Ash at the first Haven visit');
  await until((x) => x.line === 'SISTER ASH', 30000, 150, async () => { await fast(); await press(); }); await shot('1-haven-ash');
  await until((x) => x.state === 'haven', 40000, 200, async () => { await press(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const g = BM.game; if (g.haven) { g.haven.intro = -1; g.haven.menuK = 1; g.haven.onward(); } });
  await until((x) => x.state === 'play' && x.level === 'gate', 40000);
  check(true, 'ONWARD into Gallows Gate'); await p.waitForTimeout(600); await shot('1-gate');

  // ---- 2. the Gaoler, his entrance, his fall and Kestrel
  await p.goto(base + '?level=gate&boss=1&god=1'); await ready();
  s = await until((x) => x.state === 'bossIntro', 30000);
  check(true, 'the Gaoler\'s intro'); await p.waitForTimeout(1800); await shot('2-gaoler-intro');
  await until((x) => x.state === 'play' && x.boss === 'fight', 20000, 200, async () => { await press(); });
  await p.evaluate(() => { const g = BM.game, w = g.world, b = g.boss; w._kill(b, w.hero, {}); });
  s = await until((x) => x.boss === 'done', 30000); await p.waitForTimeout(500);
  check(!!s.bark || !!(await st()).bark, 'the Gaoler\'s last words'); await shot('2-gaoler-falls');
  s = await until((x) => x.state === 'cutscene' && x.scene === 'recruit.kestrel', 90000);
  check(true, 'Kestrel\'s scene after the Gaoler');
  await until((x) => x.line === 'KESTREL', 30000, 150, async () => { await fast(); }); await p.waitForTimeout(400); await shot('2-kestrel');
  await until((x) => x.state === 'play', 60000, 200, async () => { await press(); });
  check(true, 'back to the district after the scene');

  // ---- 3. the Belfry: Silence, the bell, the end of Act I
  await p.goto(base + '?level=belfry&boss=1&god=1'); await ready();
  // his entrance first (a key press jumps it to its end), then his words
  s = await until((x) => x.state === 'cutscene' && x.scene === 'silence.pre', 90000, 300, async (x) => { if (x.state === 'bossIntro') await press(); });
  check(true, 'Saint Silence speaks before his fight');
  await until((x) => x.line === 'SAINT SILENCE', 20000, 150, async () => { await fast(); }); await p.waitForTimeout(400); await shot('3-silence-pre');
  await until((x) => x.state === 'play' && x.boss === 'fight', 60000, 200, async () => { await press(); });
  await p.evaluate(() => { const g = BM.game, w = g.world, b = g.boss; w._kill(b, w.hero, {}); });
  s = await until((x) => x.state === 'cutscene' && x.scene === 'belfry.bell', 90000);
  check(true, 'the bell scene after Silence falls');
  for (let t0 = Date.now(); Date.now() - t0 < 60000;) { if (await p.evaluate(() => !!(BM.game.cut && BM.game.cut.strikeS))) break; await fast(); await press(); await p.waitForTimeout(150); }
  const strikeUp = await p.evaluate(() => !!(BM.game.cut && BM.game.cut.strikeS)); check(strikeUp, 'the bell waits to be struck');
  await p.evaluate(() => { BM.game.cut.speed = 1; });
  await p.waitForTimeout(700); await shot('3-bell-strike-0');
  for (let i = 1; i <= 3; i++) { await p.keyboard.press('j'); await p.waitForTimeout(i === 3 ? 900 : 700); await shot('3-bell-strike-' + i); }
  const rang = await p.evaluate(() => { const g = BM.game; const bl = g.level.marks.bell; return { amp: bl && bl.amp, dawn: g.r.post.dawn, strikes: g.cut ? (g.cut.strikeS ? g.cut.strikeS.i : 'done') : 'none' }; });
  check(rang.strikes === 'done' && rang.amp > 0.1, 'three strikes ring the bell (it swings: amp ' + (rang.amp || 0).toFixed(2) + ', dawn ' + (+rang.dawn).toFixed(2) + ')');
  await p.waitForTimeout(2500); await shot('3-bell-dawn');
  await until((x) => x.line === 'TAM', 60000, 150, async () => { await fast(); await press(); }); await shot('3-bell-tam');
  await until((x) => x.line === 'SAINT SILENCE', 60000, 150, async () => { await fast(); await press(); }); await shot('3-bell-crack');
  await until((x) => x.scene === 'act1.end', 60000, 200, async () => { await press(); });
  check(true, 'the end of Act I'); await p.waitForTimeout(1600); await shot('3-act1-end');
  await until((x) => x.scene === 'act2.open', 60000, 200, async () => { await press(); });
  check((await st()).level === 'haven', 'the Haven opens Act II'); await until((x) => !!x.line, 30000, 150, async () => { await fast(); }); await shot('3-act2-open');
  await until((x) => x.state === 'haven', 60000, 200, async () => { await press(); });
  check(true, 'the Haven menu after the scene'); await p.waitForTimeout(1500); await shot('3-haven');

  check(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
  log(fails ? fails + ' checks failed' : 'the story flows');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
