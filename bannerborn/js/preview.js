// Bannerborn — the duel preview: a small window showing one hero alone against one enemy, in the real battle engine.
// They trade a few basic blows, the hero uses their signature, then their ultimate finishes it; then it starts again.
// Shown beside a summoning so a new hero is seen fighting before they are ever fielded. Silent (the summoning has its
// own sound), and nothing in it touches the save.
(function () {
  const BB = window.BB, hyp = Math.hypot;
  const P = BB.Preview = { on: false, B: null, hero: null, t: 0, phase: '', cv: null, cap: null, map: null, mapKey: '' };
  const PHASES = [['basic', 0], ['sig', 3.1], ['ult', 5.6]];

  async function fieldFor(S) { // a clear patch of the land the campaign is in, built once and kept
    const M = BB.drillStage ? BB.drillStage(S, null) : BB.MISSIONS[0], region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0];
    const key = region.id;
    if (P.map && P.mapKey === key && BB.landReady(region)) return P.map;
    await Promise.all([BB.loadLand(region), BB.loadChar('ghoul').catch(() => null)]);
    const m = BB.buildMap('camp', region.biome, 77, { night: false, floor: region.floor, skin: region.skin }), c = m.w / 2;
    m.props = m.props.filter((p) => hyp(p.x - c, p.y - c) > 4.2); m.anims = []; m.lights = [];
    for (const p of m.props) { const s = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = s.x; p.sy = s.y; }
    if (BB.rebuildGrid) BB.rebuildGrid(m);
    m.heroSpawn = { x: c - 1.25, y: c + 1.25 }; m.foeSpawns = [{ x: c + 1.25, y: c - 1.25 }];
    BB.renderGround(m);
    P.map = m; P.mapKey = key; return m;
  }
  function duel() { // a fresh hero and a fresh enemy on the same patch
    const m = P.map, h = P.hero, c = m.w / 2;
    const B = P.B = new BB.Battle({ map: m, mission: { id: 'preview', type: 'rout', waves: [['ghoul', 1]], level: Math.max(1, h.level || 1), layout: 'camp' },
      formation: [{ hero: h, row: 'front', slot: 0 }], heroes: [h], level: Math.max(1, h.level || 1), save: { settings: { auto: false, shake: false, numbers: false } }, seed: 11 + (P.loops || 0) });
    B.updateObjective = function () {}; // no waves, no victory: the script below runs the fight
    B.text = function () {}; B.banner = function () {}; // a silent picture: no words in the little window
    B.preview = true;
    const e = B.heroList[0]; e.energy = 0; e.sigCd = 99;
    const f = B.spawnFoe('ghoul', c + 1.3, c - 1.3); f.maxhp = f.hp = Math.max(60, e.atk * 9); f.atk *= 0.25; f.spawnT = 0.35;
    B.cam.x = c; B.cam.y = c; P.t = 0; P.phase = ''; P.foe = f; P.me = e; P.did = {}; P.deadT = 0;
  }
  P.start = async function (hero, cv, cap) {
    P.stop(); P.hero = hero; P.cv = cv; P.cap = cap; P.loops = 0; P.starting = hero;
    try { await fieldFor(BB.save); await BB.loadHeroes([hero]); } catch (e) { return; }
    if (P.starting !== hero) return; // another summoning began meanwhile
    duel(); P.on = true;
  };
  P.stop = function () { P.on = false; P.B = null; P.starting = null; if (P.cap) P.cap.textContent = ''; };
  function caption(k) {
    if (!P.cap || P.phase === k) return; P.phase = k;
    const C = BB.CALLINGS[P.hero.calling], I = BB.identityOf ? BB.identityOf(P.hero) : null;
    P.cap.innerHTML = k === 'basic' ? '<b>Basic attack</b>' : k === 'sig' ? '<b>Signature</b> ' + (I ? BB.SIGNATURES[I.sig].name : '') : '<b>Ultimate</b> ' + C.skill.name;
    P.cap.className = 'cap ' + k;
  }
  P.render = function (dt) {
    if (!P.on || !P.B || !P.cv) return;
    const B = P.B, e = P.me, f = P.foe, cv = P.cv;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (BB.lowFx ? 0.75 : 1), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    P.t += dt;
    // the script: basic blows, then the signature, then the ultimate; the enemy lasts exactly that long
    if (!f.dead) {
      e.hp = Math.max(e.hp, e.maxhp * 0.6);
      if (!P.did.ult) f.hp = Math.max(f.hp, f.maxhp * 0.18);
      if (P.t < PHASES[1][1]) { caption('basic'); e.sigCd = 99; e.energy = 0; }
      else if (!P.did.sig) { if (e.state !== 'attack' && e.state !== 'skill' && !(e.lock > 0)) { P.did.sig = true; caption('sig'); if (e.brain && B.runSig) { B.face(e, f.x, f.y); B.runSig(e, f, { kind: 'sig', sig: e.brain.sig, tgt: f }); } e.sigCd = 99; } }
      else if (P.t >= PHASES[2][1] && !P.did.ult) { if (e.state !== 'skill' && !(e.lock > 0.25)) { P.did.ult = true; P.ultT = P.t; caption('ult'); e.energy = 100; B.useSkill(e, true); } }
      else if (P.did.ult && P.t - P.ultT > 1.7) B.kill(f, e); // whatever the ultimate was, it ends here
      else { e.sigCd = 99; if (!P.did.ult) e.energy = 0; }
    } else { P.deadT += dt; if (P.deadT > 1.5) { P.loops++; duel(); return; } }
    BB.sfxMute = true;
    try { B.update(dt, null); } finally { BB.sfxMute = false; }
    if (B.ep) { B.ep.calls.length = 0; B.ep.cine = null; }
    // the camera sits between the two, close
    const mx = (e.x + (f.dead ? e.x : f.x)) / 2, my = (e.y + (f.dead ? e.y : f.y)) / 2;
    B.cam.x += (mx - B.cam.x) * Math.min(1, dt * 4); B.cam.y += (my - B.cam.y) * Math.min(1, dt * 4);
    B.cam.zoom = Math.max(1.1, Math.min(2.6, cv.clientHeight / 150)) * (B.zoomK || 1);
    const g = cv.getContext('2d');
    B.render(g, W, H, dpr);
  };
})();
