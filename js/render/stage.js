/*
 * Tower of Wishes — staged story scenes.
 *
 * A story scene listed in window.TowStages (js/stages.js) plays out with the
 * real cel-shaded fighters on a real arena, beat by beat with its dialogue
 * lines, like an anime episode: blocking, gestures, speech balloons, camera
 * moves, cuts and impact frames.
 *
 * API (used by main.js):
 *   TowRender.stage.start(def, Sim) -> { match, beat(i, count), update(dt), camera() }
 *
 * The units never fight: this module moves them itself (position, facing,
 * velocity for the walk cycle, state for the pose) and pushes fx events
 * into match.fx for the effects layer.
 *
 * Stage definition (all optional except cast):
 *   arena      arena key ('clearing', 'summit', 'cave', ...)
 *   scenario   match.scenario for the world painter (e.g. 'ogre')
 *   cast       [{ id, key, x, y, f, hidden, need }]  key '@' = the player's starter;
 *              need: 'kael' | 'eiryn' (Chapter Five party), unit left out otherwise
 *   setup      actions applied instantly at the start
 *   cam        the opening shot
 *   beats      [{ line, cam, do: [actions] }]  one per dialogue line. `line` (a
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
 *     freeze, fade: [alpha, seconds, color], arrow: { from, to } }
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
  function starterKey() { const st = storyState(); return (st && st.starter) || 'ren'; }
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
      const key = c.key === '@' ? starter : c.key;
      if (!DEFS[key]) continue;
      cast.push({ id: c.id || (c.key === '@' ? '@' : key), key, x: c.x || 0, y: c.y || 0, f: c.f || 0 });
    }
    const hiddenSpare = !cast.length;
    if (hiddenSpare) cast.push({ id: '_spare', key: 'kael', x: 0, y: 0, f: 0 });
    const match = Sim.createMatch({ cast, arena: def.arena || 'clearing', intro: true, seed: def.seed || 7 });
    match.phase = 'stage';
    match.scenario = def.scenario || 'stage';
    match.cutscene = null;
    const units = match.byId;
    const info = new Map(); // unit -> runtime staging
    for (const u of match.units) {
      info.set(u, { mv: null, base: 'idle', ts: 0, face: null, knock: null, hold: false });
      u.hp = u.maxHp; u.armed = u.key === 'eiryn' ? false : u.armed;
    }
    if (hiddenSpare) match.units[0].fled = true;
    for (const c of def.cast || []) if (c.hidden) { const u = units[c.id || (c.key === '@' ? '@' : c.key)]; if (u) u.fled = true; }

    // ---- stage state
    let clock = 0, queue = [], played = -1, freeze = 0, slow = { k: 1, t: 0 };
    let shot = null, shotT = 0, from = null;
    const camOut = { x: 0, y: 0, sc: 40, ang: -0.32, pitch: 0.56 };
    let snap = true, pendingCut = null, shake = 0;
    const fade = { a: 0, to: 0, t: 0, dur: 0, from: 0, col: '0,0,0' };
    let bars = 0;
    const arrows = [];

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
      if (sh.up) { x -= Math.sin(ang0) * sh.up; y -= Math.cos(ang0) * sh.up; }
      const view = Math.max(1.6, (sh.view || 9) + (sh.push || 0) * t);
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
    const GAIT = { walk: [1.5, 'move'], run: [4.2, 'opener'], creep: [1.1, 'circle'], back: [1.0, 'move'], dash: [9, 'opener'], stride: [2.2, 'move'] };
    function updateUnit(u, I, dt) {
      u.st += dt;
      if (u.flash > 0) u.flash -= dt;
      if (u.barkT > 0) u.barkT -= dt;
      if (u.iconT > 0) u.iconT -= dt;
      u.vx = 0; u.vy = 0; u.kx *= Math.pow(0.02, dt); u.ky *= Math.pow(0.02, dt);
      if (I.knock) {
        const k = I.knock, step = Math.min(dt, k.t);
        u.x += k.vx * step; u.y += k.vy * step; u.kx = k.vx; u.ky = k.vy; k.t -= dt;
        if (k.t <= 0) I.knock = null;
      }
      if (I.mv) {
        const m = I.mv, p = m.pts[0];
        const dx = p[0] - u.x, dy = p[1] - u.y, d = Math.hypot(dx, dy);
        const step = m.speed * dt;
        if (d <= step || d < 1e-4) {
          u.x = p[0]; u.y = p[1]; m.pts.shift();
          if (!m.pts.length) { I.mv = null; if (!I.ts) u.state = I.base; }
        } else {
          u.x += (dx / d) * step; u.y += (dy / d) * step;
          u.vx = (dx / d) * m.speed; u.vy = (dy / d) * m.speed;
          u.walk += m.speed * dt * 2.4;
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
      if (u && a.knock) { const t = a.knockT || 0.25; I.knock = { vx: a.knock[0] / t, vy: a.knock[1] / t, t }; }
      if (u && a.say) { u.bark = a.say === '$' ? lineText() : a.say; u.barkT = a.sayT || clamp(1.4 + u.bark.length * 0.07, 1.6, 4.2); u.barkDelay = 0; }
      if (u && a.icon) { u.icon = a.icon; u.iconT = 0.8; }
      if (u && a.flash) u.flash = 0.12;
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
    function beat(i) {
      try {
        const ls = currentLines();
        curText = String((ls[i] && ls[i].text) || '');
        const text = curText.toLowerCase();
        let k = -1;
        for (let j = played + 1; j < beats.length; j++) {
          const key = beats[j] && beats[j].line;
          if (key && text && text.indexOf(String(key).toLowerCase()) >= 0) { k = j; break; }
        }
        if (k < 0 && beats[i] && !beats[i].line && i > played) k = i;
        if (k < 0) return;
        flush();
        for (let j = played + 1; j < k; j++) runBeat(beats[j], true);
        played = k;
        runBeat(beats[k], false);
      } catch (e) { if (window.console) console.warn('stage beat failed', e); }
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
      cam.pitch = (camOut.pitch - 0.56 * k) / (1 - k);
      if (shake > 0) { cam.shake = Math.max(cam.shake, shake); shake = 0; }
      if (pendingCut && R) { try { R.cutIn(pendingCut.u, pendingCut.caption); } catch (e) { /* ignore */ } pendingCut = null; }
    }
    function post() {
      if (!V) return;
      if (R) { const hs = R.takeHitstop(); if (hs > 0) freeze = Math.max(freeze, Math.min(0.12, hs)); }
      const ctx = V.ctx, W = V.W, H = V.H;
      ctx.save();
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
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

    const handle = { match, beat, update, camera, _pre: pre, _post: post, def };
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
