// The tonic, seen in the game: starts a district as a warden, halves the HP, drinks a tonic (the R key) and
// screenshots the effect at a few exact moments (the game is stepped by hand). If game.js does not yet
// answer 'drink'/'heal' with fx.tonicStart / view.healGlow / fx.tonicBurst / ui.healGain / ui.floatText,
// the script does it the way the shared contract says. Ends with a leak check: every effect cleaned up.
// NODE_PATH=$(npm root -g) node bellmourn/test/tonic.js <outdir> [hero]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/bm-tonic'; fs.mkdirSync(out, { recursive: true }); const port = process.env.PORT || 8790;
  const hero = process.argv[3] || 'warden';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?level=gate&lamp=court&hero=${hero}&god=1`);
  await p.waitForFunction(() => window.BM && BM.ready && BM.game.state === 'play' && BM.frames > 5, null, { timeout: 120000 });
  const info = await p.evaluate(() => {
    const g = BM.game; window._upd = g.update.bind(g); g.update = () => {}; // freeze: the script steps the game itself
    g.card = null; g.ui.toast = () => {}; (g.hints || []).forEach((x) => (x.shown = true));
    if (g.debug) g.debug.god = false; // god mode refills the HP every frame
    for (const f of g.world.ents) if (f.team === 'foe') { f.hp = 0; f.dead = true; f.hidden = true; }
    const h = g.world.hero; h.z -= 3.5; h.x += 0.5; // out in the open court, clear of the railings
    h.hp = Math.round(h.maxHp / 2); h.tonics = Math.max(1, h.tonics);
    const V = BM.r.camera.position.constructor; window._V = V;
    window._log = []; const fx = g.fx, view = g.view; let s = 0, bu = 0, gl = 0;
    const ts = fx.tonicStart.bind(fx), tb = fx.tonicBurst.bind(fx), hg = view.healGlow.bind(view);
    fx.tonicStart = (e) => { s++; return ts(e); }; fx.tonicBurst = (...a) => { bu++; return tb(...a); }; view.healGlow = (...a) => { gl++; return hg(...a); };
    const he = g.handleEvents.bind(g);
    g.handleEvents = (evs) => {
      const s0 = s, b0 = bu, g0 = gl; he(evs);
      for (const ev of evs) {
        if (ev.type === 'drink') { _log.push('drink' + (s > s0 ? ' (game wired)' : ' (script wired)')); if (s === s0) { fx.tonicStart(ev.e); g.sound.play('drink'); } if (gl === g0) view.healGlow(ev.e.id, 1.1); }
        if (ev.type === 'heal') {
          _log.push('heal +' + ev.amt + (bu > b0 ? ' (game wired)' : ' (script wired)'));
          if (bu === b0) { fx.tonicBurst(ev.e.x, ev.e.z, ev.amt); g.sound.play('heal'); if (g.ui.healGain) g.ui.healGain(ev.amt); const q = g.r.project(new V(ev.e.x, 2.1, ev.e.z)); if (g.ui.floatText) g.ui.floatText('+' + ev.amt, q.x, q.y, '#7dff9a'); }
        }
      }
    };
    return { hp: h.hp, max: h.maxHp, tonics: h.tonics, sceneSprites: g.r.scene.children.filter((c) => c.isSprite).length };
  });
  console.log('start', JSON.stringify(info));
  const step = (sec, dt = 1 / 30) => p.evaluate(([sec, dt]) => { for (let t = 0; t < sec - 1e-6; t += dt) _upd(dt); }, [sec, dt]);
  const shot = async (name) => {
    const box = await p.evaluate(() => { const g = BM.game, h = g.world.hero, r = g.r; const c = r.canvas.getBoundingClientRect(); const q = r.project(new _V(h.x, 1.0, h.z)); return { x: c.left + q.x * c.width / r.bw, y: c.top + q.y * c.height / r.bh, hp: h.hp, state: h.state, animT: +h.animT.toFixed(2) }; });
    await p.screenshot({ path: `${out}/${name}-full.png` });
    await p.screenshot({ path: `${out}/${name}.png`, clip: { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 120), width: 240, height: 200 } });
    console.log(name, JSON.stringify(box));
  };
  await step(0.5); await shot('0-before');
  await p.evaluate(() => BM.game.input.pressed.add('KeyR'));
  for (const [dt, name] of [[0.15, '1-reach'], [0.25, '2-lips'], [0.15, '3-healed'], [0.2, '4-after'], [0.35, '5-done']]) { await step(dt); await shot(name); }
  await step(2.5);
  const after = await p.evaluate(() => { const g = BM.game, fx = g.fx; return { rings: fx.tRings.length, glows: fx.tGlows.length, emitters: fx.tEm.length, motes: fx.mv.filter((v) => v.life > 0).length, viewGlows: g.view.glows.size, flask: !!(g.view.get(g.world.hero).flask && g.view.get(g.world.hero).flask.visible), tonicObjs: fx.group.children.filter((c) => c.isSprite || c.geometry === fx.ringGeo).length, sceneSprites: g.r.scene.children.filter((c) => c.isSprite).length, kinds: fx.group.children.map((c) => c.type).join(',') }; });
  console.log('after', JSON.stringify(after), '|', await p.evaluate(() => _log.join(' | ')));
  const clean = after.rings === 0 && after.glows === 0 && after.emitters === 0 && after.motes === 0 && after.viewGlows === 0 && after.tonicObjs === 0 && after.sceneSprites === info.sceneSprites && !after.flask;
  console.log(clean ? 'cleaned up' : 'LEAK: effects left behind');
  console.log('errors:', errs.length ? errs.slice(0, 8) : 'none'); await b.close();
  process.exit(clean && !errs.length ? 0 : 1);
})();
