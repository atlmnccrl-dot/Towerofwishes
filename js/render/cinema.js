/*
 * Tower of Wishes — the cinema: story cutscenes as filmed shots (2026-10-22).
 *
 * Separate from the fight renderer. A scene is a small 3D world seen through a real camera:
 * x is east, y is height (metres, up), z is north (depth). The camera stands at (cam.x, cam.y,
 * cam.z), turned by yaw (0 looks north along +z, positive turns right toward +x) and pitch
 * (positive looks up). A point d metres ahead of the lens appears at
 *   sx = W/2 + right * F/d,   sy = H*0.42 - up * F/d + tilt*H  (the horizon sits high: subtitles own the bottom third)
 * so near things are big and move fast, far things small and slow (true parallax).
 * A shot may ride an actor's eyes (pov): the camera is that actor, for first-person shots.
 *
 * Painted sets (js/cinema/sets.js) draw the sky, far layers (cached), and near geometry
 * (roofs, the square) each frame. Actors are the author's pixel characters (js/sprites.js) in
 * their side, front and back views. Effects are the pack effects (js/render/pixelfx.js),
 * placed in the same space. Scenes (js/cinema/*.js) are written as shot lists per line.
 *
 * Pixel mode: def.pixel / set.pixel = the buffer height in pixels (default 200; 0 = full resolution).
 * API (main.js): NS.cinema.start(def) -> { beat(i, n), update(dt), draw(), ready(), busy() }
 *
 * Scene def: { set, actors: [{ id, set, x, y, z, dir, anim, hidden }], crowd, grade,
 *   beats: [{ cam, do: [actions] }]  (one per dialogue line, by position) }
 * Camera shot: { x, y, z, yaw, pitch, tilt, track: id, dx, dy, dz, pov: id, eye, ease (s), cut,
 *   F (focal, x H) }. Actor dir is a world compass dir (N = +z); the sprite view turns with yaw.
 * Actions ({ at } seconds into the beat): who + to:[x,y?,z?] (speed or dur, anim), leap:
 *   { to:[x,y,z?], h, dur }, dir, anim, show, hide, cam (a shot), slow: [k, s], flash: [rgb, s],
 *   fade: [alpha, s, rgb], pfx: { name, x, y, z, scale, add, mul, life, follow }, shake,
 *   attach: { to, dx, dy, dz } (ride along with another actor: a catch) / detach, ring: { r, col, dur }
 *   (a glyph flaring on the surface under the actor), debris: { n, w, col, floor } (tiles thrown up),
 *   sfx: name | [names] (a fight sound, js/audio.js), vol
 * Beat option cont: true carries on the previous beat's action instead of starting a new one.
 *   pose: 'kneel' | 'lie' | 'collapse' | 'reach' | 'cast' | 'flinch' | 'brace' | null (a held frame),
 *   vars: { name: [value, s] } (eases a value the set reads as view.vars.name: a spell's glow...)
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const lerp = (a, b, k) => a + (b - a) * k;
  const HORIZON = 0.42;
  // Held poses for cutscenes, made from frames of the creator's clips (it has no sit, kneel or
  // lie clips): name -> [animation, frame ('last' = the final frame)].
  const POSES = {
    kneel: ['crouch', 0], lie: ['ko', 'last'], collapse: ['down', 5], reach: ['point', 3],
    cast: ['heavy', 3], flinch: ['hit', 1], brace: ['crouch', 4],
  };

  function start(def) {
    const canvas = document.getElementById('arena');
    const out = canvas.getContext('2d');
    // The scene is drawn into a buffer and scaled up onto the screen. In pixel mode (the default)
    // the buffer is only PIXEL_H pixels tall and scales up without smoothing, so the sets, the
    // light and the effects share one pixel grid with the characters' pixel art.
    const Sp = window.TowSprites;
    const SETS = window.TowCinemaSets || {};
    const set = SETS[def.set] || null;
    const PIXEL_H = def.pixel != null ? def.pixel : set && set.pixel != null ? set.pixel : 200;
    const buf = document.createElement('canvas');
    const ctx = buf.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    // ---- camera
    const cam = { x: 0, y: 1.6, z: -6, tilt: 0, F: 1.0, yaw: 0, pitch: 0 };
    const NEAR = 0.2;
    let from = Object.assign({}, cam), shot = null, shotT = 0, shake = 0;
    const F = () => H * cam.F;
    let cy = 1, sy = 0, cp = 1, sp = 0, jx = 0, jy = 0; // per-frame trig and shake jitter
    function toCam(x, y, z) {
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
      return [rx, dy * cp - rz * sp, dy * sp + rz * cp];
    }
    function scr(c) { const s = F() / c[2]; return { x: W / 2 + c[0] * s + jx, y: H * HORIZON - c[1] * s + cam.tilt * H + jy, s, d: c[2] }; }
    function project(x, y, z) {
      const c = toCam(x, y, z);
      return c[2] < 0.25 ? null : scr(c);
    }
    // a world polygon added to the current path (for batching many into one fill)
    function addPoly(pts) {
      let C = pts.map((p) => toCam(p[0], p[1], p[2]));
      if (C.some((c) => c[2] < NEAR)) {
        const out = [];
        for (let i = 0; i < C.length; i++) {
          const a = C[i], b = C[(i + 1) % C.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
          if (ia) out.push(a);
          if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
        }
        if (out.length < 3) return false;
        C = out;
      }
      C.forEach((c, i) => { const p = scr(c); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.closePath();
      return true;
    }
    // a world polygon, clipped at the lens, filled and/or stroked; returns the screen points
    function poly(pts, fill, stroke, lw) {
      let C = pts.map((p) => toCam(p[0], p[1], p[2]));
      if (C.some((c) => c[2] < NEAR)) {
        const out = [];
        for (let i = 0; i < C.length; i++) {
          const a = C[i], b = C[(i + 1) % C.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
          if (ia) out.push(a);
          if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
        }
        if (out.length < 3) return null;
        C = out;
      }
      const P = C.map(scr);
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
      return P;
    }
    // a face of a solid, drawn only when it faces the lens (n: its outward normal)
    function face(pts, n, fill, stroke, lw) {
      const p = pts[0];
      if ((cam.x - p[0]) * n[0] + (cam.y - p[1]) * n[1] + (cam.z - p[2]) * n[2] <= 0) return null;
      return poly(pts, fill, stroke, lw);
    }
    // the nearest distance from the lens to a box [x0, x1, y0, y1, z0, z1] (painter's order)
    function boxDist(b) {
      const cl = (v, a, c) => (v < a ? a : v > c ? c : v);
      return Math.hypot(cl(cam.x, b[0], b[1]) - cam.x, cl(cam.y, b[2], b[3]) - cam.y, cl(cam.z, b[4], b[5]) - cam.z);
    }
    // world compass dir -> the sprite view as the camera sees it
    const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    function viewDir(d) {
      const i = DIRS.indexOf(d);
      if (i < 0) return d;
      const k = Math.round(cam.yaw / (Math.PI / 4));
      return DIRS[(((i - k) % 8) + 8) % 8];
    }
    // ---- actors
    const actors = new Map();
    for (const a of def.actors || []) actors.set(a.id, Object.assign({ x: 0, y: 0, z: 0, dir: 'E', anim: 'idle', hidden: false, mv: null, leap: null, A: null, man: null, scale: 1 }, a));
    for (const a of actors.values()) if (Sp && Sp.loadPixel) Sp.loadPixel(a.set);
    // ---- the crowd: townsfolk crossing at several depths, wrapping round
    const crowd = [];
    if (def.crowd) {
      const C = def.crowd;
      let seed = 1234;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < C.n; i++) {
        const z = C.z[0] + rnd() * (C.z[1] - C.z[0]), right = rnd() < 0.5;
        const p = { id: 'crowd' + i, set: C.sets[i % C.sets.length], x: C.x[0] + rnd() * (C.x[1] - C.x[0]), y: C.y || 0, z, dir: right ? 'E' : 'W', anim: rnd() < C.still ? 'idle' : 'walk', speed: (0.7 + rnd() * 0.6) * (right ? 1 : -1), hidden: false, crowd: true, scale: 0.95 + rnd() * 0.1 };
        if (p.anim === 'idle') { p.speed = 0; p.dir = ['E', 'W', 'SE', 'SW', 'S'][Math.floor(rnd() * 5)]; }
        crowd.push(p);
        if (Sp && Sp.loadPixel) Sp.loadPixel(p.set);
      }
    }
    // ---- effects in the same space (pixelfx through a camera adapter)
    // (the effect's size follows the depth of the point it was last placed at)
    const FXV = { ctx, time: 0, P: (x, z, y) => { const p = project(x, y || 0, z); if (p) FXV.cam.sc = p.s; return p || { x: -9999, y: -9999, d: 0 }; }, cam: { sc: 60, pitch: 0.3 } };
    const PX = NS.pixelfx ? NS.pixelfx.create(FXV) : null;
    // ---- values the set draws from (def.vars), eased by the beats
    const vars = Object.assign({}, def.vars || {}), tweens = {};
    // ---- timeline
    const rings = [], bits = []; // glyph rings flashing on a surface; falling tile debris
    let clock = 0, beatT = 0, queue = [], slow = { k: 1, t: 0 }, flash = { a: 0, col: '255,255,255', dur: 0.2 };
    const fade = { a: def.fadeIn === false ? 0 : 1, from: 1, to: 0, t: 0, dur: def.fadeIn === false ? 0 : 1.1, col: '0,0,0' };
    function setShot(sh) {
      if (!sh) return;
      from = Object.assign({}, cam);
      shot = Object.assign({}, sh); shotT = 0;
      if (sh.cut) { const tg = target(shot, 0); Object.assign(cam, tg); from = Object.assign({}, cam); }
    }
    function target(sh, t) {
      let x = sh.x != null ? sh.x : cam.x, y = sh.y != null ? sh.y : cam.y;
      let z = sh.z != null ? sh.z + (sh.vz || 0) * t : cam.z;
      const a = actors.get(sh.pov || sh.track);
      if (a && sh.pov) {
        // the actor's own eyes, a step ahead of the body, bobbing with the stride
        const bob = a.anim === 'run' && !a.leap ? Math.sin(clock * 15) * 0.05 : 0;
        x = a.x + Math.sin(cam.yaw) * 0.25; y = a.y + (sh.eye || 1.55) + bob; z = a.z + Math.cos(cam.yaw) * 0.25;
      } else if (a) {
        x = a.x + (sh.dx || 0); if (sh.y == null) y = a.y + (sh.dy != null ? sh.dy : 1.1);
        if (sh.dz != null) z = a.z + sh.dz;
      }
      if (sh.vx) x += sh.vx * t;
      if (sh.vy) y += sh.vy * t;
      return { x, y, z, tilt: sh.tilt != null ? sh.tilt : 0, F: sh.F != null ? sh.F : 1.0, yaw: sh.yaw != null ? sh.yaw : 0, pitch: sh.pitch != null ? sh.pitch : 0 };
    }
    function act(a) {
      const u = a.who ? actors.get(a.who) : null;
      if (a.cam) setShot(a.cam);
      if (a.slow) slow = { k: a.slow[0], t: a.slow[1] };
      if (a.flash) flash = { a: 1, col: a.flash[0] || '255,255,255', dur: a.flash[1] || 0.25 };
      if (a.fade) Object.assign(fade, { from: fade.a, to: a.fade[0], t: 0, dur: a.fade[1] || 0.6, col: a.fade[2] || fade.col });
      if (a.shake) shake = Math.max(shake, a.shake);
      if (a.sfx && window.TowAudio && window.TowAudio.sfx) for (const n of [].concat(a.sfx)) window.TowAudio.sfx(n, a.vol == null ? 0.7 : a.vol);
      if (a.vars) for (const [k, v] of Object.entries(a.vars)) { const [to, dur] = [].concat(v); tweens[k] = { from: vars[k] || 0, to, t: 0, dur: dur || 0 }; if (!dur) vars[k] = to; }
      if (a.pfx && PX) for (const p of [].concat(a.pfx)) {
        const x = p.x != null ? p.x : u ? u.x : cam.x, y = p.y != null ? p.y : u ? u.y : 0, z = p.z != null ? p.z : u ? u.z : 0;
        PX.spawn(p.name, x, z, y + (p.h || 0), Object.assign({ scale: p.scale || 1.5, life: p.life || 1.4 }, p.add ? { add: true } : {}, p.mul ? { mul: true } : {}, p.ground ? { ground: true } : {}, p.delay ? { delay: p.delay } : {})); // (looping effects need a life, or they stay)
      }
      if (a.ring) rings.push(Object.assign({ t: 0, dur: 0.9, r: 1.2, col: '190,150,255' }, a.ring, u && a.ring.x == null ? { x: u.x, y: u.y + 0.05, z: u.z } : {}));
      if (a.debris) {
        const D = a.debris, n = D.n || 8;
        for (let k = 0; k < n; k++) bits.push({ x: (D.x != null ? D.x : u ? u.x : 0) + (Math.random() - 0.5) * (D.w || 1.5), y: (D.y != null ? D.y : u ? u.y : 0) + 0.1, z: (D.z != null ? D.z : u ? u.z : 0) + (Math.random() - 0.5) * (D.w || 1.5),
          vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, vz: (D.vz || 0) + (Math.random() - 0.5) * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: D.s || 0.12 + Math.random() * 0.14, col: D.col || '#8a4a3a', floor: D.floor != null ? D.floor : 0 });
      }
      if (!u) return;
      if (a.attach) { const T = actors.get(a.attach.to); if (T) { u.attach = Object.assign({ dx: 0.2, dy: 0.3, dz: 0.1 }, a.attach); u.mv = null; u.leap = null; } }
      if (a.detach) { u.attach = null; if (a.put == null) u.y = Math.max(0, u.y); }
      if (a.show) u.hidden = false;
      if (a.hide) u.hidden = true;
      if (a.put) { u.x = a.put[0]; if (a.put[1] != null) u.y = a.put[1]; if (a.put[2] != null) u.z = a.put[2]; u.mv = null; }
      if (a.dir) u.dir = a.dir;
      if (a.anim) { if (u.A && u.A.cur === a.anim) u.A.cur = null; u.anim = a.anim; u.pose = null; } // (the same clip again restarts it)
      if (a.pose !== undefined) u.pose = a.pose || null;
      if (a.to) {
        const tx = a.to[0], ty = a.to[1] != null ? a.to[1] : u.y, tz = a.to[2] != null ? a.to[2] : u.z;
        const dist = Math.hypot(tx - u.x, tz - u.z);
        const dur = a.dur || dist / (a.speed || 1.4);
        u.mv = { x0: u.x, y0: u.y, z0: u.z, x1: tx, y1: ty, z1: tz, t: 0, dur: Math.max(0.05, dur), anim: a.anim || (a.speed > 3 ? 'run' : 'walk'), after: a.then || 'idle', ease: a.ease };
        u.anim = u.mv.anim;
        if (!a.dir) u.dir = Math.abs(tz - u.z) > Math.abs(tx - u.x) ? (tz < u.z ? 'S' : 'N') : tx >= u.x ? 'E' : 'W';
      }
      if (a.leap) {
        const L = a.leap;
        u.leap = { x0: u.x, y0: u.y, z0: u.z, x1: L.to[0], y1: L.to[1] != null ? L.to[1] : u.y, z1: L.to[2] != null ? L.to[2] : u.z, h: L.h || 1.2, t: 0, dur: L.dur || 0.7, after: L.then || 'run' };
        u.mv = null; u.anim = 'run';
      }
    }
    // A beat marked cont carries on the previous beat's action (its subtitles ride on it): its own
    // actions join the running timeline, at seconds from that beat's start.
    const cont = (i) => !!((def.beats || [])[i] && def.beats[i].cont);
    function beat(i) {
      const B = (def.beats || [])[i];
      if (B && B.cont) {
        if (B.cam) setShot(B.cam);
        for (const a of B.do || []) queue.push(Object.assign({}, a, { at: beatT + (a.at || 0) }));
        queue.sort((p, q) => p.at - q.at);
        return;
      }
      beatT = 0; queue = [];
      if (!B) return;
      if (B.cam) setShot(B.cam);
      for (const a of B.do || []) { if (!(a.at > 0)) act(a); else queue.push(a); }
      queue.sort((p, q) => p.at - q.at);
    }
    // ---- per frame
    function update(dtReal) {
      let dt = dtReal;
      if (slow.t > 0) { slow.t -= dtReal; dt *= slow.k; }
      clock += dt; beatT += dt; FXV.time = clock;
      if (PX) PX.step(dt); // effects age with the film (and with a seek), not with the frames drawn
      while (queue.length && queue[0].at <= beatT) act(queue.shift());
      // camera
      if (shot) {
        shotT += dt;
        const k = shot.cut ? 1 : smooth(shotT / Math.max(0.01, shot.ease == null ? 1.2 : shot.ease));
        const tg = target(shot, shotT);
        // a held shot keeps breathing a little
        const br = shot.still ? 0 : 1;
        cam.x = lerp(from.x, tg.x, k) + br * Math.sin(clock * 0.31) * 0.03;
        cam.y = lerp(from.y, tg.y, k) + br * Math.cos(clock * 0.23) * 0.02;
        cam.z = lerp(from.z, tg.z, k); cam.tilt = lerp(from.tilt, tg.tilt, k); cam.F = lerp(from.F, tg.F, k);
        cam.yaw = lerp(from.yaw, tg.yaw, k); cam.pitch = lerp(from.pitch, tg.pitch, k);
        if (shot.pov) { cam.x = tg.x; cam.y = tg.y; cam.z = tg.z; } // the eyes go where the body goes
        if (shot.cut) from = Object.assign({}, tg, { x: cam.x, y: cam.y });
      }
      shake *= Math.pow(0.02, dtReal);
      for (const [k, w] of Object.entries(tweens)) { w.t += dt; vars[k] = w.dur ? lerp(w.from, w.to, smooth(w.t / w.dur)) : w.to; if (w.t >= w.dur) delete tweens[k]; }
      if (flash.a > 0) flash.a = Math.max(0, flash.a - dtReal / flash.dur);
      if (fade.dur > 0) { fade.t += dtReal; fade.a = lerp(fade.from, fade.to, smooth(fade.t / fade.dur)); if (fade.t >= fade.dur) { fade.a = fade.to; fade.dur = 0; } }
      // actors
      for (const u of actors.values()) {
        if (u.mv) {
          const m = u.mv; m.t += dt;
          const k = m.ease ? smooth(m.t / m.dur) : Math.min(1, m.t / m.dur);
          u.x = lerp(m.x0, m.x1, k); u.y = lerp(m.y0, m.y1, k); u.z = lerp(m.z0, m.z1, k);
          if (k >= 1) { u.mv = null; u.anim = m.after; }
        }
        if (u.leap) {
          const L = u.leap; L.t += dt;
          const k = Math.min(1, L.t / L.dur);
          u.x = lerp(L.x0, L.x1, k); u.z = lerp(L.z0, L.z1, k); u.y = lerp(L.y0, L.y1, k) + Math.sin(k * Math.PI) * L.h;
          if (k >= 1) { u.leap = null; u.anim = L.after; if (L.after === 'run' && !u.mv) u.anim = 'idle'; }
        }
      }
      // carried actors ride along with their carrier
      for (const u of actors.values()) if (u.attach) { const T = actors.get(u.attach.to); if (T) { u.x = T.x + u.attach.dx; u.y = T.y + u.attach.dy; u.z = T.z + u.attach.dz; } }
      for (const r of rings) r.t += dt;
      for (let i = rings.length - 1; i >= 0; i--) if (rings[i].t > rings[i].dur) rings.splice(i, 1);
      for (const b of bits) { if (b.dead) continue; b.vy -= 18 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rot += b.vr * dt; if (b.y < b.floor) { b.dead = true; } }
      for (let i = bits.length - 1; i >= 0; i--) if (bits[i].dead) bits.splice(i, 1);
      for (const p of crowd) {
        if (!p.speed) continue;
        p.x += p.speed * dt;
        const C = def.crowd;
        if (p.x > C.x[1]) p.x = C.x[0]; else if (p.x < C.x[0]) p.x = C.x[1];
      }
    }
    // ---- drawing
    function drawActor(u, dt) {
      if (u.hidden || (shot && shot.pov === u.id)) return;
      const man = Sp && Sp.get && Sp.get('px:' + u.set);
      if (!man || !man.ready) return;
      if (!u.A || u.A.man !== man) { u.A = Sp.animator(man); }
      const P = u.pose && !u.mv && !u.leap ? POSES[u.pose] : null;
      if (P && man.animations[P[0]]) {
        // hold one frame of a clip as a pose
        const an = man.animations[P[0]], fl = Object.values(an.frames)[0] || [];
        const fi = P[1] === 'last' ? fl.length - 1 : Math.min(fl.length - 1, P[1]);
        if (u.A.cur !== P[0]) Sp.play(u.A, P[0], { blend: 0.15 });
        Sp.advance(u.A, dt); u.A.t = (fi + 0.5) / (an.fps || 12);
      } else {
        const name = man.animations[u.anim] ? u.anim : man.animations.idle ? 'idle' : Object.keys(man.animations)[0];
        Sp.play(u.A, name, { blend: 0.1 });
        Sp.advance(u.A, dt * (u.mv && u.mv.anim === 'run' ? 1.15 : 1));
      }
      const p = project(u.x, u.y, u.z);
      if (!p) return;
      const hpx = 1.78 * 0.9 * p.s * (man.scale || 1) * (u.scale || 1);
      if (hpx < 4) return;
      // contact shadow on the surface under the actor
      const g = project(u.x, u.ground != null ? u.ground : (u.leap ? Math.min(u.leap.y0, u.leap.y1) : u.y), u.z);
      if (g && !u.noShadow && !u.leap) { ctx.fillStyle = 'rgba(8,6,10,0.35)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, hpx * 0.28, hpx * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
      let look = set && set.look ? set.look(u, vars) : null;
      if (look && PIXEL_H) look = Object.assign({}, look, { ink: Math.min(look.ink || 1, hpx > 70 ? 1 : 0.6) });
      for (const smp of Sp.sample(u.A, viewDir(u.dir))) Sp.drawFrame(ctx, man, smp, p.x, p.y, hpx, look || { ink: Math.max(1, Math.min(3, hpx / 45)) });
    }
    // a glyph ring flat on the surface: two circles and rune ticks, flaring and fading
    function drawRings() {
      for (const r of rings) {
        const k = r.t / r.dur, a = (1 - k) * (k < 0.15 ? k / 0.15 : 1), R = r.r * (0.6 + 0.6 * Math.min(1, k * 3));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
        for (const [rr, al] of [[R, 1], [R * 0.66, 0.8]]) {
          ctx.strokeStyle = `rgba(${r.col},${(a * al).toFixed(3)})`; ctx.beginPath();
          for (let j = 0; j <= 40; j++) { const t = (j / 40) * Math.PI * 2, p = project(r.x + Math.cos(t) * rr, r.y, r.z + Math.sin(t) * rr); if (!p) continue; if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
          ctx.stroke();
        }
        ctx.beginPath();
        for (let j = 0; j < 12; j++) { const t = (j / 12) * Math.PI * 2 + k, p0 = project(r.x + Math.cos(t) * R * 0.7, r.y, r.z + Math.sin(t) * R * 0.7), p1 = project(r.x + Math.cos(t) * R * 0.95, r.y, r.z + Math.sin(t) * R * 0.95); if (p0 && p1) { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); } }
        ctx.stroke();
        const c = project(r.x, r.y, r.z);
        if (c) { const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * c.s); g.addColorStop(0, `rgba(${r.col},${(0.5 * a).toFixed(3)})`); g.addColorStop(1, `rgba(${r.col},0)`); ctx.fillStyle = g; ctx.fillRect(c.x - R * c.s, c.y - R * c.s, R * c.s * 2, R * c.s * 2); }
        ctx.restore();
      }
    }
    function drawBits() {
      for (const b of bits) { const p = project(b.x, b.y, b.z); if (!p) continue; const sz = Math.max(1, b.s * p.s); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(b.rot); ctx.fillStyle = b.col; ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2); ctx.restore(); }
    }
    let lastT = 0;
    function draw() {
      const now = performance.now() / 1000, dt = lastT ? Math.min(0.05, now - lastT) : 0;
      lastT = now;
      const sdpr = Math.min(window.devicePixelRatio || 1, 2), cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (canvas.width !== Math.round(cw * sdpr) || canvas.height !== Math.round(ch * sdpr)) { canvas.width = Math.round(cw * sdpr); canvas.height = Math.round(ch * sdpr); }
      if (PIXEL_H) { H = PIXEL_H; W = Math.round((cw / Math.max(1, ch)) * H); dpr = 1; }
      else { W = cw; H = ch; dpr = sdpr; }
      if (buf.width !== Math.round(W * dpr) || buf.height !== Math.round(H * dpr)) { buf.width = Math.round(W * dpr); buf.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = !PIXEL_H;
      cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch);
      jx = (Math.random() - 0.5) * shake; jy = (Math.random() - 0.5) * shake;
      const view = { ctx, W, H, cam, project, poly, addPoly, face, toCam, vars, t: clock, dpr, hz: H * HORIZON + cam.tilt * H + Math.tan(cam.pitch) * F() };
      if (set) set.back(view); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      // the actors and the set's near pieces, back to front
      // Painter's order: solids by their nearest point, others by distance; whatever stands on
      // a solid (an actor on a roof, a chimney) is drawn right after it.
      const items = [], solids = [];
      const dist = (x, y, z) => Math.hypot(x - cam.x, y - cam.y, z - cam.z);
      if (set && set.pieces) for (const pc of set.pieces(view)) {
        if (pc.box) { pc.k = pc.k2 = boxDist(pc.box); solids.push(pc); }
        else if (pc.p) pc.k = pc.k2 = dist(pc.p[0], pc.p[1], pc.p[2]);
        else pc.k = pc.k2 = pc.d - cam.z;
        items.push(pc);
      }
      const onTop = (x, y, z) => { for (const b of solids) { const B = b.box; if (x >= B[0] && x <= B[1] && z >= B[4] && z <= B[5] && Math.abs(y - B[3]) < 0.35) return b; } return null; };
      for (const pc of items) if (pc.p && pc.on !== false && solids.length) { const b = onTop(pc.p[0], pc.p[1], pc.p[2]); if (b) pc.k = b.k - 1e-3; }
      for (const u of [...actors.values(), ...crowd]) {
        const k2 = solids.length ? dist(u.x, u.y + 0.9, u.z) : u.z - cam.z, b = solids.length ? onTop(u.x, u.y, u.z) : null;
        items.push({ k: b ? b.k - 1e-3 : k2, k2, f: () => drawActor(u, dt) });
      }
      items.sort((a, b) => b.k - a.k || b.k2 - a.k2);
      if (PX) PX.drawGround();
      for (const it of items) it.f();
      if (PX) PX.drawAbove(0);
      drawRings(); drawBits();
      if (set && set.front) set.front(view);
      // grade, vignette, flash, fade
      const G = def.grade || (set && set.grade);
      if (G) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(${G[0]},${G[1]},${G[2]},${G[3]})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      const vg = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (flash.a > 0) { ctx.fillStyle = `rgba(${flash.col},${flash.a})`; ctx.fillRect(0, 0, W, H); }
      if (fade.a > 0.001) { ctx.fillStyle = `rgba(${fade.col},${fade.a})`; ctx.fillRect(0, 0, W, H); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.imageSmoothingEnabled = !PIXEL_H;
      out.drawImage(buf, 0, 0, canvas.width, canvas.height);
    }
    // Is the current line's action still playing (queued moves, walks, leaps, slow motion, a camera move)?
    function busy() {
      if (queue.length || slow.t > 0) return true;
      for (const u of actors.values()) if (u.mv || u.leap) return true;
      // (a short camera move counts; a long slow drift is mood, and the next line may cut in on it)
      const e = shot && shot.ease == null ? 1.2 : shot ? shot.ease : 0;
      return !!(shot && !shot.cut && !shot.pov && !shot.track && e <= 3 && shotT < e * 0.8);
    }
    function ready() {
      if (!Sp || !Sp.get) return true;
      const all = [...actors.values(), ...crowd];
      return all.every((u) => { const m = Sp.get('px:' + u.set); return m && m.ready; });
    }
    if (def.cam) setShot(Object.assign({}, def.cam, { cut: true }));
    return { beat, update, draw, ready, busy, cont, def, actors, cam };
  }

  NS.cinema = { start };
})();
