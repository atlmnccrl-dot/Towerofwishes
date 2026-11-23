// Plays whole runs in the browser on autoplay: title -> warden select -> talents -> the Old Road (the tutorial
// duel on the first run) -> the route map -> areas, events, shrines, merchants, trials, quests, boon picks ->
// death or an ending -> the run summary -> the title. Logs progress, screenshots each screen and each node,
// reports console errors and stalls (no progress for 6 minutes), and says when a run has finished.
// NODE_PATH=$(npm root -g) node bellmourn/test/autoplay-browser.js <outdir> [maxMinutes=40] [speed=3] [god=0] [runs=1] [hero]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-auto'; const maxMin = +(process.argv[3] || 40); const speed = process.argv[4] || 3; const god = process.argv[5] || '0';
  const runs = +(process.argv[6] || 1); const hero = process.argv[7] ? `&hero=${process.argv[7]}` : '';
  fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`); await p.evaluate(() => localStorage.clear());
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?auto=3&speed=${speed}&god=${god}&runs=${runs}${hero}`);
  await p.waitForFunction(() => window.BM && BM.ready, null, { timeout: 120000 });
  const t0 = Date.now(); let last = ''; let lastChange = Date.now(); const shots = new Set(); let finished = 0;
  while (Date.now() - t0 < maxMin * 60000) {
    const s = await p.evaluate(() => {
      const g = BM.game, w = g.world, h = w && w.hero, r = g.run; const n = r && r.at && r.map ? r.map.nodes.find((x) => x.id === r.at) : null;
      return { state: g.state, screen: g.screenName || undefined, level: g.levelId, beat: g.tutorial ? g.tutorial.beat : undefined, act: r ? r.act : undefined, node: n ? n.kind + ':' + (n.area || n.id) : undefined,
        boss: g.bossState, encs: (g.encs || []).map((e) => e.state[0]).join(''), hp: h ? Math.round(h.hp) : 0, foes: w ? w.foes().length : 0, embers: r ? r.embers : undefined, boons: r ? r.boons.length : undefined,
        runsDone: g.autoRunsDone | 0, summary: g.lastSummary ? { outcome: g.lastSummary.outcome, act: g.lastSummary.act, depth: g.lastSummary.depth, areas: g.lastSummary.areas, shards: g.lastSummary.shards } : undefined, fps: Math.round(BM.fps || 0) };
    });
    const key = `${s.state} ${s.screen} ${s.level} ${s.beat} ${s.node} ${s.boss} ${s.encs} ${s.runsDone}`;
    if (key !== last) { const { summary, ...rest } = s; console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(rest)); last = key; lastChange = Date.now(); }
    const tag = (s.screen ? 'screen-' + s.screen : s.level + '-' + (s.state === 'bossIntro' ? 'boss' : (s.beat || s.state))) + (s.act ? '-a' + s.act : '');
    if (!shots.has(tag) && ['play', 'bossIntro', 'haven', 'screen', 'title'].includes(s.state)) { shots.add(tag); await p.screenshot({ path: `${out}/${tag}.png` }); }
    if (s.runsDone > finished) { finished = s.runsDone; console.log('RUN FINISHED', JSON.stringify(s.summary)); }
    if (finished >= runs && s.state === 'title') { console.log('ALL RUNS FINISHED (' + finished + ')'); break; }
    if (Date.now() - lastChange > 6 * 60000) { console.log('NO PROGRESS for 6 minutes at', JSON.stringify(s)); await p.screenshot({ path: `${out}/stuck.png` }); break; }
    await p.waitForTimeout(2000);
  }
  console.log('errors:', errs.length ? [...new Set(errs.map((e) => e.split('\n')[0]))].slice(0, 10) : 'none');
  await b.close();
  process.exit(finished >= runs ? 0 : 1);
})();
