/*
 * Tower of Wishes — pixel effects (assets/fx/, packed by tools/pack_fx.py from the author's
 * effect packs: Pixel VFX Essentials, KILN FX, Magic Spells VFX Lite, slash arcs, fireballs).
 *
 * Effects are world-anchored sprite animations, drawn at the characters' pixel scale (one art
 * pixel = one character pixel) and never smoothed. fx.js spawns them from the fight's events.
 *
 *   spawn(name, x, y, z, opts)   play once (or for opts.life seconds if it loops)
 *     opts: scale, rot (screen radians), flip, alpha, add (lighter blend), ground (flattened
 *           onto the floor), follow (a unit: rides with it), delay (seconds), life
 *   drawAt(name, t, x, y, z, opts)   draw one frame of a looping effect now (auras, projectiles)
 *   drawGround() / drawAbove(dt)     the floor layer (under fighters) and everything else
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const ROOT = 'assets/fx/';
  let data = null, pages = null, loading = null;
  function load() {
    if (loading) return loading;
    loading = (async () => {
      data = await (await fetch(ROOT + 'fx.json')).json();
      pages = await Promise.all(data.pages.map((p) => new Promise((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('fx page ' + p)); im.src = ROOT + p;
      })));
    })().catch((e) => { console.warn('pixel fx: ' + (e.message || e)); data = null; pages = null; });
    return loading;
  }

  function create(V) {
    const { ctx } = V;
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') load();
    let live = [];
    const ready = () => !!(pages && data);
    const has = (n) => ready() && !!data.fx[n];
    // Screen pixels per art pixel: a creator figure is 44 px tall and stands 1.6 m.
    const texel = () => (1.78 * 0.9 * V.cam.sc) / 44;

    function spawn(name, x, y, z, o) {
      if (!has(name)) return false;
      live.push(Object.assign({ name, x, y, z: z || 0, t: -((o && o.delay) || 0), scale: 1, rot: 0, alpha: 1 }, o));
      return true;
    }
    function frameAt(f, t) {
      const n = f.frames.length;
      let i = Math.floor(Math.max(0, t) * f.fps);
      if (f.loop) i %= n; else if (i >= n) return null;
      return f.frames[i];
    }
    function paint(f, fr, x, y, z, e) {
      const p = V.P(x, y, z), k = texel() * (e.scale || 1);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= e.alpha == null ? 1 : e.alpha;
      if (e.add) ctx.globalCompositeOperation = 'lighter';
      else if (e.mul) ctx.globalCompositeOperation = 'multiply'; // grey smoke darkens what is behind it
      ctx.translate(p.x, p.y);
      if (e.ground) ctx.scale(1, V.cam.pitch);
      if (e.rot) ctx.rotate(e.rot);
      if (e.flip) ctx.scale(-1, 1);
      ctx.drawImage(pages[fr[0]], fr[1], fr[2], fr[3], fr[4], (fr[5] - f.anchor[0]) * k, (fr[6] - f.anchor[1]) * k, fr[3] * k, fr[4] * k);
      ctx.restore();
    }
    function drawOne(e) {
      if (e.t < 0) return;
      const f = data.fx[e.name], fr = frameAt(f, e.t);
      if (!fr) return;
      const u = e.follow;
      const x = u ? u.x + (e.dx || 0) : e.x, y = u ? u.y + (e.dy || 0) : e.y;
      let a = e.alpha;
      if (e.life && f.loop) a *= Math.min(1, (e.life - e.t) / 0.2);
      paint(f, fr, x, y, e.z, Object.assign({}, e, { alpha: a }));
    }
    function alive(e) {
      const f = data.fx[e.name];
      if (e.life != null) return e.t < e.life;
      return f.loop || e.t * f.fps < f.frames.length;
    }
    function step(dt) {
      if (!ready()) return;
      for (const e of live) e.t += dt;
      live = live.filter(alive);
    }
    function drawGround() { if (ready()) for (const e of live) if (e.ground) drawOne(e); }
    function drawAbove(dt) {
      if (!ready()) return;
      step(dt);
      for (const e of live) if (!e.ground) drawOne(e);
    }
    function drawAt(name, t, x, y, z, o) {
      if (!has(name)) return false;
      const f = data.fx[name], fr = frameAt(f, f.loop ? t : Math.min(t, (f.frames.length - 0.01) / f.fps));
      if (fr) paint(f, fr, x, y, z, o || {});
      return true;
    }
    // The screen angle of a world direction from (x, y).
    function screenAng(x, y, a) {
      const p0 = V.P(x, y, 0), p1 = V.P(x + Math.cos(a), y + Math.sin(a), 0);
      return Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }
    function clear() { live = []; }
    return { ready, has, spawn, step, drawGround, drawAbove, drawAt, screenAng, clear, texel, get count() { return live.length; } };
  }

  NS.pixelfx = { create, load };
})();
