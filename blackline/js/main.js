// BLACKLINE — loop, screens, input (touch, mouse, keyboard), camera direction.
(function () {
  const BL = window.BL;
  const { R, clamp } = BL;
  const RD = BL.render;

  const G = {
    mode: 'title', S: null, acc: 0, paused: false, help: false,
    selected: new Set(), cmdMode: 'move', deploying: null, deployMsg: '', deployMsgT: 0,
    following: false, box: null, difficulty: 'veteran', frameDt: 0, director: { t: 0, x: 2400, z: 1 },
    lastTap: { t: 0, id: 0 },
  };
  window.__BL_GAME = G; // for the headless checks

  // ---------------------------------------------------------------- screens

  function newAttract() {
    G.S = BL.createBattle({ seed: 1 + Math.floor(Math.random() * 1e6), ai: [true, true] });
    // fast-forward so the menu opens on a fight already under way
    for (let i = 0; i < 30 * 95; i++) BL.step(G.S, BL.DT);
    G.S.events.length = 0;
    BL.world.setup(G.S.field);
    BL.fx.reset();
    R.cam.x = R.cam.tx = 2400; R.cam.z = R.cam.tz = 1; R.cam.follow = null;
  }

  function startBattle() {
    const seed = 1 + Math.floor(Math.random() * 1e6);
    G.S = BL.createBattle({ seed, ai: [false, true], difficulty: G.difficulty });
    // each side opens with one rifle squad already in the field (free)
    for (const team of [0, 1]) {
      const r = BL.deploy(G.S, team, 'rifle', G.S.field.bases[team]);
      G.S.teams[team].rp += BL.UNITS.rifle.cost;
      G.S.teams[team].stats.spent -= BL.UNITS.rifle.cost;
      G.S.teams[team].cds.rifle = 0;
      if (team === 0 && r.ok) BL.order(G.S, [r.unit.id], 'hold', r.unit.x + 60);
    }
    G.S.events.length = 0;
    BL.world.setup(G.S.field);
    BL.fx.reset();
    G.mode = 'battle';
    G.paused = false;
    G.help = true;
    G.selected.clear();
    G.deploying = null;
    G.cmdMode = 'move';
    G.following = false;
    R.cam.follow = null;
    const lim = RD.zoomLimits(G.S.field);
    R.cam.x = R.cam.tx = 520; R.cam.z = R.cam.tz = clamp(R.W / 900, lim.min, 1.6); R.cam.yOff = 0;
  }

  function toTitle() {
    G.mode = 'title';
    G.selected.clear();
    G.deploying = null;
    newAttract();
  }

  // ---------------------------------------------------------------- loop

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.frameDt = dt;
    R.time += dt;
    R.boil = Math.floor(R.time * 7) % 3;
    const S = G.S;
    const portrait = R.H > R.W && R.mobile;

    const running = G.mode === 'title' || (!G.paused && !G.help);
    if (running && !portrait) {
      G.acc += dt;
      let n = 0;
      while (G.acc >= BL.DT && n < 4) { BL.step(S, BL.DT); G.acc -= BL.DT; n++; }
      if (n === 4) G.acc = 0;
    }
    if (G.mode === 'title') {
      direct(dt);
      if (S.over && S.t - S.endT > 6) newAttract();
    }
    if (G.deployMsgT > 0) G.deployMsgT -= dt;
    // prune selection
    for (const id of G.selected) if (!S.units.some((u) => u.id === id && u.alive)) G.selected.delete(id);
    if (G.following && !G.selected.size) { G.following = false; R.cam.follow = null; }

    keyPan(dt);
    RD.updateCamera(S.field, dt);
    BL.world.tickWeather(dt);
    render(dt);
    if (BL.audio) {
      let rotor = 0;
      for (const u of S.units) if (u.kind === 'air' && u.alive) rotor = Math.max(rotor, nearCam(u.x));
      for (const t of S.transports) rotor = Math.max(rotor, nearCam(t.x));
      BL.audio.weather(BL.world.WX.wind, rotor);
    }
    requestAnimationFrame(frame);
  }

  function nearCam(x) {
    const d = Math.abs(x - R.cam.x) * R.cam.z / R.W;
    return clamp(1.2 - d * 1.4, 0, 1);
  }

  function render(dt) {
    const ctx = R.ctx;
    const S = G.S;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    if (R.H > R.W && R.mobile) { BL.hud.drawRotate(ctx); return; }
    const viewTeam = G.mode === 'battle' ? 0 : -1;
    BL.world.drawSky(ctx);
    BL.world.drawFar(ctx);
    BL.world.drawWires(ctx);
    BL.world.drawTerrain(ctx);
    BL.world.drawStructures(ctx, S);
    const dep = G.deploying && BL.UNITS[G.deploying] ? { points: BL.deployPoints(S, 0, G.deploying) } : null;
    BL.world.drawSectors(ctx, S, dep);
    BL.fx.emitters(S, dt, viewTeam);
    BL.units.drawAll(ctx, S, { viewTeam, selected: G.selected });
    BL.fx.consume(S, S.field, G.mode === 'battle' ? 0 : -1);
    BL.fx.draw(ctx, S, dt, S.field);
    if (G.mode === 'battle') BL.units.drawSelection(ctx, S, G.selected);
    BL.world.drawRain(ctx, dt);
    RD.post(ctx);
    if (G.mode === 'battle') BL.hud.drawBattle(ctx, G);
    else BL.hud.drawTitle(ctx, G);
  }

  // The title camera: drifts to wherever the fight is, at varying distances.
  function direct(dt) {
    const D = G.director;
    D.t -= dt;
    const S = G.S;
    if (D.t <= 0) {
      D.t = 6 + Math.random() * 5;
      // find the busiest place: units of both sides close together
      let best = 2400, bestN = -1;
      for (const u of S.units) {
        if (!u.alive) continue;
        let n = 0;
        for (const v of S.units) if (v.alive && v.team !== u.team && Math.abs(v.x - u.x) < 450) n++;
        if (n > bestN) { bestN = n; best = u.x; }
      }
      D.x = best + (Math.random() - 0.5) * 200;
      const lim = RD.zoomLimits(S.field);
      D.z = clamp(0.8 + Math.random() * 1.3, lim.min, 2.4) * clamp(R.W / 1100, 0.7, 1.3);
    }
    R.cam.tx += (D.x - R.cam.tx) * Math.min(1, dt * 0.35);
    R.cam.tz += (D.z - R.cam.tz) * Math.min(1, dt * 0.25);
  }

  // ---------------------------------------------------------------- picking

  function pickUnit(px, py, team) {
    const S = G.S;
    const z = R.cam.z;
    let best = null, bd = 1e9;
    for (const u of S.units) {
      if (!u.alive || (team != null && u.team !== team)) continue;
      if (u.team !== 0 && !BL.visible(S, 0, u)) continue;
      // overview markers
      if (z < 0.9) {
        const ly = u.kind === 'air' ? u.members[0].y : BL.heightAt(S.field, u.x) + 26;
        const d = Math.hypot(RD.sx(u.x) - px, RD.sy(ly) - (u.kind === 'air' ? 0 : 6) - py);
        if (d < 16 && d < bd) { bd = d; best = u; }
      }
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const h = u.kind === 'inf' ? 9 : u.kind === 'air' ? 0 : u.def.hgt;
        const cy = u.kind === 'air' ? m.y : m.y + h / 2;
        const rx = u.kind === 'inf' ? Math.max(14, 6 * z) : Math.max(16, u.def.len * 0.55 * z);
        const ry = u.kind === 'inf' ? Math.max(16, 8 * z) : Math.max(16, (u.kind === 'air' ? 14 : h * 0.7) * z);
        const dx = (RD.sx(m.x) - px) / rx, dy = (RD.sy(cy) - py) / ry;
        const d = dx * dx + dy * dy;
        if (d < 1 && d < bd) { bd = d; best = u; }
      }
    }
    return best;
  }

  function selectAll() {
    G.selected.clear();
    for (const u of G.S.units) if (u.alive && u.team === 0 && !u.members.some((m) => m.rappel)) G.selected.add(u.id);
  }

  function issue(type, x, targetId) {
    const ids = [...G.selected];
    if (!ids.length) return;
    BL.order(G.S, ids, type, x, targetId);
    if (BL.audio) BL.audio.click();
  }

  function flash(msg) { G.deployMsg = msg; G.deployMsgT = 2.2; }

  // ---------------------------------------------------------------- taps

  function tap(px, py, button, shift) {
    if (BL.audio) BL.audio.start();
    const r = BL.hud.hit(px, py);
    const S = G.S;
    if (G.mode === 'title') {
      if (!r) return;
      if (r.arg === 'skirmish') startBattle();
      else if (r.arg === 'difficulty') G.difficulty = G.difficulty === 'recruit' ? 'veteran' : 'recruit';
      else if (r.arg === 'sound') BL.audio.setEnabled(!BL.audio.enabled);
      return;
    }
    if (r) {
      switch (r.id) {
        case 'helpOff': G.help = false; return;
        case 'menu':
          if (r.arg === 'resume') G.paused = false;
          else if (r.arg === 'restart') startBattle();
          else if (r.arg === 'quit') toTitle();
          else if (r.arg === 'sound') BL.audio.setEnabled(!BL.audio.enabled);
          else if (r.arg === 'help') { G.paused = false; G.help = true; }
          return;
        case 'pause': G.paused = true; return;
        case 'sound': BL.audio.setEnabled(!BL.audio.enabled); return;
        case 'minimap': minimapTo(px); return;
        case 'card': {
          if (G.deploying === r.arg) { G.deploying = null; return; }
          const why = BL.canAfford(S, 0, r.arg);
          if (why) { flash(why === 'rp' ? 'NOT ENOUGH RP' : why === 'cap' ? 'UNIT CAP REACHED' : 'NOT READY YET'); return; }
          G.deploying = r.arg;
          if (BL.audio) BL.audio.click();
          return;
        }
        case 'cmd':
          if (r.arg === 'all') { selectAll(); return; }
          if (r.arg === 'follow') { toggleFollow(); return; }
          if (r.arg === 'move' || r.arg === 'attack') { G.cmdMode = r.arg; return; }
          if (r.arg === 'hold') { issue('hold'); return; }
          if (r.arg === 'retreat') { issue('retreat'); return; }
          return;
      }
      return;
    }
    if (G.paused || S.over || G.help) return;
    const wxp = RD.wx(px);

    if (G.deploying) {
      const res = BL.deploy(S, 0, G.deploying, wxp);
      if (!res.ok) { flash(res.reason === 'sight' ? 'YOU CANNOT SEE THERE' : res.reason === 'rp' ? 'NOT ENOUGH RP' : 'CANNOT DEPLOY'); return; }
      if (BL.audio) BL.audio.radio();
      if (res.unit && G.deploying !== 'insert') { G.selected.clear(); G.selected.add(res.unit.id); }
      if (!shift) G.deploying = null;
      return;
    }

    // right click: order without changing the selection
    if (button === 2) { orderAt(px, py, wxp); return; }

    const own = pickUnit(px, py, 0);
    if (own) {
      const now = performance.now();
      if (G.lastTap.id === own.id && now - G.lastTap.t < 320) { G.selected.clear(); G.selected.add(own.id); toggleFollow(true); }
      G.lastTap = { t: now, id: own.id };
      if (shift) { if (G.selected.has(own.id)) G.selected.delete(own.id); else G.selected.add(own.id); }
      else if (G.selected.size === 1 && G.selected.has(own.id)) G.selected.clear();
      else { G.selected.clear(); G.selected.add(own.id); }
      if (BL.audio) BL.audio.click();
      return;
    }
    if (G.selected.size) orderAt(px, py, wxp);
  }

  function orderAt(px, py, wxp) {
    if (!G.selected.size) return;
    const foe = pickUnit(px, py, 1);
    if (foe) { issue('attack', foe.x, foe.id); return; }
    issue(G.cmdMode === 'attack' ? 'attack' : 'move', wxp);
  }

  function toggleFollow(force) {
    if (G.following && !force) { G.following = false; R.cam.follow = null; return; }
    const ids = [...G.selected];
    if (!ids.length) return;
    G.following = true;
    R.cam.follow = () => {
      const us = G.S.units.filter((u) => ids.includes(u.id) && u.alive);
      if (!us.length) return null;
      return us.reduce((s, u) => s + u.x, 0) / us.length;
    };
  }

  function minimapTo(px) {
    const P = R.mobile && R.W > 700 ? 34 : 14;
    const mw = R.W - P * 2 - 70;
    const x = clamp((px - P) / mw, 0, 1) * G.S.field.W;
    R.cam.tx = x;
    stopFollow();
  }

  function stopFollow() { if (G.following) { G.following = false; R.cam.follow = null; } }

  function boxSelect(b) {
    const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
    G.selected.clear();
    for (const u of G.S.units) {
      if (!u.alive || u.team !== 0) continue;
      const inside = u.members.some((m) => {
        if (!m.alive || m.rappel) return false;
        const px = RD.sx(m.x), py = RD.sy(u.kind === 'air' ? m.y : m.y + 4);
        return px >= x0 && px <= x1 && py >= y0 && py <= y1;
      });
      if (inside) G.selected.add(u.id);
    }
  }

  // ---------------------------------------------------------------- pointer input

  const ptrs = new Map();
  let pinch = null;
  let drag = null;

  function setupInput() {
    const cv = R.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (BL.audio) BL.audio.start();
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.cam.tz, mx: (a.x + b.x) / 2, wx: RD.wx((a.x + b.x) / 2) };
        drag = null;
        G.box = null;
        return;
      }
      const onMini = BL.hud.hit(e.clientX, e.clientY);
      drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, button: e.button, shift: e.shiftKey, mini: onMini && onMini.id === 'minimap', vx: 0, lastT: performance.now(), box: false };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const lim = RD.zoomLimits(G.S.field);
        R.cam.tz = clamp(pinch.z * d / Math.max(10, pinch.d), lim.min, lim.max);
        const mx = (a.x + b.x) / 2;
        R.cam.tx = pinch.wx - (mx - R.W / 2) / R.cam.tz;
        R.cam.x = R.cam.tx;
        stopFollow();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const now = performance.now();
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
        drag.moved = true;
        // a long press (or shift-drag) before moving starts a selection box
        if (G.mode === 'battle' && !drag.mini && (drag.shift || now - drag.t0 > 380) && !G.paused && !G.help) {
          drag.box = true;
          G.box = { x0: drag.x0, y0: drag.y0, x1: e.clientX, y1: e.clientY };
        }
      }
      if (drag.moved) {
        if (drag.mini) minimapTo(e.clientX);
        else if (drag.box) { G.box.x1 = e.clientX; G.box.y1 = e.clientY; }
        else if (G.mode === 'battle' && !G.help) {
          R.cam.tx -= dx / R.cam.z;
          R.cam.x -= dx / R.cam.z;
          R.cam.yOff += dy / R.cam.z;
          const dtm = Math.max(1, now - drag.lastT) / 1000;
          drag.vx = -dx / R.cam.z / dtm;
          stopFollow();
        }
      }
      drag.x = e.clientX; drag.y = e.clientY; drag.lastT = now;
    });
    const up = (e) => {
      ptrs.delete(e.pointerId);
      if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
      if (!drag) return;
      if (!drag.moved) tap(e.clientX, e.clientY, drag.button, drag.shift);
      else if (drag.box) { boxSelect(G.box); G.box = null; }
      else if (!drag.mini && performance.now() - drag.lastT < 80) R.cam.vx = clamp(drag.vx, -3000, 3000) * 0.6;
      drag = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; G.box = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (G.mode !== 'battle') return;
      const lim = RD.zoomLimits(G.S.field);
      const wpt = RD.wx(e.clientX);
      const k = Math.exp(-e.deltaY * 0.0015);
      R.cam.tz = clamp(R.cam.tz * k, lim.min, lim.max);
      if (!G.following) R.cam.tx = wpt - (e.clientX - R.W / 2) / R.cam.tz;
    }, { passive: false });

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  }

  const keys = new Set();
  function onKey(e) {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (BL.audio) BL.audio.start();
    if (G.mode !== 'battle') { if (k === 'enter' || k === ' ') startBattle(); return; }
    if (G.help) { G.help = false; return; }
    if (k === ' ' || k === 'p') { G.paused = !G.paused; e.preventDefault(); return; }
    if (k === 'escape') {
      if (G.deploying) G.deploying = null;
      else if (G.selected.size) G.selected.clear();
      else G.paused = !G.paused;
      return;
    }
    if (G.paused || G.S.over) return;
    const n = parseInt(k, 10);
    if (n >= 1 && n <= BL.DEPLOY_ORDER.length) {
      const type = BL.DEPLOY_ORDER[n - 1];
      if (G.deploying === type) G.deploying = null;
      else { const why = BL.canAfford(G.S, 0, type); if (why) flash(why === 'rp' ? 'NOT ENOUGH RP' : why === 'cap' ? 'UNIT CAP REACHED' : 'NOT READY YET'); else G.deploying = type; }
      return;
    }
    if (k === 'tab') { selectAll(); e.preventDefault(); return; }
    if (k === 'm') G.cmdMode = 'move';
    if (k === 'g') G.cmdMode = 'attack';
    if (k === 'h') issue('hold');
    if (k === 'r') issue('retreat');
    if (k === 'f') toggleFollow();
    if (k === '=' || k === '+') R.cam.tz *= 1.25;
    if (k === '-' || k === '_') R.cam.tz /= 1.25;
  }

  function keyPan(dt) {
    if (G.mode !== 'battle') return;
    const sp = 900 / R.cam.z * dt;
    if (keys.has('arrowleft') || keys.has('a')) { R.cam.tx -= sp; stopFollow(); }
    if (keys.has('arrowright') || keys.has('d')) { R.cam.tx += sp; stopFollow(); }
    if (keys.has('arrowup') || keys.has('w')) R.cam.yOff += sp * 0.6;
    if (keys.has('arrowdown') || keys.has('s')) R.cam.yOff -= sp * 0.6;
    if (keys.has('q')) R.cam.tz /= 1 + dt * 1.5;
    if (keys.has('e')) R.cam.tz *= 1 + dt * 1.5;
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    RD.init(document.getElementById('game'));
    BL.world.WX.onThunder = (d) => BL.audio && BL.audio.thunder(d);
    setupInput();
    newAttract();
    // test hooks
    G.api = { startBattle, toTitle, tap, selectAll, issue, pickUnit, newAttract };
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  window.addEventListener('load', boot);
})();
