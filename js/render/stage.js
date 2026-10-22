/*
 * Tower of Wishes — staged story scenes.
 *
 * A story scene listed in window.TowStages (js/stages.js) plays out with the
 * real cel-shaded fighters on a real arena, beat by beat with its dialogue
 * lines, like an anime episode: blocking, gestures, speech balloons, camera
 * moves, cuts and impact frames.
 *
 * API (used by main.js):
 *   TowRender.stage.start(def, Sim) -> { match, beat(i, count), update(dt), camera(), focus(key) }
 *   focus(key) plays def.focus[key] (character select: the camera visits one
 *   starter, who comes forward); the previous key's `back` actions run.
 *
 * The units never fight: this module moves them itself (position, facing,
 * velocity for the walk cycle, state for the pose) and pushes fx events
 * into match.fx for the effects layer.
 *
 * Stage definition (all optional except cast):
 *   arena      arena key ('clearing', 'summit', 'cave', ...)
 *   scenario   match.scenario for the world painter (e.g. 'ogre')
 *   cast       [{ id, key, x, y, f, hidden, need, notStarter }]  key '@' = the player's starter;
 *              need: 'kael' | 'eiryn' (Chapter Five party), unit left out otherwise;
 *              notStarter: left out when it is the player's starter. Actions may
 *              name '@' even when the starter is cast under its own key.
 *   ambient    { every: s, do: [actions] }  background life, repeated forever
 *   focus      { key: { cam, do: [actions], back: [actions] } }  see focus()
 *   setup      actions applied instantly at the start
 *   cam        the opening shot
 *   beats      [{ line, cam, loop, do: [actions] }]  one per dialogue line (loop: replay
 *              the actions every `loop` seconds while the line stays up). `line` (a
 *              case-insensitive substring of the line's text) keys a beat to a
 *              line; beats without it go by position. Skipped beats are
 *              applied instantly so the blocking stays consistent.
 *
 * Action (every field optional; `at` is seconds after the beat starts):
 *   { at, who, to:[x,y] | path:[[x,y]..], speed, gait:'walk'|'run'|'creep'|'back'|'dash',
 *     face: angle | unitId | [x,y], state, dur, base, say, sayT, icon,
 *     attack: { wind, active, recover, range, arc, tele, hold }, release: true,
 *     show, hide, blink:[x,y], knock:[dx,dy], drained, beaten, armed, flash,
 *     fx: type | {type, ...}, cam: shot, cutin: caption|true, shake, slow:[k,t],
 *     freeze, fade: [alpha, seconds, color], arrow: { from, to },
 *     set: {gest, prop, stow, noStool} (unit fields read by fighters.js), put:[x,y] (teleport),
 *     glow: [k, s] (match.glow: the formation's light), door: [k, s] (tavern door),
 *     light: [rgb, alpha, s] (additive screen wash), speed: [k, s, 'h'|'r'] (speed lines),
 *     hop: [metres, s] (a leap: the fighter is lifted and set down again),
 *     drop: [metres, s] (falls from that height and lands),
 *     reset: [k, s] (rooftops: the Reset opens in the sky),
 *     whip: [k, s, dir] (blurred trunks sweeping past the lens), sky: [k, s] (the
 *     formation's light over the treeline), burst: 'dust'|'leaf' (at the unit's feet),
 *     trail: 'dust'|'leaf'|null (kicked up while the unit moves), rumble: [amp, s] }
 * Gaits: walk, run, creep, back, dash, stride, sprint (fast, stride rate capped).
 * Shot: { focus: id | [ids], x, y, dx, dy, view (metres on the short side),
 *         ang | face:id | behind:id, side, drift (rad/s), push (view per s),
 *         pitch, ease (s), cut (hard cut) }
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  let V = null, R = null, last = null;

  // ------------------------------------------------------------ renderer hook
  // Staged matches draw with callouts (speech balloons, reaction marks) and
  // get a low camera, hard cuts, cut-ins and screen overlays.
  const origCreate = NS.createRenderer;
  if (origCreate) {
    NS.createRenderer = function (canvas) {
      const od = NS.director && NS.director.create;
      if (od) NS.director.create = function (v) { V = v; return od.apply(this, arguments); };
      let r;
      try { r = origCreate(canvas); } finally { if (od) NS.director.create = od; }
      R = r;
      const draw = r.draw;
      r.draw = function (s, dt, quiet, show) {
        const h = s && s.stageHandle;
        if (!h) return draw.call(r, s, dt, quiet, show);
        try { h._pre(dt); } catch (e) { /* never break the frame */ }
        draw.call(r, s, dt, false, show);
        try { h._post(dt); } catch (e) { /* never break the frame */ }
      };
      return r;
    };
  }

  // ------------------------------------------------------------ helpers
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function lerpAng(a, b, k) { return a + wrap(b - a) * k; }
  function screen() {
    if (V && V.W) return { W: V.W, H: V.H };
    return { W: window.innerWidth || 844, H: window.innerHeight || 390 };
  }
  function storyState() { const t = window.__tow; return t && t.story; }
  // The '@' cast member: an old save's starter, or the hired companion in side episodes.
  function starterKey() { const st = storyState(); return (st && (st.starter || (st.side && st.companion))) || null; }
  function currentLines() {
    try { const st = storyState(); return st && window.TowStory ? window.TowStory.lines(st) : []; } catch (e) { return []; }
  }
  function partyHas(who) {
    const st = storyState(), pick = (st && st.flags && st.flags.party) || 'both';
    if (who === 'kael') return pick !== 'eiryn';
    if (who === 'eiryn') return pick !== 'kael';
    return true;
  }

  // ------------------------------------------------------------ start
  function start(def, Sim) {
    if (!def || typeof def !== 'object') return last || (last = make({ arena: 'clearing', cast: [] }, Sim));
    try { last = make(def, Sim); } catch (e) {
      if (window.console) console.warn('stage: falling back', e);
      last = make({ arena: def.arena || 'clearing', cast: [] }, Sim);
    }
    return last;
  }

  function make(def, Sim) {
    const DEFS = Sim.DEFS || {};
    const starter = starterKey();
    const cast = [];
    for (const c of def.cast || []) {
      if (c.need && !partyHas(c.need)) continue;
      if (c.notStarter && c.key === starter) continue;
      const key = c.key === '@' ? starter : c.key;
      if (!key || !DEFS[key]) continue;
      cast.push({ id: c.id || (c.key === '@' ? '@' : key), key, x: c.x || 0, y: c.y || 0, f: c.f || 0 });
    }
    const hiddenSpare = !cast.length;
    if (hiddenSpare) cast.push({ id: '_spare', key: 'kael', x: 0, y: 0, f: 0 });
    const match = Sim.createMatch({ cast, arena: def.arena || 'clearing', intro: true, seed: def.seed || 7 });
    match.phase = 'stage';
    match.scenario = def.scenario || 'stage';
    match.cutscene = null;
    const units = match.byId;
    // '@' always names the player's starter, also when it is cast under its own key.
    if (!units['@']) Object.defineProperty(units, '@', { get: () => (starterKey() ? units[starterKey()] : undefined), enumerable: false, configurable: true });
    const info = new Map(); // unit -> runtime staging
    for (const u of match.units) {
      info.set(u, { mv: null, base: 'idle', ts: 0, face: null, knock: null, hold: false });
      u.hp = u.maxHp; u.armed = u.key === 'eiryn' ? false : u.armed;
    }
    if (hiddenSpare) match.units[0].fled = true;
    // Auto-staged scenes (def.auto): everyone stands easy, weapons put away, arms
    // folded or on hips while someone else talks; the speaker talks with their hands.
    const AUTO = def.auto || null;
    if (AUTO) {
      const listen = AUTO.listen || ['cross', 'hips'];
      let n = 0;
      for (const c of def.cast || []) {
        const u = units[c.id || c.key]; if (!u) continue;
        if (!c.armed && !AUTO.armed) u.stow = true;
        u.gest = c.gest !== undefined ? c.gest : listen[n++ % listen.length];
        u.noStool = true;
      }
    }
    for (const c of def.cast || []) if (c.hidden) { const u = units[c.id || (c.key === '@' ? '@' : c.key)]; if (u) u.fled = true; }

    // ---- stage state
    let clock = 0, queue = [], played = -1, freeze = 0, slow = { k: 1, t: 0 };
    let shot = null, shotT = 0, from = null;
    const camOut = { x: 0, y: 0, sc: 40, ang: -0.32, pitch: 0.56 };
    let snap = true, pendingCut = null, shake = 0;
    const fade = { a: 0, to: 0, t: 0, dur: 0, from: 0, col: '0,0,0' };
    let bars = 0;
    const arrows = [];
    // Screen effects: eased values {v, to, from, t, dur}.
    const ease = () => ({ v: 0, to: 0, from: 0, t: 0, dur: 0 });
    const FX = { glow: ease(), door: ease(), light: ease(), speed: ease(), whip: ease(), sky: ease(), reset: ease() };
    let lightCol = '169,139,255', speedMode = 'h', whipDir = -1, rumble = { a: 0, t: 0 };
    function easeTo(e, to, dur) { e.from = e.v; e.to = to; e.t = 0; e.dur = dur || 0; if (!e.dur) e.v = to; }
    function stepEase(e, dt) { if (e.dur > 0) { e.t += dt; e.v = e.from + (e.to - e.from) * smooth(e.t / e.dur); if (e.t >= e.dur) { e.v = e.to; e.dur = 0; } } else e.v = e.to; }
    const parts = [];
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Pixel arenas: leaves and dust come from the effect packs (the painted prologue keeps its own).
    function pixelFx() {
      const T = NS.tiles, th = match.arena && match.arena.theme;
      const F = V.fxApi && V.fxApi.pxfx && V.fxApi.pxfx();
      return F && T && T.arenas && T.ready() && T.RECIPES[th] ? F : null;
    }
    function puff(x, y, kind, n, sp) {
      const F = pixelFx();
      if (F) {
        if (kind === 'leaf') F.spawn('leaves', x, y, 0.6, { scale: 1.4 });
        else if (n > 4) { F.spawn('dust_land', x, y, 0, { scale: 1.1 }); F.spawn('smoke_puff', x + (rnd() - 0.5) * 0.6, y, 0.1, { scale: 0.9, delay: 0.05 }); }
        else F.spawn('dust_run', x, y, 0, { scale: 0.8, flip: rnd() < 0.5 });
        return;
      }
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, v = (kind === 'leaf' ? 1.5 : 0.6) + rnd() * (sp ? sp * 0.12 : 1.2);
        parts.push({ kind, x: x + (rnd() - 0.5) * 0.3, y: y + (rnd() - 0.5) * 0.3, z: kind === 'leaf' ? 0.3 + rnd() * 1.4 : 0.05, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: kind === 'leaf' ? 1 + rnd() * 2 : 0.5 + rnd() * 0.8, t: 0, life: kind === 'leaf' ? 1.2 + rnd() * 0.8 : 0.5 + rnd() * 0.5, r: kind === 'leaf' ? 0.06 + rnd() * 0.05 : 0.15 + rnd() * 0.2, rot: rnd() * 6, spin: (rnd() - 0.5) * 12, c: (rnd() * 3) | 0 });
      }
      if (parts.length > 260) parts.splice(0, parts.length - 260);
    }
    let ambT = 0, ambQ = [];
    let focusKey = null, loopT = 0, loopBeat = null;

    // ---- camera
    function unitsOf(f) {
      const ids = Array.isArray(f) ? f : [f];
      return ids.map((id) => units[id]).filter((u) => u && !u.fled);
    }
    function target(sh, t) {
      const { W, H } = screen();
      let x = camOut.x, y = camOut.y;
      const fid = sh.focus || (sh.x == null ? sh.face || sh.behind : null);
      if (fid) {
        const us = unitsOf(fid);
        if (us.length) { x = 0; y = 0; for (const u of us) { x += u.x; y += u.y; } x /= us.length; y /= us.length; }
      }
      if (sh.x != null) x = sh.x;
      if (sh.y != null) y = sh.y;
      x += sh.dx || 0; y += sh.dy || 0;
      const ang0 = sh._ang != null ? sh._ang : camOut.ang;
      // up: aim past the subject so it sits lower on screen (frames faces in close-ups)
      // (from the helicopter view the subject stays centred, and no shot is tighter than 5.6 m)
      if (sh.up && !V.HELI) { x -= Math.sin(ang0) * sh.up; y -= Math.cos(ang0) * sh.up; }
      const view = Math.max(V.HELI ? 5.6 : 1.6, (sh.view || 9) + (sh.push || 0) * t);
      const sc = sh.sc || Math.min(W, H) / view;
      const ang = (sh._ang != null ? sh._ang : camOut.ang) + (sh.drift || 0) * t;
      return { x, y, sc, ang, pitch: sh.pitch || 0.52 };
    }
    function setShot(sh) {
      if (!sh) return;
      sh = Object.assign({}, sh);
      // Angles that follow a unit are fixed when the shot starts.
      const fu = sh.face && units[sh.face], bu = sh.behind && units[sh.behind];
      const ac = sh.across && unitsOf(sh.across);
      if (sh.ang != null) sh._ang = sh.ang;
      else if (ac && ac.length === 2) sh._ang = -Math.atan2(ac[1].y - ac[0].y, ac[1].x - ac[0].x) + (sh.side || 0);
      else if (fu) sh._ang = Math.PI / 2 - fu.facing + (sh.side || 0);
      else if (bu) sh._ang = -Math.PI / 2 - bu.facing + (sh.side || 0);
      else sh._ang = camOut.ang + (sh.side || 0);
      from = Object.assign({}, camOut);
      shot = sh; shotT = 0;
      if (sh.cut) snap = true;
    }
    function updateCamera(dt) {
      if (!shot) return;
      shotT += dt;
      const tg = target(shot, shotT);
      const k = shot.cut ? 1 : smooth(shotT / (shot.ease == null ? 1.1 : Math.max(0.01, shot.ease)));
      camOut.x = from.x + (tg.x - from.x) * k;
      camOut.y = from.y + (tg.y - from.y) * k;
      camOut.sc = from.sc + (tg.sc - from.sc) * k;
      camOut.ang = lerpAng(from.ang, tg.ang, k);
      camOut.pitch = from.pitch + (tg.pitch - from.pitch) * k;
      if (shot.cut) from = Object.assign({}, tg);
    }

    // ---- unit motion
    function faceAngle(u, f) {
      if (typeof f === 'number') return f;
      if (typeof f === 'string') { const o = units[f]; return o ? Math.atan2(o.y - u.y, o.x - u.x) : u.facing; }
      if (Array.isArray(f)) return Math.atan2(f[1] - u.y, f[0] - u.x);
      return u.facing;
    }
    const GAIT = { walk: [1.5, 'move'], run: [4.2, 'opener'], creep: [1.1, 'circle'], back: [1.0, 'move'], dash: [9, 'opener'], stride: [2.2, 'move'], sprint: [9, 'opener'] };
    function updateUnit(u, I, dt) {
      u.st += dt;
      if (u.flash > 0) u.flash -= dt;
      if (u.barkT > 0) u.barkT -= dt;
      if (u.iconT > 0) u.iconT -= dt;
      u.vx = 0; u.vy = 0; u.kx *= Math.pow(0.02, dt); u.ky *= Math.pow(0.02, dt);
      if (I.hop) { I.hop.t += dt; const hk = I.hop.t / I.hop.dur; u.lift = hk >= 1 ? 0 : I.hop.drop ? I.hop.h * (1 - hk * hk) : I.hop.h * Math.sin(Math.PI * hk); if (I.hop.t >= I.hop.dur) I.hop = null; }
      if (I.knock) {
        const k = I.knock, step = Math.min(dt, k.t);
        u.x += k.vx * step; u.y += k.vy * step; u.kx = k.vx; u.ky = k.vy; k.t -= dt;
        if (k.t <= 0) I.knock = null;
      }
      if (I.mv) {
        const m = I.mv, p = m.pts[0];
        const dx = p[0] - u.x, dy = p[1] - u.y, d = Math.hypot(dx, dy);
        // Walk-and-talk: a walker beside a companion going the same way keeps abreast of
        // them (the speaker half a step ahead), with a little natural give in the pace.
        let pace = 1 + 0.035 * Math.sin(clock * 0.9 + (u.walk || 0) * 0.02 + u.id.length);
        for (const o of match.units) {
          const J = o !== u && !o.fled && info.get(o);
          if (!J || !J.mv || Math.hypot(o.x - u.x, o.y - u.y) > 3.2) continue;
          const ux = dx / (d || 1), uy = dy / (d || 1), q = J.mv.pts[0], od = Math.hypot(q[0] - o.x, q[1] - o.y) || 1;
          if (((q[0] - o.x) / od) * ux + ((q[1] - o.y) / od) * uy < 0.7) continue;
          const ahead = (o.x - u.x) * ux + (o.y - u.y) * uy;
          const goal = match.stageSpeaker === o.id ? 0.4 : match.stageSpeaker === u.id ? -0.4 : 0;
          pace += clamp((ahead - goal) * 0.25, -0.2, 0.2);
          break;
        }
        if (match.stageSpeaker === u.id) pace *= 0.95;
        m.pace = m.pace == null ? pace : m.pace + (pace - m.pace) * Math.min(1, dt * 3);
        const step = m.speed * m.pace * dt;
        if (d <= step || d < 1e-4) {
          u.x = p[0]; u.y = p[1]; m.pts.shift();
          if (!m.pts.length) { I.mv = null; if (!I.ts) u.state = I.base; }
        } else {
          u.x += (dx / d) * step; u.y += (dy / d) * step;
          u.vx = (dx / d) * m.speed * m.pace; u.vy = (dy / d) * m.speed * m.pace;
          u.walk += (m.gait === 'sprint' ? Math.min(m.speed, 4.6) : m.speed) * dt * 2.4;
          if (I.trail) {
            I.trailT = (I.trailT || 0) - dt;
            if (I.trailT <= 0) { I.trailT = 0.05; puff(u.x, u.y, I.trail, 2, m.speed); }
          }
          if (!I.ts) u.state = m.state;
          if (m.gait !== 'back' && I.face == null) u.facing = lerpAng(u.facing, Math.atan2(dy, dx), Math.min(1, dt * 10));
        }
      }
      if (I.face != null) {
        const want = faceAngle(u, I.face);
        u.facing = lerpAng(u.facing, want, Math.min(1, dt * (I.turn || 7)));
      }
      if (u.state === 'attack' && u.act) {
        const a = u.act;
        a.t += dt;
        if (a.phase === 'windup' && a.t >= a.wind) { if (a.hold) { a.phase = 'feint'; } else { a.phase = 'strike'; a.t = 0; } }
        else if (a.phase === 'strike' && a.t >= a.A.active) { a.phase = 'recover'; a.t = 0; }
        else if (a.phase === 'recover' && a.t >= a.A.recover) { u.act = null; u.state = I.mv ? I.mv.state : I.base; }
      } else if (I.ts) {
        I.ts -= dt;
        if (I.ts <= 0) { I.ts = 0; u.state = I.mv ? I.mv.state : I.base; }
      }
    }

    // ---- actions
    function act(a, instant) {
      try { doAct(a, instant); } catch (e) { if (window.console) console.warn('stage action failed', a, e); }
    }
    function doAct(a, instant) {
      if (a.unless && units[a.unless]) return;
      if (a.if && !units[a.if]) return;
      const u = a.who ? units[a.who] : null;
      if (a.who && !u) { if (a.cam && !instant) setShot(a.cam); return; } // unit not in this cast
      const I = u && info.get(u);
      if (u && a.show) { u.fled = false; }
      if (u && a.hide) { u.fled = true; I.mv = null; }
      if (u && a.base) { I.base = a.base; if (!I.mv && !I.ts && u.state !== 'attack') u.state = a.base; }
      if (u && a.drained != null) u.drained = a.drained ? 1 : 0;
      if (u && a.beaten != null) u.beaten = !!a.beaten;
      if (u && a.armed != null) u.armed = !!a.armed;
      if (u && a.blink) {
        if (!instant) match.fx.push({ type: 'blink', unit: u.id, x0: u.x, y0: u.y, x1: a.blink[0], y1: a.blink[1] });
        u.x = a.blink[0]; u.y = a.blink[1]; I.mv = null;
      }
      if (u && a.set) Object.assign(u, a.set);
      if (u && a.put) { u.x = a.put[0]; u.y = a.put[1]; I.mv = null; if (!I.ts && u.state !== 'attack') u.state = I.base; }
      if (u && a.trail !== undefined) I.trail = a.trail;
      if (a.glow) easeTo(FX.glow, a.glow[0], instant ? 0 : a.glow[1]);
      if (a.door) easeTo(FX.door, a.door[0], instant ? 0 : a.door[1]);
      if (a.sky) easeTo(FX.sky, a.sky[0], instant ? 0 : a.sky[1]);
      if (a.reset) easeTo(FX.reset, a.reset[0], instant ? 0 : a.reset[1]);
      if (a.light) { if (a.light[0]) lightCol = a.light[0]; easeTo(FX.light, instant ? 0 : a.light[1], instant ? 0 : a.light[2]); }
      if (a.speed) { easeTo(FX.speed, a.speed[0], instant ? 0 : a.speed[1]); if (a.speed[2]) speedMode = a.speed[2]; }
      if (a.whip) { easeTo(FX.whip, a.whip[0], instant ? 0 : a.whip[1]); if (a.whip[2]) whipDir = a.whip[2]; }
      if (u && (a.to || a.path)) {
        const pts = (a.path || [a.to]).map((p) => [p[0], p[1]]);
        const g = GAIT[a.gait || 'walk'] || GAIT.walk;
        if (instant) { const p = pts[pts.length - 1]; u.x = p[0]; u.y = p[1]; I.mv = null; if (!I.ts) u.state = I.base; }
        else {
          I.mv = { pts, speed: a.speed || g[0], state: a.gait === 'creep' ? 'circle' : g[1], gait: a.gait || 'walk' };
          if (a.gait === 'dash') match.fx.push({ type: 'dash', unit: u.id, x: u.x, y: u.y });
        }
      }
      if (u && a.face !== undefined) {
        I.face = a.face; I.turn = a.turn || 7;
        if (instant && a.face != null) u.facing = faceAngle(u, a.face);
      }
      if (instant) {
        if (u && a.state && a.hold) { u.state = a.state; I.base = a.state; }
        if (a.fade) { fade.a = fade.to = a.fade[0]; if (a.fade[2]) fade.col = a.fade[2]; fade.dur = 0; }
        if (u && a.attack && a.attack.hold) startAttack(u, I, a.attack, true);
        if (u && a.release && u.act) { u.act = null; u.state = I.base; }
        return;
      }
      if (u && a.state) {
        if (a.hold) { I.base = a.state; u.state = a.state; I.ts = 0; }
        else { u.state = a.state; u.st = 0; I.ts = a.dur || 0.6; }
        u.act = null;
      }
      if (u && a.attack) startAttack(u, I, a.attack, false);
      if (u && a.release && u.act) { u.act.hold = false; if (u.act.phase === 'feint') { u.act.phase = 'strike'; u.act.t = 0; } }
      if (u && a.hop) I.hop = { t: 0, dur: a.hop[1] || 0.7, h: a.hop[0] };
      if (u && a.drop) { I.hop = { t: 0, dur: a.drop[1] || 0.5, h: a.drop[0], drop: true }; u.lift = a.drop[0]; }
      if (u && a.knock) { const t = a.knockT || 0.25; I.knock = { vx: a.knock[0] / t, vy: a.knock[1] / t, t }; }
      if (u && a.say) { u.bark = a.say === '$' ? lineText() : a.say; u.barkT = a.sayT || clamp(1.4 + u.bark.length * 0.07, 1.6, 4.2); u.barkDelay = 0; }
      if (u && a.icon) { u.icon = a.icon; u.iconT = 0.8; }
      if (u && a.flash) u.flash = 0.12;
      if (u && a.burst) puff(u.x, u.y, a.burst, a.burstN || 12, 6);
      if (a.rumble) rumble = { a: a.rumble[0], t: a.rumble[1] };
      if (a.fx) {
        const e = typeof a.fx === 'string' ? { type: a.fx } : Object.assign({}, a.fx);
        if (u) { e.unit = u.id; if (e.x == null) { e.x = u.x + Math.cos(u.facing) * (e.reach || 0); e.y = u.y + Math.sin(u.facing) * (e.reach || 0); } }
        if (e.type === 'impact') { e.type = 'hit'; e.dmg = ''; e.big = true; e.from = e.from || 'hero'; }
        if (e.type === 'hit' && e.dmg == null) e.dmg = '';
        match.fx.push(e);
      }
      if (a.arrow) {
        const s = units[a.arrow.from], t = units[a.arrow.to] || null;
        const p0 = s ? [s.x, s.y] : a.arrow.p0, p1 = a.arrow.p1 || (t ? [t.x, t.y] : null);
        if (p0 && p1) {
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy) || 1, sp = a.arrow.speed || 18;
          const over = a.arrow.over || 2.5;
          const pr = { x: p0[0], y: p0[1], z: 1.3, vx: dx / d * sp, vy: dy / d * sp, A: { name: 'Arrow' }, life: (d + over) / sp };
          match.projectiles.push(pr); arrows.push(pr);
        }
      }
      if (a.cam) setShot(a.cam);
      if (a.cutin && u) pendingCut = { u, caption: typeof a.cutin === 'string' ? a.cutin : undefined };
      if (a.shake) shake = Math.max(shake, a.shake);
      if (a.slow) slow = { k: a.slow[0], t: a.slow[1] };
      if (a.freeze) freeze = Math.max(freeze, a.freeze);
      if (a.fade) { fade.from = fade.a; fade.to = a.fade[0]; fade.dur = a.fade[1] || 0.5; fade.t = 0; if (a.fade[2]) fade.col = a.fade[2]; }
    }
    function startAttack(u, I, A, instant) {
      const tele = A.tele !== false;
      u.state = 'attack'; I.ts = 0;
      u.act = {
        phase: instant && A.hold ? 'feint' : 'windup', t: 0, wind: A.wind || 0.4, hold: !!A.hold,
        A: { name: A.name || 'Stage', active: A.active || 0.1, recover: A.recover || 0.45, range: A.range || 1.6, arc: A.arc || 1.6, projectile: tele ? 0 : 1 },
        target: A.aim ? units[A.aim] || null : null,
      };
      if (A.aim) u.act.A.projectile = 1;
    }

    // Run every not-yet-started action of the current beat instantly.
    function flush() {
      queue.sort((a, b) => (a.at || 0) - (b.at || 0));
      for (const a of queue) act(a, true);
      queue = [];
    }
    function runBeat(b, instant) {
      if (!b) return;
      if (instant) {
        for (const a of b.do || []) act(a, true);
        return;
      }
      clock = 0;
      loopBeat = b.loop ? b : null; loopT = 0;
      if (b.cam) setShot(b.cam);
      for (const a of b.do || []) {
        if (!(a.at > 0)) act(a, false);
        else queue.push(a);
      }
    }

    let curText = '';
    // The current line as a short balloon: the first sentence if it runs long.
    function lineText() {
      let t = curText;
      if (t.length > 40) { const m = t.match(/^.*?[.!?…](?=\s|$)/); if (m) t = m[0]; }
      return t;
    }
    const beats = def.beats || [];
    const autoState = { side: 0.4, last: null };
    // Blocking made from the dialogue itself: a close-up cut on whoever speaks (the
    // listeners turn to them and settle), a wide shot over narration. A node can add
    // its own actions or shots per line: def.auto.nodes[nodeId][lineIndex] = { cam, do }.
    function autoBeat(A, ls, i) {
      const l = ls[i] || {};
      const who0 = l.who && l.who !== '@' ? l.who : null;
      const who = who0 && A.alias && A.alias[who0] ? A.alias[who0] : who0;
      const ids = (def.cast || []).map((c) => c.id || c.key).filter((id) => units[id] && !units[id].fled);
      const spk = who && ids.includes(who) ? who : null;
      const nid = (() => { const st = storyState(); return st ? (st.side ? st.side.node : st.node) : null; })();
      const ov = A.nodes && A.nodes[nid] && A.nodes[nid][i];
      let b;
      if (spk) {
        autoState.side = -autoState.side;
        const sp = units[spk];
        const others = ids.filter((o) => o !== spk);
        others.sort((p, q) => Math.hypot(units[p].x - sp.x, units[p].y - sp.y) - Math.hypot(units[q].x - sp.x, units[q].y - sp.y));
        const listener = others[0] || null;
        const same = autoState.last === spk;
        b = {
          cam: { face: spk, side: autoState.side, view: A.close || 3.7, up: 1.05, pitch: 0.42, push: -0.05, ease: same ? 0.4 : 0.7, cut: !same },
          do: [
            ...(listener && !A.noFace ? [{ who: spk, face: listener }] : []),
            ...(A.noFace ? [] : others.map((o) => ({ who: o, face: spk }))),
            { at: 0.25, who: spk, say: '$' },
            { at: 0.2, who: spk, set: { gest: A.talk || 'gesture' } },
            { at: 2.4, who: spk, set: { gest: (A.listen || ['cross', 'hips'])[(i + 1) % 2] } },
          ],
        };
        autoState.last = spk;
      } else {
        const cx = ids.length ? ids : null;
        b = { cam: Object.assign({ focus: cx, view: A.view || 8.5, ang: (A.ang != null ? A.ang : -0.45) + 0.06 * (i % 3), pitch: 0.5, drift: 0.015, ease: 1.2 }, A.wide || {}), do: [] };
        autoState.last = null;
      }
      if (ov) { if (ov.cam) b.cam = ov.cam; b.do = ov.replace ? (ov.do || []) : b.do.concat(ov.do || []); }
      return b;
    }
    function beat(i) {
      try {
        const ls = currentLines();
        curText = String((ls[i] && ls[i].text) || '');
        // Who is speaking this line (sprite characters turn toward the conversation).
        { const w = ls[i] && ls[i].who; const al = def.auto && def.auto.alias; const id = w && al && al[w] ? al[w] : w; match.stageSpeaker = id && units[id] && !units[id].fled ? id : null; }
        if (def.auto) {
          const b = autoBeat(def.auto, ls, i);
          flush(); played = i; for (const id of Object.keys(units)) if (units[id] && units[id].barkT) units[id].barkT = 0; runBeat(b, false);
          return;
        }
        const text = curText.toLowerCase();
        let k = -1;
        for (let j = played + 1; j < beats.length; j++) {
          const key = beats[j] && beats[j].line;
          if (key && text && text.indexOf(String(key).toLowerCase()) >= 0) { k = j; break; }
        }
        // Lines skipped for this playthrough keep their beats' places.
        const at = ls[i] && ls[i].src != null ? ls[i].src : i;
        if (k < 0 && beats[at] && !beats[at].line && at > played) k = at;
        if (k < 0) return;
        flush();
        for (let j = played + 1; j < k; j++) runBeat(beats[j], true);
        played = k;
        runBeat(beats[k], false);
      } catch (e) { if (window.console) console.warn('stage beat failed', e); }
    }

    // Character select: visit one starter (def.focus[key]).
    function focus(key) {
      try {
        const F = def.focus || {};
        if (key === focusKey) return;
        const prev = focusKey && F[focusKey];
        focusKey = key;
        queue = queue.filter((a) => !a._focus);
        if (prev && prev.back) for (const a of prev.back) { if (!(a.at > 0)) act(a, false); else queue.push(Object.assign({ _focus: true }, a, { at: clock + a.at })); }
        const f = F[key];
        if (!f) return;
        if (f.cam) setShot(f.cam);
        for (const a of f.do || []) { if (!(a.at > 0)) act(a, false); else queue.push(Object.assign({ _focus: true }, a, { at: clock + a.at })); }
      } catch (e) { if (window.console) console.warn('stage focus failed', e); }
    }

    function update(dt) {
      try {
        dt = Math.min(0.05, dt || 0);
        // fade and letterbox run on real time
        bars = Math.min(1, bars + dt * 1.6);
        if (fade.dur > 0) { fade.t += dt; fade.a = fade.from + (fade.to - fade.from) * smooth(fade.t / fade.dur); if (fade.t >= fade.dur) { fade.a = fade.to; fade.dur = 0; } }
        else fade.a = fade.to;
        if (freeze > 0) { freeze -= dt; updateCamera(dt * 0.25); return; }
        if (slow.t > 0) { slow.t -= dt; dt *= slow.k; }
        clock += dt;
        if (loopBeat) {
          loopT += dt;
          if (loopT >= loopBeat.loop) { loopT = 0; for (const a of loopBeat.do || []) { if (!(a.at > 0)) act(a, false); else queue.push(Object.assign({}, a, { at: clock + a.at })); } }
        }
        if (def.ambient) {
          if (ambT === 0) ambQ = def.ambient.do.slice().sort((a, b) => (a.at || 0) - (b.at || 0));
          ambT += dt;
          const inStory = window.__tow && window.__tow.view === 'story';
          while (ambQ.length && (ambQ[0].at || 0) <= ambT) { const x = ambQ.shift(); if (!(inStory && x.say)) act(x, false); }
          if (ambT >= (def.ambient.every || 10)) ambT = 0;
        }
        for (const k in FX) stepEase(FX[k], dt);
        match.glow = FX.glow.v; match.door = FX.door.v; match.reset = FX.reset.v;
        if (rumble.t > 0) { rumble.t -= dt; shake = Math.max(shake, rumble.a); }
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.t += dt;
          if (q.t >= q.life) { parts.splice(i, 1); continue; }
          q.x += q.vx * dt; q.y += q.vy * dt; q.z = Math.max(0, q.z + q.vz * dt); q.rot += q.spin * dt;
          if (q.kind === 'leaf') { q.vz -= 3 * dt; q.vx *= Math.pow(0.4, dt); q.vy *= Math.pow(0.4, dt); }
          else { q.vx *= Math.pow(0.1, dt); q.vy *= Math.pow(0.1, dt); q.vz *= Math.pow(0.2, dt); }
        }
        if (queue.length) {
          queue.sort((a, b) => a.at - b.at);
          while (queue.length && queue[0].at <= clock) act(queue.shift(), false);
        }
        for (const u of match.units) updateUnit(u, info.get(u), dt);
        for (let i = arrows.length - 1; i >= 0; i--) {
          const p = arrows[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) {
            arrows.splice(i, 1);
            const j = match.projectiles.indexOf(p);
            if (j >= 0) match.projectiles.splice(j, 1);
            match.fx.push({ type: 'thunk', x: p.x, y: p.y });
          }
        }
        updateCamera(dt);
      } catch (e) { if (window.console) console.warn('stage update failed', e); }
    }

    function camera() {
      return { x: camOut.x, y: camOut.y, sc: camOut.sc, ang: camOut.ang };
    }

    // Called by the renderer hook around each draw of this match.
    function pre(dt) {
      if (!V) return;
      const cam = V.cam;
      if (snap) { V.cutSnap = true; snap = false; cam.pitch = camOut.pitch; }
      // core.js eases pitch toward 0.56 for override shots; pre-compensate so the
      // camera lands on the pitch this shot asks for (lower = more dramatic).
      const k = Math.min(0.9, (dt || 0) * 4);
      cam.pitch = V.HELI ? V.HELI.pitch : (camOut.pitch - 0.56 * k) / (1 - k);
      if (shake > 0) { cam.shake = Math.max(cam.shake, shake); shake = 0; }
      pendingCut = null; // eye cut-ins are switched off
      // Balloons and reaction marks are drawn here (post), placed on the real
      // head (seated figures too) and kept on screen in close-ups; hide the
      // callouts layer's copies for this frame.
      for (const u of match.units) {
        u.barkDelay = u.bark && u.barkT > 0 ? 1 : 0;
        u._iconT = u.iconT; if (u.iconT > 0) u.iconT = 0;
      }
    }
    function headTop(u) {
      const L = (NS.fighters && NS.fighters.LOOK[u.key]) || { h: 1 };
      const H = 1.78 * (L.h || 1);
      let z = H * 0.99;
      if (u.state === 'sit') z -= H * 0.5 - 0.47 * Math.sqrt(L.h || 1);
      return z;
    }
    function callouts(ctx, W, H) {
      const FONT = V.FONT || { ui: 'sans-serif', display: 'sans-serif' };
      const sc = V.cam.sc, INK = '#0c0808', top0 = Math.max(56, H * 0.16);
      // While a stage runs behind a menu (character select), def.safe keeps
      // balloons inside the uncovered middle of the screen.
      const safe = def.safe && !(window.__tow && window.__tow.view === 'story') ? def.safe : null;
      for (const u of match.units) {
        if (u._iconT != null) { u.iconT = u._iconT; u._iconT = null; }
        if (u.fled) continue;
        const head = V.P(u.x, u.y, headTop(u));
        if (u.iconT > 0 && u.icon) {
          const col = { '!': '#ffd166', '?': '#9cc3dd', '✦': '#e3263a', '…': '#b8c0c8' }[u.icon] || '#fff';
          const k = 0.8 - u.iconT, pop = k < 0.1 ? 1.4 - k * 4 : 1;
          const fs = Math.round(Math.min(46, Math.max(16, sc * 0.4)));
          const x = clamp(head.x + sc * 0.28, fs, W - fs), y = Math.max(top0 + fs * 0.5, head.y - fs * 0.6 - k * fs * 0.6);
          ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.transform(1, 0, -0.18, 1, 0, 0);
          ctx.font = `800 ${fs}px ${FONT.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(4, fs * 0.18); ctx.strokeStyle = INK; ctx.strokeText(u.icon, 0, 0); ctx.fillStyle = col; ctx.fillText(u.icon, 0, 0);
          ctx.restore();
        }
        // Speech is the subtitle under the picture during story scenes; elsewhere (menu
        // tableaux) a line shows as a caption by the speaker's head: no balloon.
        if (u.bark && u.barkT > 0 && !(window.__tow && window.__tow.view === 'story') && !(safe && (head.x < W * safe[0] || head.x > W * safe[1]))) {
          const fs = Math.round(clamp(sc * 0.2, 13, 22));
          ctx.font = `italic 800 ${fs}px ${FONT.display}`;
          const tw = ctx.measureText(u.bark).width;
          const bx = safe ? clamp(head.x, W * safe[0] + tw / 2, W * safe[1] - tw / 2) : clamp(head.x, tw / 2 + 10, W - tw / 2 - 10);
          const by = clamp(head.y - fs * 1.6, top0 + fs, H * 0.7), a = Math.min(1, u.barkT * 2.5);
          ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(4, fs * 0.28); ctx.strokeStyle = INK; ctx.strokeText(u.bark, bx, by);
          ctx.fillStyle = '#f6f0ec'; ctx.fillText(u.bark, bx, by);
          ctx.strokeStyle = '#e3263a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - tw * 0.3, by + fs * 0.85); ctx.lineTo(bx + tw * 0.3, by + fs * 0.85); ctx.stroke();
          ctx.restore();
        }
      }
    }
    function post() {
      if (!V) return;
      if (R) { const hs = R.takeHitstop(); if (hs > 0) freeze = Math.max(freeze, Math.min(0.12, hs)); }
      const ctx = V.ctx, W = V.W, H = V.H;
      ctx.save();
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      try { drawExtras(ctx, W, H); } catch (e) { /* never break the frame */ }
      try { callouts(ctx, W, H); } catch (e) { /* never break the frame */ }
      if (fade.a > 0.001) { ctx.fillStyle = `rgba(${fade.col},${clamp(fade.a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
      // Letterbox: the scene reads as an episode, not a menu.
      const bh = Math.round(H * 0.075 * smooth(bars));
      if (bh > 0) {
        ctx.fillStyle = '#0c0808';
        ctx.fillRect(0, 0, W, bh);
        ctx.fillRect(0, H - bh, W, bh);
      }
      ctx.restore();
    }

    // ---- screen extras: kicked-up dust and leaves, trunks whipping past the
    // lens, speed lines, the formation's dying light, additive light washes.
    const LEAF = ['#3a4a36', '#5a6a44', '#6e5a36'];
    function drawExtras(ctx, W, H) {
      const t = V.time || 0, sc = V.cam ? V.cam.sc : 40;
      // particles (world space)
      for (const q of parts) {
        const p = V.P(q.x, q.y, q.z), k = q.t / q.life;
        if (q.kind === 'leaf') {
          const r = q.r * sc;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(q.rot); ctx.scale(1, 0.45 + 0.45 * Math.abs(Math.sin(q.rot * 0.7)));
          ctx.globalAlpha = Math.min(1, (1 - k) * 2);
          ctx.fillStyle = '#0c0808'; ctx.beginPath(); ctx.ellipse(0, 0, r + 1.2, r * 0.5 + 1.2, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = LEAF[q.c]; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, 0, TAU); ctx.fill();
          ctx.restore();
        } else {
          const r = q.r * sc * (0.6 + k);
          ctx.fillStyle = `rgba(150,136,116,${(0.45 * (1 - k)).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(p.x, p.y - r * 0.3, r, r * 0.6, 0, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // the formation's light over the treeline
      const sk = FX.sky.v;
      if (sk > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        g.addColorStop(0, `rgba(150,110,255,${(0.42 * sk).toFixed(3)})`); g.addColorStop(1, 'rgba(150,110,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.55);
        const cx = W * 0.62, cy = H * 0.06, R0 = Math.min(W, H) * 0.5;
        ctx.lineWidth = 2;
        for (let k = 1; k <= 4; k++) {
          const r = R0 * (0.25 + k * 0.17), sp = (k % 2 ? 0.4 : -0.3) * (1 + k * 0.2);
          const broken = sk < 0.9 ? (0.9 - sk) * 5 : 0;
          ctx.strokeStyle = `rgba(200,175,255,${(0.6 * sk * (1 - k * 0.12)).toFixed(3)})`;
          ctx.beginPath();
          for (let s2 = 0; s2 < 6; s2++) {
            const a0 = t * sp + (s2 / 6) * TAU, a1 = a0 + TAU / 6 - 0.15 - Math.min(0.8, broken * ((s2 * 7 + k) % 5) / 5);
            if (a1 > a0) { ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.35); ctx.ellipse(cx, cy, r, r * 0.35, 0, a0, a1); }
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // trunks whipping past the lens
      const wk = FX.whip.v;
      if (wk > 0.01) {
        const n = 3, period = 0.55;
        for (let i = 0; i < n; i++) {
          const ph = ((t / period + i / n + (i * 0.37) % 0.2) % 1);
          const x = whipDir < 0 ? W * (1.2 - ph * 1.6) : W * (-0.2 + ph * 1.6);
          const w = W * (0.07 + ((i * 5) % 3) * 0.03);
          for (let j = 0; j < 4; j++) {
            ctx.fillStyle = `rgba(8,8,7,${(wk * (j ? 0.18 : 0.9)).toFixed(3)})`;
            const o = j * w * 0.5 * -whipDir;
            ctx.fillRect(x + o - w / 2, -10, w, H + 20);
          }
          ctx.fillStyle = `rgba(60,70,58,${(wk * 0.35).toFixed(3)})`;
          ctx.fillRect(x - w * 0.42, -10, w * 0.12, H + 20);
        }
      }
      // speed lines (painted prologue only; pixel scenes show motion with the cast and dust)
      const spd = pixelFx() ? 0 : FX.speed.v;
      if (spd > 0.01) {
        ctx.save();
        if (speedMode === 'r') {
          const cx = W / 2, cy = H * 0.45, n = 64;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + Math.sin(i * 12.9898 + Math.floor(t * 12)) * 0.05;
            const r0 = Math.min(W, H) * (0.42 + 0.2 * Math.abs(Math.sin(i * 7.1 + Math.floor(t * 15)))), r1 = Math.hypot(W, H);
            const w = 0.006 + (i % 4) * 0.003;
            ctx.fillStyle = i % 3 ? `rgba(246,240,236,${(0.32 * spd).toFixed(3)})` : `rgba(12,8,8,${(0.5 * spd).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); ctx.closePath(); ctx.fill();
          }
        } else {
          const n = 34;
          for (let i = 0; i < n; i++) {
            const y = ((i * 0.6180339 + 0.13) % 1) * H;
            if (Math.abs(y - H * 0.5) < H * 0.16 && i % 3) continue; // keep the runners clear
            const len = W * (0.12 + ((i * 7) % 5) * 0.06);
            const x = ((i * 0.37 + t * (2.2 + (i % 3))) % 1.4 - 0.2) * W;
            const xx = whipDir < 0 ? W - x : x;
            const th = 1 + (i % 3);
            ctx.fillStyle = i % 4 ? `rgba(246,240,236,${(0.4 * spd).toFixed(3)})` : `rgba(12,8,8,${(0.45 * spd).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + len * -whipDir, y - th); ctx.lineTo(xx + len * -whipDir, y + th); ctx.closePath(); ctx.fill();
          }
        }
        ctx.restore();
      }
      // additive light wash (the formation flaring through the window)
      if (FX.light.v > 0.004) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(${lightCol},${Math.min(1, FX.light.v).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    const handle = { match, beat, update, camera, focus, _pre: pre, _post: post, def };
    match.stageHandle = handle;

    // ---- opening: setup actions, then the first shot (a hard cut)
    for (const a of def.setup || []) act(a, true);
    for (const u of match.units) { const I = info.get(u); if (!I.mv && u.state !== 'attack') u.state = I.base; }
    const first = def.cam || { focus: match.units.filter((u) => !u.fled).map((u) => u.id), view: 9 };
    setShot(Object.assign({}, first, { cut: true }));
    updateCamera(0);
    return handle;
  }

  NS.stage = { start };
})();
