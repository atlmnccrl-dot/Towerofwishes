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
      cam: { x: 0, y: 0, sc: 40, ang: -0.32, pitch: 0.56, shake: 0, time: 0, horizon: 0.56 },
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
      const ox = cam.cx != null ? cam.cx : V.W / 2, oy = cam.cy != null ? cam.cy : V.H * cam.horizon;
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
      let sc = Math.min(W / (spread * 2 + 7), H / ((spread * 2 + 6) * cam.pitch + 2.6));
      sc = Math.max(Math.min(sc, Math.min(W, H) / 7), Math.min(W, H) / 26);
      let ang = -0.32 + Math.sin(cam.time * 0.05) * 0.16;
      const c = s.cutscene;
      if (c) {
        // Heavy art: hard cuts between three shots.
        const u = c.unit, ph = fx.cutPhase(c), F = [Math.cos(u.facing), Math.sin(u.facing)];
        if (ph === 'charge' || ph === 'gleam') {
          // low, close, slowly orbiting the fighter as they charge
          tx = u.x + F[0] * 0.4; ty = u.y + F[1] * 0.4;
          sc = Math.min(W, H) / 3.5;
          ang = c.line
            // line heavies: three-quarter side view so the lattice reads as a tunnel
            ? -u.facing + 0.9 - (c.t / 1.35) * 0.4
            : Math.PI / 2 - u.facing + 1.0 - (c.t / 1.35) * 0.6;
          if (c.line) { tx = u.x + F[0] * 1.0; ty = u.y + F[1] * 1.0; }
        } else if (ph === 'dash') {
          // wide and side-on, so the dash (or a line heavy's beam) crosses the screen
          const off = c.line ? 3.4 : 1.4;
          tx = c.x0 + F[0] * off; ty = c.y0 + F[1] * off;
          sc = Math.min(W, H) / (c.line ? 7.6 : 6.5);
          ang = -u.facing - 0.15;
        } else if (c.line) {
          // a line heavy lands far away: look down the beam from behind the caster
          tx = c.x0 + F[0] * 2.8; ty = c.y0 + F[1] * 2.8;
          sc = Math.min(W, H) / 6.2;
          ang = -Math.PI / 2 - u.facing + 0.75;
        } else {
          tx = u.x + F[0] * 0.8; ty = u.y + F[1] * 0.8;
          sc = Math.min(W, H) / 4.6;
          ang = Math.PI / 2 - u.facing - 0.6;
        }
        if (ph !== V.cutPhase) { V.cutPhase = ph; V.cutSnap = true; }
      } else V.cutPhase = null;
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
      const pitchT = o && o.pitch != null ? o.pitch : c ? (V.cutPhase === 'charge' || V.cutPhase === 'gleam' ? 0.36 : 0.48) : o && o.zoom > 1.3 ? 0.5 : 0.56;
      cam.pitch += (pitchT - cam.pitch) * (snap ? 1 : Math.min(1, dt * 4));
      cam.shake *= Math.pow(0.002, dt);
    }

    // Draw the depth-sorted scene (world + fighters + per-unit effects) with
    // the current camera. fx.js may call this with a temporary camera to
    // compose cutscene panels.
    V.renderScene = function renderScene(s, opts) {
      opts = opts || {};
      world.drawBackdrop(s);
      const items = world.items(s);
      for (const u of s.units) {
        if (u.fled) continue;
        const p = V.P(u.x, u.y, 0);
        items.push({
          d: p.d + (u.state === 'out' ? -0.3 : 0),
          f: () => { fx.underUnit(u, s); fighters.drawUnit(u, s); fx.overUnit(u, s); },
        });
      }
      items.sort((a, b) => a.d - b.d);
      for (const it of items) it.f();
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
      ctx.translate(shx, shy);
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
