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
      // Light comes from the upper left of the screen, slightly behind the camera.
      light: { ang: -2.3, elev: 0.9 },
      stats: { drawMs: 0 },
    };

    // World (metres) -> screen (CSS px). d is depth: larger = nearer the camera.
    V.P = function P(x, y, z) {
      const cam = V.cam;
      const dx = x - cam.x, dy = y - cam.y;
      const c = Math.cos(cam.ang), s = Math.sin(cam.ang);
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      return { x: V.W / 2 + rx * cam.sc, y: V.H * cam.horizon + ry * cam.sc * cam.pitch - (z || 0) * cam.sc * 0.9, d: ry };
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
    const callouts = NS.callouts.create(V);

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
      for (const u of live) { const w = u.id === 'kael' ? 2.2 : 1; tx += u.x * w; ty += u.y * w; wsum += w; }
      if (wsum) { tx /= wsum; ty /= wsum; }
      let spread = 3;
      for (const u of live) spread = Math.max(spread, Math.hypot(u.x - tx, u.y - ty));
      let sc = Math.min(W / (spread * 2 + 7), H / ((spread * 2 + 6) * cam.pitch + 2.6));
      sc = Math.max(Math.min(sc, Math.min(W, H) / 7), Math.min(W, H) / 26);
      let ang = -0.32 + Math.sin(cam.time * 0.05) * 0.16;
      const c = s.cutscene;
      if (c) {
        const u = c.unit;
        tx = u.x + Math.cos(u.facing) * 0.9; ty = u.y + Math.sin(u.facing) * 0.9;
        sc = Math.min(W, H) / 4.2;
        ang = u.facing - Math.PI / 2 + 0.9 - (c.t / c.dur) * 0.7;
      }
      const o = V.camOverride;
      if (o) {
        const fu = o.focus && s.byId[o.focus];
        if (fu) { tx = fu.x; ty = fu.y; }
        if (o.x != null) tx = o.x;
        if (o.y != null) ty = o.y;
        if (o.sc != null) sc = o.sc; else if (o.zoom) sc *= o.zoom;
        if (o.ang != null) ang = o.ang;
      }
      const k = c || V.camOverride ? 0.12 : Math.min(1, dt * 2.2);
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      cam.sc += (sc - cam.sc) * k;
      cam.ang += (ang - cam.ang) * (c || V.camOverride ? 0.08 : Math.min(1, dt * 0.8));
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
    function draw(s, dt, quiet) {
      const t0 = performance.now();
      if (!V.W) resize();
      V.time += dt;
      fx.consume(s);
      fighters.update(s, dt);
      updateCamera(s, dt);
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      const shx = (V.rng() - 0.5) * V.cam.shake, shy = (V.rng() - 0.5) * V.cam.shake;
      ctx.save();
      ctx.translate(shx, shy);
      V.renderScene(s, { dt });
      if (!quiet) callouts.draw(s, dt);
      ctx.restore();
      fx.drawScreen(s, dt);
      const ms = performance.now() - t0;
      V.stats.drawMs = V.stats.drawMs ? V.stats.drawMs * 0.95 + ms * 0.05 : ms;
    }

    window.addEventListener('resize', resize);
    resize();
    return {
      draw, resize,
      takeHitstop: () => fx.takeHitstop(),
      setCameraOverride: (o) => { V.camOverride = o || null; },
      get stats() { return V.stats; },
    };
  }

  NS.createRenderer = createRenderer;
  NS.PAL = PAL;
  NS.FONT = FONT;
})();
