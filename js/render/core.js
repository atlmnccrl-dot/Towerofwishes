/*
 * Tower of Wishes — renderer core
 *
 * Owns the canvas, the camera, projection and the frame order. The look of
 * each layer lives in its own module so it can be worked on separately:
 *
 *   world.js     ground, trees, rocks, trunk, light and atmosphere
 *   fighters.js  character bodies, hair, cloth, poses
 *   fx.js        telegraphs, slashes, particles, impact frames, heavy-art cutscenes, banners
 *   callouts.js  in-world UI: health ticks, reaction icons, speech balloons
 *   intro.js     pre-match face-off, countdown
 *   director.js  camera cuts, slow motion and cut-in panels during the fight
 *
 * Every module is `create(V)` where V is the shared view below. Modules read
 * sim state only; they never change it.
 */
(function () {
  'use strict';
  const Sim = window.TowSim;
  const NS = (window.TowRender = window.TowRender || {});

  // Palette sampled from the approved style reference (dark manhwa: charcoal
  // and mauve greys, bone highlights, one crimson accent). See docs/ART_DIRECTION.md.
  const PAL = {
    ink: '#0c0808', night: '#161212', charcoal: '#1d1718', slate: '#2d292b', ash: '#3d3337',
    dusk: '#4f4449', mauve: '#6e5353', rose: '#997d7b', bone: '#edcac0', white: '#f6f0ec',
    crimson: '#8e1621', blood: '#43171b', glow: '#e3263a',
    hero: '#9cc3dd', heroGlow: '#d9f0ff', enemy: '#e3263a', guest: '#b9a6ff', glyph: '#a98bff',
  };
  const FONT = {
    display: '"Shippori Mincho", "Hiragino Mincho ProN", Georgia, serif',
    ui: '"M PLUS 1p", "Hiragino Sans", "Segoe UI", system-ui, sans-serif',
  };

  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    const V = {
      Sim, PAL, FONT, ctx, canvas,
      W: 0, H: 0, dpr: 1, time: 0,
      HELI: { ang: -0.32, pitch: 0.74 },
      cam: { x: 0, y: 0, sc: 40, ang: -0.32, pitch: 0.74, shake: 0, time: 0, horizon: 0.56, ax: 0.5, ay: 0, lift: 0, kx: 0, ky: 0 },
      rng: Sim.makeRng(7),
      // Light comes from the upper left of the screen. sx/sy: unit vector toward
      // the light in screen space, used for cel shading and rim light.
      light: { ang: -2.3, elev: 0.9, sx: -0.55, sy: -0.835 },
      // Requested slow motion (director): factor and seconds remaining.
      slowmo: { k: 1, t: 0 },
      stats: { drawMs: 0 },
    };

    // World (metres) -> screen (CSS px). d is depth: larger = nearer the camera.
    V.P = function P(x, y, z) {
      const cam = V.cam;
      const dx = x - cam.x, dy = y - cam.y;
      const c = Math.cos(cam.ang), s = Math.sin(cam.ang);
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      // cam.cx / cam.cy let a cutscene panel centre the view on its own box.
      // Otherwise the camera point sits at (ax, horizon + ay) of the screen,
      // lifted by `lift` metres: heavy-art shots use it to put the caster's
      // chest on a third of the frame instead of their feet at the centre.
      const ox = cam.cx != null ? cam.cx : V.W * cam.ax;
      const oy = cam.cy != null ? cam.cy : V.H * (cam.horizon + cam.ay) + cam.lift * cam.sc * 0.9;
      return { x: ox + rx * cam.sc, y: oy + ry * cam.sc * cam.pitch - (z || 0) * cam.sc * 0.9, d: ry };
    };

    V.shadow = function shadow(x, y, r, a) {
      const p = V.P(x, y, 0);
      ctx.fillStyle = `rgba(6,4,6,${a == null ? 0.35 : a})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * V.cam.sc, r * V.cam.sc * V.cam.pitch, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    V.roundRect = function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };

    const world = NS.world.create(V);
    const fighters = NS.fighters.create(V);
    const fx = NS.fx.create(V);
    V.fxApi = fx; // shared drawing helpers (panels, portraits) for intro and director
    const callouts = NS.callouts.create(V);
    const intro = NS.intro.create(V);
    const director = NS.director.create(V, fx);

    function resize() {
      V.dpr = Math.min(window.devicePixelRatio || 1, 2);
      V.W = canvas.clientWidth; V.H = canvas.clientHeight;
      canvas.width = Math.round(V.W * V.dpr); canvas.height = Math.round(V.H * V.dpr);
      if (world.resize) world.resize();
      if (fx.resize) fx.resize();
    }

    // ------------------------------------------------------------ heavy-art camera
    // An anime ability shot: close on the caster while they charge (face and
    // upper body on a third of the frame, seen from the side nothing stands
    // in front of), a glint on the face, the release followed side-on (or
    // over the shoulder down a lance), the blow landing on the targets, and a
    // last look at the caster under the move's name.
    //
    // A view is `th`, the world angle from the subject toward the camera
    // (camera angle = PI/2 - th). A fighter facing f is seen from
    // delta = th - f; sin(delta) > 0 means they face screen-right.
    const OCC_H = { tree: 6, pillar: 3.2, wall: 2.2, cart: 1.4, crate: 1.0, basin: 0.7, rock: 0.9, trunk: 0.9 };
    function heightOf(u) { const L = NS.fighters.LOOK[u.key]; return 1.72 * (L ? L.h : 1); }
    // How much of a fighter's upper body at (x, y) is hidden, seen from th,
    // by other fighters and the arena's obstacles (0 = clear).
    function occlusion(s, u, x, y, th, pitch) {
      const vx = Math.cos(th), vy = Math.sin(th), h = heightOf(u);
      let bad = 0;
      const test = (ox, oy, r, oh) => {
        const dx = ox - x, dy = oy - y;
        const dv = dx * vx + dy * vy; // toward the camera
        if (dv < 0.15) return;
        const lat = Math.abs(dy * vx - dx * vy), reach = r + u.r + 0.5;
        if (lat > reach) return;
        // On screen the occluder stands lower by its depth: how far up the
        // caster's body does its top reach?
        const top = oh - (dv * pitch) / 0.9;
        const cover = Math.min(1, (top - h * 0.3) / (h * 0.5));
        if (cover > 0) bad += cover * (1 - (lat / reach) * 0.6);
      };
      for (const o of s.units) if (o !== u && !o.fled) test(o.x, o.y, o.r, o.state === 'out' ? 0.4 : heightOf(o));
      const obs = (s.arena && s.arena.obstacles) || [];
      for (const o of obs) {
        const oh = OCC_H[o.kind] || 1.2;
        if (o.kind === 'trunk') for (let i = 0; i <= 8; i++) test(o.ax + ((o.bx - o.ax) * i) / 8, o.ay + ((o.by - o.ay) * i) / 8, o.r, oh);
        else test(o.x, o.y, o.r, oh);
      }
      return bad;
    }
    // The clearest of a list of view offsets from the facing; earlier
    // entries win ties.
    function bestView(s, u, x, y, f, deltas, pitch) {
      let best = null;
      deltas.forEach((d, i) => {
        const score = occlusion(s, u, x, y, f + d, pitch) + i * 0.04;
        if (!best || score < best.score) best = { d, score };
      });
      return best.d;
    }
    // Opponents the heavy art lands on (the sim's own test, a little wider).
    function victims(s, c) {
      const u = c.unit, H = Sim.heavyOf(u), out = [];
      const ox = c.line ? c.x0 : u.x, oy = c.line ? c.y0 : u.y;
      for (const o of s.units) {
        if (o.team === u.team || o.fled || (o.state === 'out' && !c.applied)) continue;
        const d = Math.hypot(o.x - ox, o.y - oy);
        let da = Math.atan2(o.y - oy, o.x - ox) - u.facing;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (d <= H.radius + (c.applied ? 2.5 : 0.3) && Math.abs(da) <= H.arc / 2 + 0.15) out.push(o);
      }
      return out;
    }
    const cutPlans = new WeakMap();
    const LAND = 0.45; // seconds on the targets after the impact frame
    const CHARGE_D = [0.75, -0.75, 1.0, -1.0, 0.5, -0.5, 1.3, -1.3, 1.6, -1.6];
    // Line heavies build a lattice in front of the caster: see them nearer
    // profile so it reaches into the open side of the frame, not over them.
    const CHARGE_LINE = [1.15, -1.15, 1.35, -1.35, 0.95, -0.95, 1.55, -1.55];
    function cutShot(s, c) {
      const u = c.unit, f = u.facing, F = [Math.cos(f), Math.sin(f)];
      const W = V.W, H = V.H, h = heightOf(u), t = c.t, m = Math.min(W, H);
      let plan = cutPlans.get(c);
      if (!plan) {
        // Pick the side once, from the clearest front three-quarter view;
        // later shots stay on that side so the action keeps its direction.
        const d = bestView(s, u, c.x0, c.y0, f, c.line ? CHARGE_LINE : CHARGE_D, 0.34);
        const side = Math.sin(d) >= 0 ? 1 : -1;
        let far = 2.4;
        for (const o of victims(s, c)) far = Math.max(far, Math.hypot(o.x - c.x0, o.y - c.y0));
        plan = { d, side, far };
        plan.dash = bestView(s, u, c.x0 + F[0] * 1.2, c.y0 + F[1] * 1.2, f, [side * 1.3, side * 1.05, side * 1.5, side * 0.85], 0.44);
        cutPlans.set(c, plan);
      }
      const ph = fx.cutPhase(c), side = plan.side;
      const third = (d) => (Math.sin(d) >= 0 ? 0.36 : 0.64);
      const shot = (key, x, y, th, scale, pitch, ax, ay, lift, focus, dim) => ({ key, x, y, ang: Math.PI / 2 - th, sc: scale, pitch, ax, ay, lift, focus, dim });
      if (c.legion && ph !== 'after') {
        // The Legion needs room: the rift behind the caster, the giants striding out over the targets.
        const k = Math.min(1, t / 1.1), bx = u.x - F[0] * 0.8, by = u.y - F[1] * 0.8;
        if (ph === 'charge') return shot('charge', bx, by, f + plan.d, m / (4.6 - 0.5 * k), 0.4, 0.5, 0.6, h * 1.3, false, 0.1 + 0.25 * k);
        if (ph === 'gleam') return shot('gleam', bx, by, f + plan.d * 0.9, m / 3.6, 0.38, 0.5, 0.6, h * 1.4, false, 0.3);
        const span = Math.min(plan.far, 5.5) + 3.4, scale = Math.min(m / 3.6, (W * 0.62) / span);
        return shot('release', c.x0 + F[0] * (span * 0.2), c.y0 + F[1] * (span * 0.2), f + plan.dash, scale, 0.38, 0.5, 0.66, h * 1.5, false, 0);
      }
      if (ph === 'charge') {
        // Low and close, pushing in on a slow orbit; chest on a third, the
        // space they face left open; the world dims around them.
        const k = Math.min(1, t / 1.1);
        const d = plan.d - side * 0.22 * (k - 0.5);
        return shot('charge', u.x, u.y, f + d, m / (4.8 - 0.6 * k), 0.36, third(d), 0.56, h * 0.62, true, 0.12 + 0.3 * k);
      }
      if (ph === 'gleam') {
        // The glint: in tight on the face.
        const d = plan.d * (c.line ? 1 : 0.85);
        return shot('gleam', u.x, u.y, f + d, m / 3.8, 0.34, third(d) < 0.5 ? 0.4 : 0.6, 0.46, h * 0.9, true, 0.45);
      }
      const sgn = Math.sin(plan.dash) >= 0 ? 1 : -1;
      if (ph === 'dash' || ph === 'impact') {
        if (c.line) {
          // Side-on: the lance leaves the caster across the frame, and the
          // camera runs with it toward the targets.
          const k = ph === 'dash' ? Math.min(1, ((t - 1.35) / Math.max(0.1, c.impactAt - 1.35)) * 1.5) : 1;
          const run = Math.max(0, plan.far - 1.5) * k * k;
          return shot('release', c.x0 + F[0] * run, c.y0 + F[1] * run, f + plan.dash, m / 5.4, 0.42, 0.5 - sgn * 0.26 * (1 - k * 0.6), 0.58, h * 0.55, k < 0.5, 0);
        }
        // Side-on: the dash crosses the screen from the caster's third.
        const span = Math.min(plan.far, 4.4) + 0.4;
        const scale = Math.max(m / 7, Math.min(m / 5.2, (W * 0.6) / (span + 1.0)));
        return shot('release', c.x0, c.y0, f + plan.dash, scale, 0.44, 0.5 - sgn * Math.min(0.3, (span * scale) / W / 2), 0.6, h * 0.5, false, 0);
      }
      // After: first the blow landing on the targets, then the caster under
      // the move's name.
      const at = t - c.impactAt - 0.12;
      if (at < LAND) {
        const vic = victims(s, c);
        let cx = 0, cy = 0;
        for (const o of vic) { cx += o.x; cy += o.y; }
        if (vic.length) { cx /= vic.length; cy /= vic.length; } else { cx = c.x0 + F[0] * 3; cy = c.y0 + F[1] * 3; }
        if (!c.line) { cx = (cx + u.x) / 2; cy = (cy + u.y) / 2; }
        return shot('land', cx, cy, f + plan.dash, m / 6.0, 0.44, 0.5, 0.5, 0.8, false, 0);
      }
      if (plan.pose == null) plan.pose = bestView(s, u, u.x, u.y, f, [0.8, 0.55, 1.1, -0.8, -0.55, -1.1], 0.38);
      const d = plan.pose + 0.15 * Math.sign(plan.pose) * Math.min(1, (at - LAND) / 0.8);
      return shot('pose', u.x, u.y, f + d, m / 4.4, 0.38, Math.sin(d) >= 0 ? 0.3 : 0.7, 0.52, h * 0.62, true, 0.15);
    }

    // ------------------------------------------------------------ camera
    function updateCamera(s, dt) {
      const cam = V.cam, W = V.W, H = V.H;
      cam.time += dt;
      const live = s.units.filter((u) => Sim.alive(u) && !u.fled);
      let tx = 0, ty = 0, wsum = 0;
      for (const u of live) { const w = u === s.lead ? 2.2 : 1; tx += u.x * w; ty += u.y * w; wsum += w; }
      if (wsum) { tx /= wsum; ty /= wsum; }
      let spread = 3;
      for (const u of live) spread = Math.max(spread, Math.hypot(u.x - tx, u.y - ty));
      let sc = Math.min(W / (spread * 2 + 5.6), H / ((spread * 2 + 4.8) * cam.pitch + 2.2));
      sc = Math.max(Math.min(sc, Math.min(W, H) / 5.6), Math.min(W, H) / 24);
      let ang = -0.32 + Math.sin(cam.time * 0.05) * 0.16;
      const c = s.cutscene;
      let frame = null; // heavy-art framing: {ax, ay, lift, pitch}
      if (c) {
        // Heavy art: hard cuts between anime shots, all built around the caster.
        const shot = cutShot(s, c);
        tx = shot.x; ty = shot.y; sc = shot.sc; ang = shot.ang;
        frame = shot;
        if (shot.key !== V.cutPhase) { V.cutPhase = shot.key; V.cutSnap = true; }
        // In the caster's own shots nothing may stand over them: they are
        // drawn last, over a dimmed world (the anime spotlight cheat).
        V.cutFocus = shot.focus ? c.unit.id : null;
        V.cutDim = shot.dim || 0;
      } else { V.cutPhase = null; V.cutFocus = null; }
      // Tap-to-follow: lock onto one of the player's fighters.
      const fu = V.follow && s.byId[V.follow];
      if (V.follow && (!fu || !Sim.alive(fu))) V.follow = null;
      const follow = !c && !V.show && V.follow ? { focus: V.follow, zoom: 1.9 } : null;
      const o = V.camOverride || intro.cameraFor(s, V.show) || follow || (!c && director.camera(s));
      if (o) {
        const fu = o.focus && s.byId[o.focus];
        if (fu) { tx = fu.x; ty = fu.y; }
        if (o.x != null) tx = o.x;
        if (o.y != null) ty = o.y;
        if (o.sc != null) sc = o.sc; else if (o.zoom) sc *= o.zoom;
        if (o.ang != null) ang = o.ang;
        if (o.angOff) ang += o.angOff;
      }
      // The helicopter view (the author's call, 2026-10-22): always high above and a little
      // to the side, one fixed angle; shots only move and zoom.
      if (V.HELI) ang = V.HELI.ang;
      let k = c || o ? 0.12 : Math.min(1, dt * 2.2);
      const snap = !!V.cutSnap;
      if (snap) { k = 1; V.cutSnap = false; } // a hard cut
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      cam.sc += (sc - cam.sc) * k;
      let dAng = ang - cam.ang;
      while (dAng > Math.PI) dAng -= Math.PI * 2;
      while (dAng < -Math.PI) dAng += Math.PI * 2;
      cam.ang += dAng * (k === 1 ? 1 : c || o ? 0.08 : Math.min(1, dt * 0.8));
      // Cutscenes and director shots drop the camera lower for drama.
      const pitchT = o && o.pitch != null ? o.pitch : frame ? frame.pitch : o && o.zoom > 1.3 ? 0.5 : 0.56;
      cam.pitch += (pitchT - cam.pitch) * (snap ? 1 : frame ? 0.2 : Math.min(1, dt * 4));
      if (V.HELI) cam.pitch = V.HELI.pitch;
      // Where on screen the camera point sits (heavy-art shots frame the
      // caster on a third); the face-off's own camera needs the defaults.
      const axT = frame ? frame.ax : 0.5, ayT = frame ? frame.ay - cam.horizon : 0, liftT = frame ? frame.lift : 0;
      const fk = snap || V.show ? 1 : frame ? 0.15 : Math.min(1, dt * 2.2);
      cam.ax += (axT - cam.ax) * fk; cam.ay += (ayT - cam.ay) * fk; cam.lift += (liftT - cam.lift) * fk;
      // Directional nudge from a hit, springing back.
      const kd = Math.pow(0.0004, dt);
      cam.kx *= kd; cam.ky *= kd;
      cam.shake *= Math.pow(0.002, dt);
    }

    // Draw the depth-sorted scene (world + fighters + per-unit effects) with
    // the current camera. fx.js may call this with a temporary camera to
    // compose cutscene panels.
    V.renderScene = function renderScene(s, opts) {
      opts = opts || {};
      world.drawBackdrop(s);
      const items = world.items(s);
      const focus = s.cutscene && V.cutFocus && s.byId ? s.byId[V.cutFocus] : null;
      for (const u of s.units) {
        if (u.fled || u === focus) continue;
        const p = V.P(u.x, u.y, 0);
        items.push({
          d: p.d + (u.state === 'out' ? -0.3 : 0),
          f: () => { fx.underUnit(u, s); fighters.drawUnit(u, s); fx.overUnit(u, s); },
        });
      }
      items.sort((a, b) => a.d - b.d);
      for (const it of items) it.f();
      if (focus) {
        if (V.cutDim > 0) { ctx.fillStyle = `rgba(6,4,6,${V.cutDim})`; ctx.fillRect(-60, -60, V.W + 120, V.H + 120); }
        fx.underUnit(focus, s); fighters.drawUnit(focus, s); fx.overUnit(focus, s);
      }
      fx.drawWorld(s, opts.dt || 0);
      if (!opts.noAtmosphere) world.drawAtmosphere(s, opts.dt || 0);
    };

    // ------------------------------------------------------------ frame
    // show: presentation state from main.js ({t} while the face-off plays), or null.
    function draw(s, dt, quiet, show) {
      const t0 = performance.now();
      V.show = show || null;
      V.spotlight = intro.spotlight(s, V.show);
      if (!V.W) resize();
      V.time += dt;
      director.observe(s, dt);
      fx.consume(s);
      fighters.update(s, dt);
      updateCamera(s, dt);
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      const shx = (V.rng() - 0.5) * V.cam.shake, shy = (V.rng() - 0.5) * V.cam.shake;
      ctx.save();
      ctx.translate(shx + V.cam.kx, shy + V.cam.ky);
      V.renderScene(s, { dt });
      if (!quiet && !V.show) callouts.draw(s, dt);
      ctx.restore();
      fx.drawScreen(s, dt);
      // (no fight cut-ins over the face-off: a stale one could belong to the menu bout)
      if (!quiet && !(V.show && V.show.t < NS.intro.T.fight)) director.drawScreen(s, dt);
      if (V.show) intro.draw(s, V.show, dt);
      const ms = performance.now() - t0;
      V.stats.drawMs = V.stats.drawMs ? V.stats.drawMs * 0.95 + ms * 0.05 : ms;
    }

    window.addEventListener('resize', resize);
    resize();
    return {
      draw, resize,
      takeHitstop: () => fx.takeHitstop(),
      timeScale: () => director.timeScale(),
      cinematic: () => director.cinematic(),
      cutIn: (u, caption) => director.forceCut(u, caption),
      // Which of the player's fighters is at this screen point (CSS px)?
      pick(s, x, y) {
        let best = null, bd = Math.max(44, V.cam.sc * 0.9);
        for (const u of s.units) {
          if (u.team !== 'hero' || !Sim.alive(u)) continue;
          const p = V.P(u.x, u.y, 0.9), d = Math.hypot(p.x - x, p.y - y);
          if (d < bd) { bd = d; best = u; }
        }
        return best;
      },
      setFollow: (id) => { V.follow = id || null; },
      get follow() { return V.follow || null; },
      setCameraOverride: (o) => { V.camOverride = o || null; },
      get stats() { return V.stats; },
    };
  }

  NS.createRenderer = createRenderer;
  NS.PAL = PAL;
  NS.FONT = FONT;
})();
