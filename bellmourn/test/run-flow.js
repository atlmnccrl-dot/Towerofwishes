// A scripted run in the browser, a screenshot at each step: the title, the warden select, the talents, the
// tutorial duel (each beat, the first boon), the route map, an area and its fight, a boon pick, an event and its
// result, a shrine (the Haven: walking in, the panel), the merchant, death and the run summary, back to the title.
// The fights are played by the autoplay bot; the screens are answered through their handlers, as taps would.
// NODE_PATH=$(npm root -g) node bellmourn/test/run-flow.js <outdir> [width=844] [height=390]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-flow'; const W = +(process.argv[3] || 844), H = +(process.argv[4] || 390);
  fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`); await p.evaluate(() => localStorage.clear());
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`);
  await p.waitForFunction(() => window.BM && BM.ready, null, { timeout: 120000 });
  let n = 0; const shot = async (name) => { await p.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}-${name}.png` }); console.log('shot', name, await p.evaluate(() => BM.game.state + (BM.game.screenName ? ':' + BM.game.screenName : '') + (BM.game.tutorial ? ':' + BM.game.tutorial.beat : ''))); };
  const until = async (fn, ms = 90000, arg) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }); return true; } catch (e) { console.log('TIMEOUT waiting for', fn.toString().slice(0, 120)); return false; } };
  const fail = []; const check = (c, m) => { if (!c) { fail.push(m); console.log('FAIL', m); } };
  // the bot plays the fights; the screens are ours
  await p.evaluate(async () => { const m = await import('./js/game/autoplay.js'); BM.game.autoRuns = 0; BM.game.autoNoScreens = true; BM.game.timeScale = 1.5; BM.game.autoMake = () => m.makeAutoplay(3); });
  const botOn = () => p.evaluate(() => { BM.game.auto = BM.game.autoMake(); });
  const botOff = () => p.evaluate(() => { BM.game.auto = null; });

  await p.waitForTimeout(1500); await shot('title');
  await p.evaluate(() => BM.game.newRunFlow()); await p.waitForTimeout(1200); await shot('select');
  check(await p.evaluate(() => BM.game.screenName === 'SelectScreen'), 'the select screen opens');
  await p.evaluate(() => BM.game.screenH.choose('warden')); await p.waitForTimeout(1000); await shot('talents');
  check(await p.evaluate(() => BM.game.screenName === 'TalentScreen'), 'the talent screen opens');
  await p.evaluate(() => { const g = BM.game; g.screenH.pick('vigor'); g.screenH.start(); });
  await until(() => BM.game.tutorial && BM.game.state === 'play', 300000); await botOn(); // the opening cinematic plays first (about a minute)
  for (const beat of ['intro', 'strike', 'dash', 'perfect']) { await until((bt) => BM.game.tutorial && BM.game.tutorial.beat === bt, 60000, beat); await p.waitForTimeout(beat === 'intro' ? 2600 : 700); await shot('duel-' + beat); }
  await until(() => BM.game.tutorial && BM.game.tutorial.freeze, 30000); await shot('duel-perfect-frozen');
  await until(() => BM.game.screenName === 'BoonScreen', 60000); await p.waitForTimeout(900); await shot('duel-boon');
  await p.evaluate(() => { const g = BM.game; g.screenH.pick(g.screenData.offers[0].id); });
  await until(() => BM.game.tutorial && BM.game.tutorial.beat === 'ult'); await p.waitForTimeout(400); await shot('duel-ult');
  await until(() => BM.game.tutorial && BM.game.tutorial.beat === 'finish', 30000); await p.waitForTimeout(500); await shot('duel-finish');
  await until(() => BM.game.tutorial && BM.game.tutorial.beat === 'title' && BM.game.tutorial.bt > 3.4, 30000); await shot('duel-title');
  await until(() => BM.game.screenName === 'MapScreen', 30000); await botOff(); await p.waitForTimeout(1200); await shot('map');
  check(await p.evaluate(() => BM.game.meta.story.seen.tutorial === true && BM.game.run.boons.length === 1), 'the duel is remembered and gave a boon');
  // an area: Gallows Gate, its first fight, a boon
  await p.evaluate(() => { const g = BM.game; g.screenH.pick(g.screenData.run.map.start[0]); });
  await until(() => BM.game.state === 'play' && BM.game.levelId === 'gate'); await p.waitForTimeout(1800); await shot('area-gate'); await botOn();
  // (an in-level event, a cursed lamp's card, may come first: answered as the autoplay would)
  for (let k = 0; k < 300 && !(await p.evaluate(() => BM.game.screenName === 'BoonScreen')); k++) { if (await p.evaluate(() => BM.game.screenName === 'EventScreen')) { await shot('area-event'); await p.evaluate(() => BM.game.autoScreen()); await p.waitForTimeout(800); await p.evaluate(() => { if (BM.game.screenName === 'EventScreen') BM.game.autoScreen(); }); } await p.waitForTimeout(1000); }
  await p.waitForTimeout(900); await shot('area-boon'); await botOff();
  const nb = await p.evaluate(() => BM.game.run.boons.length);
  await p.evaluate(() => { const g = BM.game; g.screenH.pick(g.screenData.offers[0].id); }); await p.waitForTimeout(600);
  check(await p.evaluate((k) => BM.game.run.boons.length === k + 1 && BM.game.state === 'play', nb), 'a boon after a cleared fight');
  check(await p.evaluate(() => { const r = BM.game.run; return JSON.parse(localStorage.getItem('bellmourn.run.v3')).boons.length === r.boons.length; }), 'the run is saved');
  // the gate is won (by script, to keep this short): on to an event from the map
  await p.evaluate(() => { const g = BM.game; g.keepHero(); g.nodeDone({ boss: 'gaoler', echo: 'gaoler' }); });
  await p.waitForTimeout(800); await shot('map-2');
  await p.evaluate(() => { const g = BM.game; const r = g.run; const nx = r.map.nodes.find((x) => x.id === r.at).next.map((id) => r.map.nodes.find((x) => x.id === id)); const ev = nx.find((x) => x.kind === 'event'); if (ev) g.screenH.pick(ev.id); else { g.closeScreen(); g.doEvent({ id: 'test-event', kind: 'event', act: 1 }); } });
  await until(() => BM.game.screenName === 'EventScreen', 20000); await p.waitForTimeout(1200); await shot('event');
  await p.evaluate(() => BM.game.screenH.choose(0)); await p.waitForTimeout(1200); await shot('event-result');
  await p.evaluate(() => BM.game.autoScreen());
  await p.waitForTimeout(800);
  if (await p.evaluate(() => BM.game.screenName === 'BoonScreen')) { await p.evaluate(() => { const g = BM.game; g.screenH.pick(g.screenData.offers[0].id); }); await p.waitForTimeout(500); }
  if (await p.evaluate(() => BM.game.screenName === 'EventScreen')) { await p.evaluate(() => BM.game.autoScreen()); await p.waitForTimeout(800); }
  // a shrine: the Haven, alone at the great lantern
  await p.evaluate(() => { const g = BM.game; g.closeScreen(); g.run.hp = Math.round(g.run.maxHp * 0.5); g.runNode({ id: 'test-shrine', kind: 'shrine', act: 1 }); });
  await until(() => BM.game.state === 'haven'); await p.waitForTimeout(2600); await shot('shrine-arrive');
  await until(() => BM.game.haven && BM.game.haven.ready(), 30000); await p.waitForTimeout(800); await shot('shrine-panel');
  const hp0 = await p.evaluate(() => BM.game.run.hp); await p.evaluate(() => BM.game.screenH.heal()); await p.waitForTimeout(600);
  check(await p.evaluate((h) => BM.game.run.hp > h, hp0), 'the shrine heals'); await shot('shrine-healed');
  await p.evaluate(() => BM.game.screenH.leave()); await p.waitForTimeout(1200); await shot('shrine-leave');
  await until(() => BM.game.screenName === 'MapScreen', 20000);
  // the merchant
  await p.evaluate(() => { const g = BM.game; g.closeScreen(); g.run.embers += 300; g.runNode({ id: 'test-shop', kind: 'merchant', act: 1 }); });
  await until(() => BM.game.screenName === 'MerchantScreen'); await p.waitForTimeout(1000); await shot('merchant');
  const e0 = await p.evaluate(() => BM.game.run.embers); await p.evaluate(() => { const g = BM.game; const it = g.screenData.stock.find((x) => x.kind === 'relic'); g.screenH.buy(it); });
  check(await p.evaluate((e) => BM.game.run.embers < e && BM.game.run.relics.length === 1, e0), 'the merchant sells a relic');
  await p.evaluate(() => BM.game.screenH.leave()); await until(() => BM.game.screenName === 'MapScreen', 10000);
  // death ends the run: the summary, then the title
  await p.evaluate(() => { const g = BM.game; const r = g.run; const nx = r.map.nodes.filter((x) => x.kind === 'area' && x.act === 1)[1]; g.closeScreen(); g.runNode(nx); });
  await until(() => BM.game.state === 'play'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const g = BM.game; g.world.hero.hp = 0; g.handleEvents([{ type: 'heroDeath', e: g.world.hero }]); });
  await p.waitForTimeout(1500); await shot('dead');
  await until(() => BM.game.screenName === 'SummaryScreen', 60000, null); await p.waitForTimeout(1500); await shot('summary');
  check(await p.evaluate(() => !BM.game.run && !localStorage.getItem('bellmourn.run.v3') && BM.game.meta.runs === 1 && BM.game.meta.shards > 0), 'death ends the run and pays into meta');
  await p.evaluate(() => BM.game.screenH.done()); await p.waitForTimeout(800);
  // shards to spend: the run's end opens the Bell Tower first
  if (await p.evaluate(() => BM.game.screenName === 'TowerScreen')) { await shot('tower-after'); await p.evaluate(() => BM.game.screenH.back()); }
  await until(() => BM.game.state === 'title', 30000); await p.waitForTimeout(1000); await shot('title-after');
  console.log('errors:', errs.length ? [...new Set(errs.map((e) => e.split('\n')[0]))].slice(0, 10) : 'none');
  console.log(fail.length ? fail.length + ' checks FAILED' : 'all flow checks pass');
  await b.close(); process.exit(fail.length ? 1 : 0);
})();
