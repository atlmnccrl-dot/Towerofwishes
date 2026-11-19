// BLACKLINE — loop, screens and flow (title → campaign → briefing → battle → debrief),
// input (touch, mouse, keyboard) and camera direction.
(function () {
  const BL = window.BL;
  const { R, clamp } = BL;
  const RD = BL.render;
  const C = BL.campaign;
  const CINE = BL.cinema;

  let store = null;
  try { store = window.localStorage; } catch (e) { store = null; }

  const G = {
    mode: 'title', phase: 'play', S: null, acc: 0, paused: false, help: false,
    selected: new Set(), cmdMode: 'move', deploying: null, deployMsg: '', deployMsgT: 0,
    following: false, box: null, difficulty: 'veteran', frameDt: 0, director: { t: 0, x: 2400, z: 1 },
    lastTap: { t: 0, id: 0 },
    mission: null, ms: null, progress: C.loadProgress(store), campSel: 0,
    timeScale: 1, timeTarget: 1, camMode: 'tactical', camIdle: 0,
    hints: [], hint: null, hintGap: 0, fresh: [], stars: 0, debriefT: 0,
    flareT: 8, lastPunch: -99, punchT: 0,
  };
  window.__BL_GAME = G; // for the headless checks

  // ---------------------------------------------------------------- screens

  function newAttract() {
    G.S = BL.createBattle({ seed: 1 + Math.floor(Math.random() * 1e6), ai: [true, true] });
    // fast-forward so the menu opens on a fight already under way
    for (let i = 0; i < 30 * 95; i++) BL.step(G.S, BL.DT);
    G.S.events.length = 0;
    BL.world.setup(G.S.field);
    BL.world.setWeather({ rain: 1.1, wind: 0.4, bolts: [5, 12] });
    BL.fx.reset();
    G.mission = null; G.ms = null;
    R.cam.x = R.cam.tx = 2400; R.cam.z = R.cam.tz = 1; R.cam.follow = null; R.cam.yOff = 0;
  }

  function battleZoom() {
    return clamp(R.H / 330, 1.1, 2.0);
  }

  function startMission(M) {
    const seed = 1 + Math.floor(Math.random() * 1e6);
    G.S = BL.createBattle(C.battleOptions(M, G.progress, seed, G.difficulty));
    G.ms = C.setupBattle(G.S, M);
    G.S.events.length = 0;
    G.mission = M;
    G.mode = 'battle';
    G.phase = 'intro';
    G.paused = false; G.help = false;
    G.selected.clear(); G.deploying = null; G.cmdMode = 'move'; G.following = false;
    G.timeScale = G.timeTarget = 1; G.punchT = 0; G.flareT = 10;
    G.fresh = (M.intro || []).slice();
    G.hints = M.hints ? C.HINTS[M.hints].map((h) => Object.assign({ fin: false }, h)) : [];
    G.hint = null; G.hintGap = 2;
    R.cam.follow = null; R.cam.yOff = 0;
    BL.world.setup(G.S.field);
    BL.world.setWeather(M.weather);
    BL.fx.reset();
    CINE.start(CINE.intro(M, G.S), beginPlay);
  }

  function beginPlay() {
    const S = G.S;
    S.calm = false;
    G.phase = 'play';
    const fx = CINE.frontX(S);
    R.cam.tx = fx - 60; R.cam.tz = battleZoom(); R.cam.yOff = 0;
    // H-hour: flares go up over the ground ahead
    BL.fx.flare(fx + 180, BL.heightAt(S.field, fx + 180));
    setTimeout(() => G.S === S && BL.fx.flare(fx + 420, BL.heightAt(S.field, fx + 420)), 900);
    if (BL.audio) BL.audio.radio();
  }

  function startOutro() {
    const S = G.S, M = G.mission;
    const win = G.ms.result === 'win';
    G.phase = 'outro';
    G.timeTarget = 0.35;
    G.selected.clear(); G.deploying = null; G.paused = false;
    const o = M.objective;
    const sec = o.sector ? S.field.sectors.find((s) => s.id === o.sector) : null;
    let title;
    if (win) title = o.type === 'hold' ? 'THE LINE HOLDS' : o.type === 'capture' ? `SECTOR ${o.sector} SECURED` : 'THE EASTERN LINE BREAKS';
    else title = o.type === 'hold' ? `SECTOR ${o.sector} LOST` : o.type === 'break' ? 'OUR LINE BREAKS' : 'THE ATTACK FAILS';
    const x = sec ? sec.x : R.cam.x;
    CINE.outro(S, title, M.num ? `${M.num} — ${M.name}` : 'BLACK RAIN', x, win, toDebrief);
  }

  function toDebrief() {
    const S = G.S, M = G.mission;
    const win = S.winner === 0;
    G.phase = 'debrief';
    G.timeTarget = 1;
    G.debriefT = 0;
    if (M.num) {
      G.stars = C.stars(S, M, win);
      G.fresh = C.record(G.progress, M, G.stars);
      C.saveProgress(store, G.progress);
    } else { G.stars = 0; G.fresh = []; }
  }

  function toTitle() {
    G.mode = 'title';
    G.selected.clear();
    G.deploying = null;
    CINE.CI.active = false; CINE.CI.barsTarget = 0;
    newAttract();
  }

  function toCampaign() {
    if (G.mode === 'battle') toTitle();
    G.mode = 'campaign';
    let open = 0;
    C.MISSIONS.forEach((M, i) => { if (C.missionOpen(G.progress, i)) open = i; });
    // land on the first open mission without stars, else the last open one
    const next = C.MISSIONS.findIndex((M, i) => C.missionOpen(G.progress, i) && !(G.progress.stars[M.id] > 0));
    G.campSel = next >= 0 ? next : open;
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

    G.timeScale += (G.timeTarget - G.timeScale) * Math.min(1, dt * 6);
    const battle = G.mode === 'battle';
    const running = !battle || (G.phase !== 'debrief' && !G.paused && !G.help);
    if (running && !portrait) {
      G.acc += dt * G.timeScale;
      let n = 0;
      while (G.acc >= BL.DT && n < 4) {
        BL.step(S, BL.DT);
        if (battle && G.phase === 'play') C.tick(S, G.mission, G.ms, BL.DT);
        G.acc -= BL.DT; n++;
      }
      if (n === 4) G.acc = 0;
    }
    if (battle && G.phase === 'play' && G.ms.result) startOutro();
    if (!battle) {
      direct(dt, false);
      if (S.over && S.t - S.endT > 6) newAttract();
    }
    if (battle && G.phase === 'play' && !G.paused) {
      runHints(dt);
      autoFlares(dt);
      if (G.camMode === 'action') { G.camIdle -= dt; if (G.camIdle <= 0) direct(dt, true); }
    }
    if (G.punchT > 0) { G.punchT -= dt; if (G.punchT <= 0) { G.timeTarget = 1; R.cam.tz /= 1.1; } }
    if (G.deployMsgT > 0) G.deployMsgT -= dt;
    for (const id of G.selected) if (!S.units.some((u) => u.id === id && u.alive)) G.selected.delete(id);
    if (G.following && !G.selected.size) { G.following = false; R.cam.follow = null; }

    keyPan(dt);
    CINE.update(dt, S);
    RD.updateCamera(S.field, dt);
    BL.world.tickWeather(dt);
    BL.fx.tickFlares(dt * G.timeScale, S.field);
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
    const battle = G.mode === 'battle';
    const viewTeam = battle && !CINE.CI.reveal ? 0 : -1;
    const fdt = dt * G.timeScale;
    BL.world.drawSky(ctx);
    BL.world.drawFar(ctx);
    BL.world.drawWires(ctx);
    BL.world.drawTerrain(ctx);
    BL.world.drawStructures(ctx, S);
    BL.fx.drawLight(ctx);
    const dep = battle && G.deploying && BL.UNITS[G.deploying] ? { points: BL.deployPoints(S, 0, G.deploying) } : null;
    BL.world.drawSectors(ctx, S, dep);
    BL.fx.emitters(S, fdt, viewTeam);
    BL.units.drawAll(ctx, S, { viewTeam, selected: G.selected });
    BL.fx.consume(S, S.field, battle && G.phase === 'play' ? 0 : -1);
    BL.fx.draw(ctx, S, fdt, S.field);
    BL.fx.drawFlares(ctx);
    if (battle && G.phase === 'play') BL.units.drawSelection(ctx, S, G.selected);
    BL.world.drawRain(ctx, dt);
    RD.post(ctx);
    if (battle) {
      if (G.phase === 'play') BL.hud.drawBattle(ctx, G);
      else if (G.phase === 'debrief') BL.hud.drawDebrief(ctx, G);
      else BL.hud.regions.length = 0;
    } else if (G.mode === 'campaign') BL.hud.drawCampaign(ctx, G);
    else BL.hud.drawTitle(ctx, G);
    CINE.draw(ctx);
  }

  // The director: drifts to wherever the fight is. On the title it watches everything;
  // as the action camera it watches the fights our units are in.
  function direct(dt, ours) {
    const D = G.director;
    D.t -= dt;
    const S = G.S;
    if (D.t <= 0) {
      D.t = ours ? 5 + Math.random() * 3 : 6 + Math.random() * 5;
      let best = ours ? CINE.frontX(S) : 2400, bestN = -1;
      for (const u of S.units) {
        if (!u.alive || (ours && u.team !== 0)) continue;
        let n = ours && S.t - u.engagedT < 3 ? 3 : 0;
        for (const v of S.units) if (v.alive && v.team !== u.team && Math.abs(v.x - u.x) < 450 && (!ours || BL.visible(S, 0, v))) n++;
        if (n > bestN) { bestN = n; best = u.x; }
      }
      D.x = best + (ours ? 80 : (Math.random() - 0.5) * 200);
      const lim = RD.zoomLimits(S.field);
      D.z = ours ? battleZoom() * (0.75 + Math.random() * 0.5) : clamp(0.8 + Math.random() * 1.3, lim.min, 2.4) * clamp(R.W / 1100, 0.7, 1.3);
    }
    const k = ours ? 0.8 : 0.35;
    R.cam.tx += (D.x - R.cam.tx) * Math.min(1, dt * k);
    R.cam.tz += (D.z - R.cam.tz) * Math.min(1, dt * k * 0.7);
  }

  // Flares go up over fights now and then, lighting the ground.
  function autoFlares(dt) {
    G.flareT -= dt;
    if (G.flareT > 0) return;
    G.flareT = 16 + Math.random() * 12;
    const S = G.S;
    const busy = S.units.filter((u) => u.alive && u.team === 0 && S.t - u.engagedT < 2);
    if (!busy.length) { G.flareT = 6; return; }
    const u = busy[Math.floor(Math.random() * busy.length)];
    const x = u.x + 120 + Math.random() * 160;
    BL.fx.flare(x, BL.heightAt(S.field, x));
  }

  // A vehicle dies on screen: a moment of slow motion and a small push in.
  BL.fx.onBig = function () {
    if (G.mode !== 'battle' || G.phase !== 'play' || R.time - G.lastPunch < 9) return;
    G.lastPunch = R.time;
    G.timeTarget = 0.3;
    G.punchT = 0.9;
    R.cam.tz *= 1.1;
  };

  // ---------------------------------------------------------------- hints

  function runHints(dt) {
    if (!G.hints.length) return;
    const S = G.S;
    if (G.hint) {
      G.hint.shownT += dt;
      const c = { selected: G.selected, shownT: G.hint.shownT };
      if ((G.hint.shownT > 2.5 && G.hint.done(S, c)) || G.hint.shownT > 25) {
        G.hint.src.fin = true;
        G.hint = null;
        G.hintGap = 1.5;
      }
      return;
    }
    G.hintGap -= dt;
    if (G.hintGap > 0) return;
    for (const h of G.hints) {
      if (h.fin) continue;
      if (h.done(S, { selected: G.selected, shownT: 0 })) { h.fin = true; continue; }
      if (h.when(S, { selected: G.selected, shownT: 0 })) {
        G.hint = { text: h.text, target: h.target, when: h.when, done: h.done, shownT: 0, src: h };
        break;
      }
    }
  }

  // ---------------------------------------------------------------- picking

  function pickUnit(px, py, team) {
    const S = G.S;
    const z = R.cam.z;
    let best = null, bd = 1e9;
    for (const u of S.units) {
      if (!u.alive || (team != null && u.team !== team)) continue;
      if (u.team !== 0 && !BL.visible(S, 0, u)) continue;
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
  function whyText(why) { return why === 'rp' ? 'NOT ENOUGH RP' : why === 'cap' ? 'UNIT CAP REACHED' : why === 'locked' ? 'NOT AVAILABLE IN THIS MISSION' : 'NOT READY YET'; }

  // ---------------------------------------------------------------- taps

  function tap(px, py, button, shift) {
    if (BL.audio) BL.audio.start();
    if (CINE.CI.active) { CINE.skip(); return; }
    const r = BL.hud.hit(px, py);
    const S = G.S;
    if (G.mode === 'title') {
      if (!r) return;
      if (r.arg === 'campaign') toCampaign();
      else if (r.arg === 'skirmish') startMission(C.SKIRMISH);
      else if (r.arg === 'difficulty') G.difficulty = G.difficulty === 'recruit' ? 'veteran' : 'recruit';
      else if (r.arg === 'sound') BL.audio.setEnabled(!BL.audio.enabled);
      return;
    }
    if (G.mode === 'campaign') {
      if (!r) return;
      if (r.id === 'mission') G.campSel = r.arg;
      else if (r.id === 'begin') startMission(C.MISSIONS[G.campSel]);
      else if (r.id === 'back') G.mode = 'title';
      if (BL.audio) BL.audio.click();
      return;
    }
    if (G.phase === 'debrief') {
      if (!r || r.id !== 'menu') return;
      const idx = C.MISSIONS.indexOf(G.mission);
      if (r.arg === 'next') startMission(C.MISSIONS[idx + 1]);
      else if (r.arg === 'restart') startMission(G.mission);
      else if (r.arg === 'campaign') toCampaign();
      else if (r.arg === 'quit') toTitle();
      return;
    }
    if (G.phase !== 'play') return;
    if (r) {
      switch (r.id) {
        case 'helpOff': G.help = false; return;
        case 'menu':
          if (r.arg === 'resume') G.paused = false;
          else if (r.arg === 'restart') startMission(G.mission);
          else if (r.arg === 'quit') { if (G.mission.num) toCampaign(); else toTitle(); }
          else if (r.arg === 'sound') BL.audio.setEnabled(!BL.audio.enabled);
          else if (r.arg === 'help') { G.paused = false; G.help = true; }
          return;
        case 'pause': G.paused = true; return;
        case 'sound': BL.audio.setEnabled(!BL.audio.enabled); return;
        case 'cam':
          G.camMode = G.camMode === 'action' ? 'tactical' : 'action';
          G.camIdle = 0; G.director.t = 0;
          BL.fx.note(G.camMode === 'action' ? 'ACTION CAMERA' : 'TACTICAL CAMERA', false);
          return;
        case 'minimap': minimapTo(px); return;
        case 'card': {
          if (G.deploying === r.arg) { G.deploying = null; return; }
          const why = BL.canAfford(S, 0, r.arg);
          if (why) { flash(whyText(why)); return; }
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
      if (!res.ok) { flash(res.reason === 'sight' ? 'YOU CANNOT SEE THERE' : whyText(res.reason)); return; }
      if (BL.audio) BL.audio.radio();
      if (res.unit && G.deploying !== 'insert') { G.selected.clear(); G.selected.add(res.unit.id); }
      if (!shift) G.deploying = null;
      return;
    }

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
    R.cam.tx = clamp((px - P) / mw, 0, 1) * G.S.field.W;
    manualCam();
  }

  function manualCam() {
    if (G.following) { G.following = false; R.cam.follow = null; }
    G.camIdle = 4; // the action camera waits while you look around
  }

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
  const canLook = () => G.mode === 'battle' && G.phase === 'play' && !G.help;

  function setupInput() {
    const cv = R.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (BL.audio) BL.audio.start();
      if (ptrs.size === 2 && canLook()) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.cam.tz, wx: RD.wx((a.x + b.x) / 2) };
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
        manualCam();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const now = performance.now();
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
        drag.moved = true;
        if (canLook() && !drag.mini && (drag.shift || now - drag.t0 > 380) && !G.paused) {
          drag.box = true;
          G.box = { x0: drag.x0, y0: drag.y0, x1: e.clientX, y1: e.clientY };
        }
      }
      if (drag.moved && canLook()) {
        if (drag.mini) minimapTo(e.clientX);
        else if (drag.box) { G.box.x1 = e.clientX; G.box.y1 = e.clientY; }
        else {
          R.cam.tx -= dx / R.cam.z;
          R.cam.x -= dx / R.cam.z;
          R.cam.yOff += dy / R.cam.z;
          const dtm = Math.max(1, now - drag.lastT) / 1000;
          drag.vx = -dx / R.cam.z / dtm;
          manualCam();
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
      else if (!drag.mini && canLook() && performance.now() - drag.lastT < 80) R.cam.vx = clamp(drag.vx, -3000, 3000) * 0.6;
      drag = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; G.box = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!canLook()) return;
      const lim = RD.zoomLimits(G.S.field);
      const wpt = RD.wx(e.clientX);
      const k = Math.exp(-e.deltaY * 0.0015);
      R.cam.tz = clamp(R.cam.tz * k, lim.min, lim.max);
      if (!G.following) R.cam.tx = wpt - (e.clientX - R.W / 2) / R.cam.tz;
      G.camIdle = 4;
    }, { passive: false });

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  }

  const keys = new Set();
  function onKey(e) {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (BL.audio) BL.audio.start();
    if (CINE.CI.active) { if (k === ' ' || k === 'enter' || k === 'escape') CINE.skip(); return; }
    if (G.mode === 'title') { if (k === 'enter' || k === ' ') toCampaign(); return; }
    if (G.mode === 'campaign') {
      if (k === 'arrowdown') G.campSel = Math.min(C.MISSIONS.length - 1, G.campSel + 1);
      if (k === 'arrowup') G.campSel = Math.max(0, G.campSel - 1);
      if ((k === 'enter' || k === ' ') && C.missionOpen(G.progress, G.campSel)) startMission(C.MISSIONS[G.campSel]);
      if (k === 'escape') G.mode = 'title';
      return;
    }
    if (G.phase !== 'play') return;
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
      else { const why = BL.canAfford(G.S, 0, type); if (why) flash(whyText(why)); else G.deploying = type; }
      return;
    }
    if (k === 'tab') { selectAll(); e.preventDefault(); return; }
    if (k === 'm') G.cmdMode = 'move';
    if (k === 'g') G.cmdMode = 'attack';
    if (k === 'h') issue('hold');
    if (k === 'r') issue('retreat');
    if (k === 'f') toggleFollow();
    if (k === 'c') { G.camMode = G.camMode === 'action' ? 'tactical' : 'action'; G.camIdle = 0; G.director.t = 0; }
    if (k === '=' || k === '+') R.cam.tz *= 1.25;
    if (k === '-' || k === '_') R.cam.tz /= 1.25;
  }

  function keyPan(dt) {
    if (!canLook()) return;
    const sp = 900 / R.cam.z * dt;
    if (keys.has('arrowleft') || keys.has('a')) { R.cam.tx -= sp; manualCam(); }
    if (keys.has('arrowright') || keys.has('d')) { R.cam.tx += sp; manualCam(); }
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
    G.api = { startMission, toTitle, toCampaign, tap, selectAll, issue, pickUnit, newAttract, beginPlay, store: () => store };
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  window.addEventListener('load', boot);
})();
