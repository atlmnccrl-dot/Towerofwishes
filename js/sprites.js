/*
 * Tower of Wishes — sprite characters (PNG sprite sheets + JSON frame data).
 *
 * Each character has a manifest (assets/characters/<id>/<id>.json): the official base
 * sprite, the anchor (feet, in pixels), the facing directions it is drawn in, mirrors,
 * and its animations. An animation is one transparent PNG sheet plus a JSON frame file
 * (TexturePacker "JSON hash"); frames are named <anim>_<DIR>_<NNN> (e.g. idle_SE_003).
 * The format is described in docs/SPRITES.md.
 *
 * Pure part (Node-testable): direction from facing + camera angle, frame lookup, and an
 * animator that crossfades between states (and plays a transition clip when the manifest
 * has one). Browser part: loading manifests and images, and drawing a frame.
 *
 * Nothing here changes how fights or scenes are drawn yet: characters keep their
 * procedural bodies until their animations arrive and are switched on.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowSprites = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TAU = Math.PI * 2;
  // Eight facings, in order of increasing screen angle starting from "toward the camera".
  const DIRS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

  // The direction a unit is seen from. facing: world radians (the sim's u.facing);
  // camAng: the camera's turn (V.cam.ang). Screen angle PI/2 is facing the viewer (S).
  function dirFor(facing, camAng) {
    const a = facing + (camAng || 0);
    const k = Math.round((((a - Math.PI / 2) % TAU) + TAU) % TAU / (Math.PI / 4)) % 8;
    return DIRS[k];
  }

  // Which drawn direction to use, and whether to flip it, for an animation's frames.
  function resolveDir(man, anim, dir) {
    const has = (d) => !!(anim && anim.frames && anim.frames[d] && anim.frames[d].length);
    if (has(dir)) return { dir, flip: false };
    const m = man.mirror && man.mirror[dir];
    if (m && has(m)) return { dir: m, flip: true };
    // Nearest drawn direction round the circle (then its mirror).
    const i = DIRS.indexOf(dir);
    for (let step = 1; step <= 4; step++) {
      for (const d of [DIRS[(i + step) % 8], DIRS[(i + 8 - step) % 8]]) {
        if (has(d)) return { dir: d, flip: false };
        const mm = man.mirror && man.mirror[d];
        if (mm && has(mm)) return { dir: mm, flip: true };
      }
    }
    return null;
  }

  // Frame rectangles from a TexturePacker JSON hash (or array), grouped by direction.
  // Returns { S: [frame, ...], ... } where frame = { x, y, w, h, ox, oy, sw, sh }.
  function parseFrames(data, animName) {
    const out = {};
    const list = Array.isArray(data.frames) ? data.frames.map((f) => [f.filename, f]) : Object.entries(data.frames || {});
    const re = new RegExp('^' + animName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_([NSEW]{1,2})_(\\d+)');
    for (const [name, f] of list) {
      const m = re.exec(String(name).replace(/\.png$/i, ''));
      if (!m) continue;
      const r = f.frame, src = f.spriteSourceSize || { x: 0, y: 0 }, size = f.sourceSize || { w: r.w, h: r.h };
      (out[m[1]] = out[m[1]] || []).push({ n: +m[2], x: r.x, y: r.y, w: r.w, h: r.h, ox: src.x, oy: src.y, sw: size.w, sh: size.h, rotated: !!f.rotated });
    }
    for (const d of Object.keys(out)) out[d].sort((a, b) => a.n - b.n);
    return out;
  }

  // Frame index at time t (seconds) for an animation: loops, or holds the last frame.
  function frameIndex(anim, n, t) {
    const i = Math.floor(Math.max(0, t) * (anim.fps || 12));
    return anim.loop === false ? Math.min(n - 1, i) : i % n;
  }
  function duration(anim, n) { return n / (anim.fps || 12); }

  // The sim state a unit is in -> the animation to play, falling back toward 'base'.
  const STATE_ANIM = {
    idle: ['idle'], circle: ['walk', 'idle'], move: ['run', 'walk', 'idle'], opener: ['run', 'walk', 'idle'],
    attack: ['attack', 'idle'], parry: ['block', 'idle'], dodge: ['dodge', 'run', 'idle'],
    hurt: ['hit', 'idle'], stagger: ['hit', 'idle'], down: ['down', 'hit', 'idle'], out: ['ko', 'down', 'idle'],
    cast: ['cast', 'idle'], recover: ['idle'], distracted: ['idle'], pickup: ['idle'],
  };
  function animFor(man, state) {
    const opts = (man.stateMap && man.stateMap[state]) || STATE_ANIM[state] || ['idle'];
    for (const a of [].concat(opts)) if (man.animations[a]) return a;
    return null; // no animation yet: draw the base sprite (or keep the procedural body)
  }

  // An animator per unit: play(name) switches state; a transition clip plays first if the
  // manifest has one ("idle>run": "idle_to_run"); otherwise the old pose fades out over
  // `blend` seconds while the new one fades in. sample() lists what to draw this frame.
  function animator(man) {
    return { man, cur: null, t: 0, prev: null, prevT: 0, fade: 0, fadeDur: 0, then: null };
  }
  function play(A, name, opts) {
    if (!name || name === A.cur || (A.then && A.then === name)) return;
    const tr = A.cur && A.man.transitions && A.man.transitions[A.cur + '>' + name];
    const next = tr && A.man.animations[tr] ? tr : name;
    A.prev = A.cur; A.prevT = A.t;
    A.cur = next; A.t = 0;
    A.then = next === name ? null : name;
    const anim = A.man.animations[next];
    A.fadeDur = A.prev ? ((opts && opts.blend != null) ? opts.blend : anim && anim.blend != null ? anim.blend : A.man.blend != null ? A.man.blend : 0.12) : 0;
    A.fade = 0;
  }
  function advance(A, dt) {
    A.t += dt; A.prevT += dt; A.fade += dt;
    if (A.then) {
      const anim = A.man.animations[A.cur];
      const n = anim && anim.frames ? Math.max(...Object.values(anim.frames).map((f) => f.length), 1) : 1;
      if (!anim || A.t >= duration(anim, n)) { const to = A.then; A.then = null; A.prev = A.cur; A.prevT = A.t; A.cur = to; A.t = 0; A.fade = 0; A.fadeDur = 0.06; }
    }
  }
  // [{ anim, dir, flip, frame, alpha }] — the outgoing pose under the incoming one.
  function sample(A, dir) {
    const out = [];
    const pick = (name, t, alpha) => {
      const anim = name && A.man.animations[name];
      if (!anim || alpha <= 0) return;
      const r = resolveDir(A.man, anim, dir);
      if (!r) return;
      const fr = anim.frames[r.dir];
      out.push({ anim: name, dir: r.dir, flip: r.flip, frame: fr[frameIndex(anim, fr.length, t)], alpha });
    };
    const k = A.fadeDur > 0 ? Math.min(1, A.fade / A.fadeDur) : 1;
    if (k < 1) pick(A.prev, A.prevT, 1 - k);
    pick(A.cur, A.t, k < 1 ? k : 1);
    return out;
  }

  // ------------------------------------------------------------ browser: load and draw
  const registry = {};   // id -> manifest (with images)
  const byKey = {};      // sim/look key -> id
  const isBrowser = typeof window !== 'undefined' && typeof Image !== 'undefined';
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('sprite image failed: ' + src)); im.src = src; });
  }
  // Register a manifest (already parsed). dir: folder the manifest lives in.
  function register(man, dir) {
    man.dir = dir || man.dir || '';
    man.animations = man.animations || {};
    registry[man.id] = man;
    for (const k of man.simKeys || [man.id]) byKey[k] = man.id;
    return man;
  }
  async function load(url) {
    const dir = url.slice(0, url.lastIndexOf('/') + 1);
    const man = register(await (await fetch(url)).json(), dir);
    if (isBrowser) {
      man.baseImage = await loadImage(dir + man.base.image);
      for (const [name, a] of Object.entries(man.animations)) {
        if (!a.sheet || !a.data) continue;
        const [img, data] = await Promise.all([loadImage(dir + a.sheet), fetch(dir + a.data).then((r) => r.json())]);
        a.image = img;
        a.frames = parseFrames(data, a.prefix || name);
      }
    }
    man.ready = true;
    return man;
  }
  function loadAll(urls) {
    return Promise.all(urls.map((u) => load(u).catch((e) => { console.warn(e.message || e); return null; })));
  }
  function get(idOrKey) { return registry[idOrKey] || registry[byKey[idOrKey]] || null; }

  // Draw one sampled frame with its feet on (x, y), the figure `heightPx` tall on screen.
  function drawFrame(ctx, man, s, x, y, heightPx) {
    const anim = man.animations[s.anim], f = s.frame;
    if (!anim || !anim.image || !f) return;
    const ax = anim.anchor ? anim.anchor[0] : man.base.anchor[0], ay = anim.anchor ? anim.anchor[1] : man.base.anchor[1];
    const k = heightPx / (anim.figureHeightPx || man.base.figureHeightPx);
    ctx.save();
    ctx.globalAlpha *= s.alpha;
    ctx.translate(x, y);
    if (s.flip) ctx.scale(-1, 1);
    ctx.drawImage(anim.image, f.x, f.y, f.w, f.h, (f.ox - ax) * k, (f.oy - ay) * k, f.w * k, f.h * k);
    ctx.restore();
  }
  // The base sprite (front view), feet on (x, y).
  function drawBase(ctx, man, x, y, heightPx, flip) {
    if (!man.baseImage) return;
    const b = man.base, k = heightPx / b.figureHeightPx;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(man.baseImage, -b.anchor[0] * k, -b.anchor[1] * k, b.size[0] * k, b.size[1] * k);
    ctx.restore();
  }

  const MANIFESTS = ['assets/characters/eiryn/eiryn.json'];

  return {
    DIRS, MANIFESTS, STATE_ANIM, dirFor, resolveDir, parseFrames, frameIndex, animFor,
    animator, play, advance, sample, register, load, loadAll, get, drawFrame, drawBase,
  };
});
