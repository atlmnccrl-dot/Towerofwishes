// Plays the whole game in the browser on autoplay: title -> four districts -> ending. Logs progress,
// screenshots each district start and boss, fails on console errors or no progress.
// NODE_PATH=$(npm root -g) node bellmourn/test/autoplay-browser.js <outdir> [maxMinutes=40] [speed=3] [god=0] [startLevel]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-auto'; const maxMin = +(process.argv[3] || 40); const speed = process.argv[4] || 3; const god = process.argv[5] || '0'; const from = process.argv[6] ? `&level=${process.argv[6]}` : '';
  fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html`); await p.evaluate(() => localStorage.clear());
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?auto=3&speed=${speed}&god=${god}${from}`);
  await p.waitForFunction(() => window.BM && BM.ready, null, { timeout: 120000 });
  const t0 = Date.now(); let last = ''; let lastChange = Date.now(); const shots = new Set();
  while (Date.now() - t0 < maxMin * 60000) {
    const s = await p.evaluate(() => { const g = BM.game, w = g.world, h = w && w.hero; return { state: g.state, level: g.levelId, boss: g.bossState, encs: (g.encs || []).map((e) => e.state[0]).join(''), x: h ? +h.x.toFixed(1) : 0, z: h ? +h.z.toFixed(1) : 0, hp: h ? Math.round(h.hp) : 0, foes: w ? w.foes().length : 0, deaths: g.save.deaths, embers: g.save.embers, done: g.save.done, fps: Math.round(BM.fps || 0) }; });
    const key = `${s.state} ${s.level} ${s.boss} ${s.encs} ${s.deaths}`;
    if (key !== last) { console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(s)); last = key; lastChange = Date.now(); }
    const tag = s.level + '-' + (s.state === 'bossIntro' ? 'boss' : s.state);
    if (!shots.has(tag) && ['play', 'bossIntro', 'ending'].includes(s.state)) { shots.add(tag); await p.screenshot({ path: `${out}/${tag}.png` }); }
    if (s.done && s.state === 'title') { console.log('COMPLETED the game'); break; }
    if (Date.now() - lastChange > 6 * 60000) { console.log('NO PROGRESS for 6 minutes at', JSON.stringify(s)); await p.screenshot({ path: `${out}/stuck.png` }); break; }
    await p.waitForTimeout(3000);
  }
  console.log('errors:', errs.length ? [...new Set(errs.map((e) => e.split('\n')[0]))].slice(0, 10) : 'none');
  await b.close();
})();
