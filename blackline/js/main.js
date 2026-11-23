// BLACKLINE — loop, screens and flow (title → campaign → briefing → battle → debrief),
// input (touch, mouse, keyboard) and camera direction.
(function () {
  const BL = window.BL;
  const { R, clamp } = BL;
  const RD = BL.render;
  const C = BL.campaign;
  const CINE = BL.cinema;
  const GR = BL.ground;

  let store = null;
  try { store = window.localStorage; } catch (e) { store = null; }

  const G = {
    mode: 'title', phase: 'play', S: null, acc: 0, paused: false,
    selected: new Set(), cmdMode: 'move', deploying: null, deployOpen: false, flashMsg: '', flashT: 0,
    following: false, difficulty: 'veteran', frameDt: 0, director: { t: 0, x: 1800, y: 1000, z: 1 },
    lastTap: { t: 0, id: 0 }, rosterScroll: 0,
    mission: null, ms: null, progress: C.loadProgress(store), campSel: 0,
    timeScale: 1, timeTarget: 1, camMode: 'tactical', camIdle: 0,
    hints: [], hint: null, hintGap: 0, fresh: [], stars: 0, debriefT: 0,
    flareT: 8, lastPunch: -99, punchT: 0,
  };
  window.__BL_GAME = G;

  // ---------------------------------------------------------------- screens

  function newAttract() {
    G.S = BL.createBattle({ seed: 1 + Math.floor(Math.random() * 1e6), map: 'valley', ai: [true, true] });
    for (let i = 0; i < 30 * 95; i++) BL.step(G.S, BL.DT);
    G.S.events.length = 0;
    GR.build(G.S.field);
    GR.setWeather({ rain: 1.1, wind: 0.4, bolts: [5, 12] });
    BL.fx.reset();
    G.mission = null; G.ms = null;
    R.cam.x = R.cam.tx = 1800; R.cam.y = R.cam.ty = 1000; R.cam.z = R.cam.tz = 1; R.cam.follow = null;
  }

  const battleZoom = () => clamp(Math.min(R.H / 380, R.W / 760), 0.95, 1.8);

  function startMission(M) {
    const seed = 1 + Math.floor(Math.random() * 1e6);
    G.S = BL.createBattle(C.battleOptions(M, G.progress, seed, G.difficulty));
    G.ms = C.setupBattle(G.S, M);
    G.S.events.length = 0;
    G.mission = M; G.mode = 'battle'; G.phase = 'intro';
    G.paused = false; G.deployOpen = false; G.deploying = null;
    G.selected.clear(); G.cmdMode = 'move'; G.following = false; G.rosterScroll = 0;
    G.timeScale = G.timeTarget = 1; G.punchT = 0; G.flareT = 10;
    G.fresh = (M.intro || []).slice();
    G.hints = M.hints ? C.HINTS[M.hints].map((h) => Object.assign({ fin: false }, h)) : [];
    G.hint = null; G.hintGap = 2;
    R.cam.follow = null;
    GR.build(G.S.field);
    GR.setWeather(M.weather);
    BL.fx.reset();
    CINE.start(CINE.intro(M, G.S), beginPlay);
  }

  function beginPlay() {
    const S = G.S;
    S.calm = false;
    G.phase = 'play';
    const f = CINE.frontPos(S);
    // frame our units clear of the roster on the left
    R.cam.tz = battleZoom();
    R.cam.tx = f.x + 40 + clamp(R.W * 0.17, 142, 196) * 0.6 / R.cam.tz; R.cam.ty = f.y;
    BL.fx.flare(f.x + 220, f.y - 40);
    setTimeout(() => { if (G.S === S) BL.fx.flare(f.x + 420, f.y + 60); }, 900);
    if (BL.audio) BL.audio.radio();
  }

  function startOutro() {
    const S = G.S, M = G.mission;
    const win = G.ms.result === 'win';
    G.phase = 'outro'; G.timeTarget = 0.35;
    G.selected.clear(); G.deploying = null; G.deployOpen = false; G.paused = false;
    const o = M.objective;
    const sec = o.sector ? S.field.sectors.find((s) => s.id === o.sector) : null;
    const title = win
      ? (o.type === 'hold' ? 'THE LINE HOLDS' : o.type === 'capture' ? `SECTOR ${o.sector} SECURED` : 'THE EASTERN LINE BREAKS')
      : (o.type === 'hold' ? `SECTOR ${o.sector} LOST` : o.type === 'break' ? 'OUR LINE BREAKS' : 'THE ATTACK FAILS');
    CINE.outro(S, title, M.num ? `${M.num}  ${M.name}` : 'THE VALLEY', sec ? { x: sec.x, y: sec.y } : { x: R.cam.x, y: R.cam.y }, win, toDebrief);
  }

  function toDebrief() {
    const S = G.S, M = G.mission;
    G.phase = 'debrief'; G.timeTarget = 1; G.debriefT = 0;
    if (M.num) {
      G.stars = C.stars(S, M, S.winner === 0);
      G.fresh = C.record(G.progress, M, G.stars);
      C.saveProgress(store, G.progress);
    } else { G.stars = 0; G.fresh = []; }
  }

  function toTitle() {
    G.mode = 'title'; G.selected.clear(); G.deploying = null; G.deployOpen = false;
    CINE.CI.active = false; CINE.CI.barsTarget = 0;
    newAttract();
  }

  function toCampaign() {
    if (G.mode === 'battle') toTitle();
    G.mode = 'campaign';
    let open = 0;
    C.MISSIONS.forEach((M, i) => { if (C.missionOpen(G.progress, i)) open = i; });
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
    const running = !battle || (G.phase !== 'debrief' && !G.paused);
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
    if (!battle) { direct(dt, false); if (S.over && S.t - S.endT > 6) newAttract(); }
    if (battle && G.phase === 'play' && !G.paused) {
      runHints(dt);
      autoFlares(dt);
      if (G.camMode === 'action') { G.camIdle -= dt; if (G.camIdle <= 0) direct(dt, true); }
    }
    if (G.punchT > 0) { G.punchT -= dt; if (G.punchT <= 0) { G.timeTarget = 1; R.cam.tz /= 1.1; } }
    if (G.flashT > 0) G.flashT -= dt;
    for (const id of G.selected) if (!S.units.some((u) => u.id === id && u.alive)) G.selected.delete(id);
    if (G.following && !G.selected.size) { G.following = false; R.cam.follow = null; }
    keyPan(dt);
    CINE.update(dt, S);
    RD.updateCamera(S.field, dt);
    GR.tickWeather(dt);
    BL.fx.tickFlares(dt * G.timeScale);
    render(dt);
    if (BL.audio) {
      let rotor = 0;
      for (const u of S.units) if (u.kind === 'air' && u.alive) rotor = Math.max(rotor, nearCam(u));
      for (const t of S.transports) rotor = Math.max(rotor, nearCam(t));
      BL.audio.weather(GR.WX.wind, rotor);
    }
    requestAnimationFrame(frame);
  }

  function nearCam(p) {
    const d = Math.hypot((p.x - R.cam.x) * R.cam.z / R.W, (p.y - R.cam.y) * R.cam.z * RD.K / R.H);
    return clamp(1.2 - d * 1.4, 0, 1);
  }

  function render(dt) {
    const ctx = R.ctx, S = G.S;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    if (R.H > R.W && R.mobile) { BL.hud.drawRotate(ctx); return; }
    const battle = G.mode === 'battle';
    const viewTeam = battle && !CINE.CI.reveal ? 0 : -1;
    const fdt = dt * G.timeScale;
    GR.drawGround(ctx, S);
    BL.fx.drawLight(ctx);
    const dep = battle && G.deploying && BL.UNITS[G.deploying] ? { points: BL.deployPoints(S, 0, G.deploying) } : null;
    GR.drawSectors(ctx, S, dep);
    BL.fx.emitters(S, fdt, viewTeam);
    BL.units.drawAll(ctx, S, { viewTeam, selected: battle && G.phase === 'play' ? G.selected : null });
    GR.drawCanopy(ctx);
    BL.fx.consume(S, battle && G.phase === 'play' ? 0 : -1);
    BL.fx.draw(ctx, S, fdt);
    BL.fx.drawFlares(ctx);
    GR.drawSky(ctx, dt);
    GR.drawRain(ctx, dt);
    RD.post(ctx);
    if (battle) {
      if (G.phase === 'play') BL.hud.drawBattle(ctx, G);
      else if (G.phase === 'debrief') BL.hud.drawDebrief(ctx, G);
      else BL.hud.regions.length = 0;
    } else if (G.mode === 'campaign') BL.hud.drawCampaign(ctx, G);
    else BL.hud.drawTitle(ctx, G);
    CINE.draw(ctx);
  }

  // The director drifts to wherever the fight is: everything on the title, our fights in battle.
  function direct(dt, ours) {
    const D = G.director, S = G.S;
    D.t -= dt;
    if (D.t <= 0) {
      D.t = ours ? 5 + Math.random() * 3 : 6 + Math.random() * 5;
      let best = ours ? CINE.frontPos(S) : { x: 1800, y: 1000 }, bestN = -1;
      for (const u of S.units) {
        if (!u.alive || (ours && u.team !== 0)) continue;
        let n = ours && S.t - u.engagedT < 3 ? 3 : 0;
        for (const v of S.units) if (v.alive && v.team !== u.team && Math.hypot(v.x - u.x, v.y - u.y) < 450 && (!ours || BL.visible(S, 0, v))) n++;
        if (n > bestN) { bestN = n; best = u; }
      }
      D.x = best.x + (ours ? 60 : (Math.random() - 0.5) * 200); D.y = best.y + (Math.random() - 0.5) * 100;
      const lim = RD.zoomLimits(S.field);
      D.z = ours ? battleZoom() * (0.75 + Math.random() * 0.5) : clamp(0.7 + Math.random() * 1.1, lim.min, 2.2) * clamp(R.W / 1100, 0.7, 1.3);
    }
    const k = ours ? 0.8 : 0.35;
    R.cam.tx += (D.x - R.cam.tx) * Math.min(1, dt * k);
    R.cam.ty += (D.y - R.cam.ty) * Math.min(1, dt * k);
    R.cam.tz += (D.z - R.cam.tz) * Math.min(1, dt * k * 0.7);
  }

  function autoFlares(dt) {
    G.flareT -= dt;
    if (G.flareT > 0) return;
    G.flareT = 16 + Math.random() * 12;
    const S = G.S;
    const busy = S.units.filter((u) => u.alive && u.team === 0 && S.t - u.engagedT < 2);
    if (!busy.length) { G.flareT = 6; return; }
    const u = busy[Math.floor(Math.random() * busy.length)];
    const e = S.field.bases[1];
    const d = Math.hypot(e.x - u.x, e.y - u.y) || 1;
    BL.fx.flare(u.x + (e.x - u.x) / d * 160, u.y + (e.y - u.y) / d * 160 + (Math.random() - 0.5) * 80);
  }

  BL.fx.onBig = function () {
    if (G.mode !== 'battle' || G.phase !== 'play' || R.time - G.lastPunch < 9) return;
    G.lastPunch = R.time; G.timeTarget = 0.3; G.punchT = 0.9; R.cam.tz *= 1.1;
  };

  function runHints(dt) {
    if (!G.hints.length) return;
    const S = G.S;
    const c = (t) => ({ selected: G.selected, shownT: t, deployOpen: G.deployOpen });
    if (G.hint) {
      G.hint.shownT += dt;
      if ((G.hint.shownT > 2.5 && G.hint.src.done(S, c(G.hint.shownT))) || G.hint.shownT > 25) { G.hint.src.fin = true; G.hint = null; G.hintGap = 1.5; }
      return;
    }
    G.hintGap -= dt;
    if (G.hintGap > 0) return;
    for (const h of G.hints) {
      if (h.fin) continue;
      if (h.done(S, c(0))) { h.fin = true; continue; }
      if (h.when(S, c(0))) { G.hint = { text: h.text, target: h.target, shownT: 0, src: h }; break; }
    }
  }

  // ---------------------------------------------------------------- picking and orders

  function pickUnit(px, py, team) {
    const S = G.S, z = R.cam.z;
    let best = null, bd = 1e9;
    for (const u of S.units) {
      if (!u.alive || (team != null && u.team !== team)) continue;
      if (u.team !== 0 && !BL.visible(S, 0, u)) continue;
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const hz = u.kind === 'air' ? m.alt : m.z + (u.kind === 'inf' ? 7 : u.def.hgt * 0.6);
        const d = Math.hypot(RD.sx(m.x) - px, RD.sy(m.y, hz) - py);
        const r = u.kind === 'inf' ? Math.max(16, 9 * z) : Math.max(20, u.def.len * 0.5 * z);
        if (d < r && d < bd) { bd = d; best = u; }
      }
    }
    return best;
  }

  function issue(type, x, y, targetId) {
    const ids = [...G.selected];
    if (!ids.length) return;
    BL.order(G.S, ids, type, x, y, targetId);
    if (BL.audio) BL.audio.click();
  }

  function flash(msg) { G.flashMsg = msg; G.flashT = 2.2; }
  const whyText = (why) => (why === 'rp' ? 'NOT ENOUGH RP' : why === 'cap' ? 'UNIT CAP REACHED' : why === 'locked' ? 'NOT AVAILABLE IN THIS MISSION' : why === 'sight' ? 'YOU CANNOT SEE THERE' : why === 'ground' ? 'NO ROOM TO LAND THERE' : 'NOT READY YET');

  function focusUnit(u) { R.cam.tx = u.x; R.cam.ty = u.y; G.camIdle = 4; }

  function toggleFollow() {
    if (G.following) { G.following = false; R.cam.follow = null; return; }
    const ids = [...G.selected];
    if (!ids.length) return;
    G.following = true;
    R.cam.follow = () => {
      const us = G.S.units.filter((u) => ids.includes(u.id) && u.alive);
      if (!us.length) return null;
      return { x: us.reduce((s, u) => s + u.x, 0) / us.length, y: us.reduce((s, u) => s + u.y, 0) / us.length };
    };
  }

  function minimapTo(px, py) {
    const r = BL.hud.rects.minimap;
    if (!r) return;
    R.cam.tx = clamp((px - r.x) / r.w, 0, 1) * G.S.field.W;
    R.cam.ty = clamp((py - r.y) / r.h, 0, 1) * G.S.field.H;
    manualCam();
  }
  function manualCam() { if (G.following) { G.following = false; R.cam.follow = null; } G.camIdle = 4; }

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
      if (BL.audio) BL.audio.click();
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
      if (BL.audio && r.id !== 'minimap') BL.audio.click();
      switch (r.id) {
        case 'menu':
          if (r.arg === 'resume') G.paused = false;
          else if (r.arg === 'restart') startMission(G.mission);
          else if (r.arg === 'quit') { if (G.mission.num) toCampaign(); else toTitle(); }
          else if (r.arg === 'sound') BL.audio.setEnabled(!BL.audio.enabled);
          return;
        case 'pause': G.paused = true; return;
        case 'sound': BL.audio.setEnabled(!BL.audio.enabled); return;
        case 'cam':
          G.camMode = G.camMode === 'action' ? 'tactical' : 'action';
          G.camIdle = 0; G.director.t = 0;
          BL.fx.note(G.camMode === 'action' ? 'ACTION CAMERA' : 'TACTICAL CAMERA', false);
          return;
        case 'minimap': minimapTo(px, py); return;
        case 'all': {
          const units = S.units.filter((u) => u.alive && u.team === 0);
          const allOn = units.length && units.every((u) => G.selected.has(u.id));
          G.selected.clear();
          if (!allOn) for (const u of units) if (!u.members.some((m) => m.rappel)) G.selected.add(u.id);
          return;
        }
        case 'unit': {
          const u = S.units.find((k) => k.id === r.arg);
          if (!u) return;
          const now = performance.now();
          if (G.lastTap.id === u.id && now - G.lastTap.t < 330) { G.selected.clear(); G.selected.add(u.id); focusUnit(u); G.lastTap = { t: 0, id: 0 }; return; }
          G.lastTap = { t: now, id: u.id };
          if (shift) { if (G.selected.has(u.id)) G.selected.delete(u.id); else G.selected.add(u.id); }
          else if (G.selected.size === 1 && G.selected.has(u.id)) G.selected.clear();
          else { G.selected.clear(); G.selected.add(u.id); }
          // bring it into view if it is off screen
          const px2 = RD.sx(u.x), py2 = RD.sy(u.y, u.members[0].z || 0);
          if (G.selected.has(u.id) && (px2 < 0 || px2 > R.W || py2 < 0 || py2 > R.H)) focusUnit(u);
          return;
        }
        case 'deploy':
          if (G.deploying) { G.deploying = null; G.deployOpen = false; }
          else G.deployOpen = !G.deployOpen;
          return;
        case 'card': {
          const why = BL.canAfford(S, 0, r.arg);
          if (why) { flash(whyText(why)); return; }
          G.deploying = r.arg; G.deployOpen = false;
          if (BL.UNITS[r.arg]) { const p = BL.deployPoints(S, 0, r.arg); const b = p[p.length - 1]; if (p.length === 1) { R.cam.tx = b.x + 120; R.cam.ty = b.y; } }
          return;
        }
        case 'cmd':
          if (r.arg === 'move' || r.arg === 'attack') { G.cmdMode = r.arg; return; }
          if (r.arg === 'hold') { issue('hold'); return; }
          if (r.arg === 'retreat') { issue('retreat'); return; }
          if (r.arg === 'follow') { toggleFollow(); return; }
          return;
      }
      return;
    }
    if (G.paused || S.over) return;
    if (G.deployOpen) { G.deployOpen = false; return; }
    const w = RD.toGround(px, py, S.field);
    if (G.deploying) {
      const res = BL.deploy(S, 0, G.deploying, w.x, w.y);
      if (!res.ok) { flash(whyText(res.reason)); return; }
      if (BL.audio) BL.audio.radio();
      if (res.unit && G.deploying !== 'insert') { G.selected.clear(); G.selected.add(res.unit.id); }
      G.deploying = null;
      return;
    }
    if (button === 2) { orderAt(px, py, w); return; }
    const own = pickUnit(px, py, 0);
    if (own) {
      if (shift) { if (G.selected.has(own.id)) G.selected.delete(own.id); else G.selected.add(own.id); }
      else if (G.selected.size === 1 && G.selected.has(own.id)) G.selected.clear();
      else { G.selected.clear(); G.selected.add(own.id); }
      if (BL.audio) BL.audio.click();
      return;
    }
    if (G.selected.size) orderAt(px, py, w);
  }

  function orderAt(px, py, w) {
    const foe = pickUnit(px, py, 1);
    if (foe) { issue('attack', foe.x, foe.y, foe.id); return; }
    issue(G.cmdMode === 'attack' ? 'attack' : 'move', w.x, w.y);
  }

  // ---------------------------------------------------------------- pointer input

  const ptrs = new Map();
  let pinch = null, drag = null;
  const canLook = () => G.mode === 'battle' && G.phase === 'play';
  const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function setupInput() {
    const cv = R.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (BL.audio) BL.audio.start();
      if (ptrs.size === 2 && canLook()) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.cam.tz, w: RD.toGround((a.x + b.x) / 2, (a.y + b.y) / 2, G.S.field) };
        drag = null;
        return;
      }
      const rr = BL.hud.rects || {};
      drag = {
        x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, button: e.button, shift: e.shiftKey,
        mini: canLook() && inRect(rr.minimap, e.clientX, e.clientY), roster: canLook() && inRect(rr.roster, e.clientX, e.clientY),
        scroll0: G.rosterScroll, vx: 0, vy: 0, lastT: performance.now(),
      };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const lim = RD.zoomLimits(G.S.field);
        R.cam.tz = clamp(pinch.z * d / Math.max(10, pinch.d), lim.min, lim.max);
        R.cam.z = R.cam.tz;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        R.cam.tx = R.cam.x = pinch.w.x - (mx - R.W / 2) / R.cam.z;
        R.cam.ty = R.cam.y = pinch.w.y - (my - R.H / 2) / (R.cam.z * RD.K);
        manualCam();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const now = performance.now();
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) drag.moved = true;
      if (drag.moved && canLook() && !G.paused) {
        if (drag.mini) minimapTo(e.clientX, e.clientY);
        else if (drag.roster) G.rosterScroll = Math.round(drag.scroll0 - (e.clientY - drag.y0) / 36);
        else {
          R.cam.tx -= dx / R.cam.z; R.cam.x -= dx / R.cam.z;
          R.cam.ty -= dy / (R.cam.z * RD.K); R.cam.y -= dy / (R.cam.z * RD.K);
          const dtm = Math.max(1, now - drag.lastT) / 1000;
          drag.vx = -dx / R.cam.z / dtm; drag.vy = -dy / (R.cam.z * RD.K) / dtm;
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
      else if (!drag.mini && !drag.roster && canLook() && performance.now() - drag.lastT < 80) { R.cam.vx = clamp(drag.vx, -3000, 3000) * 0.6; R.cam.vy = clamp(drag.vy, -3000, 3000) * 0.6; }
      drag = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!canLook()) return;
      if (inRect(BL.hud.rects.roster, e.clientX, e.clientY)) { G.rosterScroll += Math.sign(e.deltaY); return; }
      const lim = RD.zoomLimits(G.S.field);
      const w = RD.toGround(e.clientX, e.clientY, G.S.field);
      R.cam.tz = clamp(R.cam.tz * Math.exp(-e.deltaY * 0.0015), lim.min, lim.max);
      if (!G.following) { R.cam.tx = w.x - (e.clientX - R.W / 2) / R.cam.tz; R.cam.ty = w.y - (e.clientY - R.H / 2) / (R.cam.tz * RD.K); }
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
    if (k === ' ' || k === 'p') { G.paused = !G.paused; e.preventDefault(); return; }
    if (k === 'escape') { if (G.deploying || G.deployOpen) { G.deploying = null; G.deployOpen = false; } else if (G.selected.size) G.selected.clear(); else G.paused = !G.paused; return; }
    if (G.paused || G.S.over) return;
    const n = parseInt(k, 10);
    if (n >= 1 && n <= BL.DEPLOY_ORDER.length) {
      const type = BL.DEPLOY_ORDER[n - 1];
      const why = BL.canAfford(G.S, 0, type);
      if (why) flash(whyText(why)); else { G.deploying = type; G.deployOpen = false; }
      return;
    }
    if (k === 'tab') { e.preventDefault(); G.selected.clear(); for (const u of G.S.units) if (u.alive && u.team === 0) G.selected.add(u.id); return; }
    if (k === 'm') G.cmdMode = 'move';
    if (k === 'g') G.cmdMode = 'attack';
    if (k === 'h') issue('hold');
    if (k === 'r') issue('retreat');
    if (k === 'f') toggleFollow();
    if (k === 'c') { G.camMode = G.camMode === 'action' ? 'tactical' : 'action'; G.camIdle = 0; G.director.t = 0; }
    if (k === 'b') G.deployOpen = !G.deployOpen;
    if (k === '=' || k === '+') R.cam.tz *= 1.25;
    if (k === '-' || k === '_') R.cam.tz /= 1.25;
  }

  function keyPan(dt) {
    if (!canLook()) return;
    const sp = 900 / R.cam.z * dt;
    if (keys.has('arrowleft') || keys.has('a')) { R.cam.tx -= sp; manualCam(); }
    if (keys.has('arrowright') || keys.has('d')) { R.cam.tx += sp; manualCam(); }
    if (keys.has('arrowup') || keys.has('w')) { R.cam.ty -= sp / RD.K; manualCam(); }
    if (keys.has('arrowdown') || keys.has('s')) { R.cam.ty += sp / RD.K; manualCam(); }
    if (keys.has('q')) R.cam.tz /= 1 + dt * 1.5;
    if (keys.has('e')) R.cam.tz *= 1 + dt * 1.5;
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    RD.init(document.getElementById('game'));
    GR.WX.onThunder = (d) => BL.audio && BL.audio.thunder(d);
    setupInput();
    newAttract();
    G.api = { startMission, toTitle, toCampaign, tap, issue, pickUnit, newAttract, beginPlay };
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  const ready = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('600 16px "Barlow Condensed"'), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  window.addEventListener('load', () => ready.then(boot, boot));
})();
