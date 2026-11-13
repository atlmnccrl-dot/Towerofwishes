// Pose sheet: freezes the hero (and a foe) in each clip at a few moments and saves zoomed crops.
// NODE_PATH=$(npm root -g) node bellmourn/test/poses.js <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-poses'; fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?level=gate&god=1&lamp=court`);
  await p.waitForFunction(() => window.BM && BM.ready && BM.game.state === 'play' && BM.frames > 5, null, { timeout: 120000 });
  await p.evaluate(() => { const g = BM.game; g.debugZoom = 3; g.debugCamHold = true; g.world.paused = true; const h = g.world.hero; h.x = -2; h.z = 3; h.face = 0.8; g.card = null; g.ui.toast = () => {}; g.hints.forEach((x) => (x.shown = true)); });
  const clips = [['idle', [0.3]], ['run', [0.1, 0.25]], ['slash1', [0.06, 0.12, 0.2]], ['slash2', [0.08, 0.14]], ['slash3', [0.14, 0.2, 0.3]], ['charge', [0.4]], ['heavy', [0.12, 0.2]], ['thrust', [0.12]], ['dash', [0.1]], ['parry', [0.15]], ['hurt', [0.1]], ['heal', [0.5]], ['finisher', [0.3, 0.6]], ['die', [0.7]]];
  for (const [anim, times] of clips) for (const t of times) {
    await p.evaluate(([a, t]) => { const h = BM.game.world.hero; h.anim = a; h.animT = t; h.charge = 0.85; const v = BM.game.view.map.get(h.id); if (v) { v.anim = a; v.blend = 1; v.from = null; } BM.game.camFocus.set(h.x, 0.9, h.z); }, [anim, t]);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${out}/${anim}-${t}.png`, clip: { x: 220, y: 90, width: 200, height: 180 } });
  }
  // a foe
  await p.evaluate(() => { const w = BM.game.world; const f = w.spawnFoe('hushed', 0, 3, { rise: false }); f.face = -2.4; BM.foe = f; const h = w.hero; h.anim = 'idle'; h.x = -4; });
  for (const [anim, times] of [['idle', [0.2]], ['fslash', [0.4, 0.66]], ['stagger', [0.3]], ['rise', [0.5]], ['die', [0.8]]]) for (const t of times) {
    await p.evaluate(([a, t]) => { const f = BM.foe; f.anim = a; f.animT = t; f.atk = { windup: 0.5, active: 0.62, dur: 1.05 }; const v = BM.game.view.map.get(f.id); if (v) { v.anim = a; v.blend = 1; v.from = null; } BM.game.camFocus.set(f.x, 0.9, f.z); }, [anim, t]);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${out}/foe-${anim}-${t}.png`, clip: { x: 220, y: 90, width: 200, height: 180 } });
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
