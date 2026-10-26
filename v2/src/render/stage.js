// The cutscene stage: a low, side-on camera close to the actors, in layers. Sky, distant ridges and
// silhouettes far back (moving slowly as the camera pans), the set's props in full colour behind
// the actors, the ground, the actors, dark framing shapes in front, then light and weather. The
// picture is drawn at pixel resolution and scaled up; zoom draws fewer pixels (a close-up is a
// smaller buffer), so every layer stays on one crisp grid.
//
//   const stage = createStage(canvas, { world, tiles, fx })
//   stage.draw({ set, cam: { x, zoom, g }, actors }, dt)  // g: the ground line, a fraction of the height      // set: a key of data/stagesets.js
//   stage.project(x, lane, height)                            // a point of the stage on the page
import { framesOf } from './assets.js';
import { STAGE_SETS } from '../data/stagesets.js';

const BUF_H = 135, PPM = 24;

export function createStage(canvas, { world, tiles, fx: fxAtlas }) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d');
  const cache = new Map();
  let sprites = {}, aspect = 16 / 9, W = 240, H = BUF_H, gy = 100, cam = { x: 0, zoom: 1 }, t = 0, shake = 0, flash = 0, effects = [];
  let set = null, setKey = null, layout = null;

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    aspect = r.width / Math.max(1, r.height);
  }
  // a sprite by name: 'w:' the world atlas, otherwise the tiles atlas
  function pic(name) {
    const A = name.startsWith('w:') ? world : tiles, k = name.replace(/^[wt]:/, ''), s = A && A.data.sprites[k];
    return s ? { img: A.pages[s[0]], x: s[1], y: s[2], w: s[3], h: s[4] } : null;
  }
  // a sprite filled with one colour (silhouettes), or with snow on every upward edge
  function variant(name, how) {
    const id = name + '|' + how; if (cache.has(id)) return cache.get(id);
    const p = pic(name); if (!p) return null;
    const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
    const g = c.getContext('2d'); g.drawImage(p.img, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
    if (how === 'snow') {
      const d = g.getImageData(0, 0, p.w, p.h), a = d.data;
      for (let y = p.h - 1; y >= 0; y--) for (let x = 0; x < p.w; x++) {
        const i = (y * p.w + x) * 4; if (a[i + 3] < 128) continue;
        const up = y < 1 || a[i - p.w * 4 + 3] < 128, up2 = y < 2 || a[i - p.w * 8 + 3] < 128;
        if (up || (up2 && (x + y) % 3)) { a[i] = 236; a[i + 1] = 242; a[i + 2] = 252; }
      }
      g.putImageData(d, 0, 0);
    } else { g.globalCompositeOperation = 'source-in'; g.fillStyle = how; g.fillRect(0, 0, p.w, p.h); }
    const v = { img: c, x: 0, y: 0, w: p.w, h: p.h }; cache.set(id, v); return v;
  }
  function blit(p, x, base, k = 1, flip = false) {
    if (!p) return;
    const w = Math.round(p.w * k), hh = Math.round(p.h * k), dx = Math.round(x - w / 2), dy = Math.round(base - hh);
    if (dx > W || dx + w < 0) return;
    if (flip) { ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(p.img, p.x, p.y, p.w, p.h, 0, 0, w, hh); ctx.restore(); }
    else ctx.drawImage(p.img, p.x, p.y, p.w, p.h, dx, dy, w, hh);
  }
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // where a layer's things stand: seeded rows along the stage, the same every time
  function buildLayout(S) {
    const L = { mid: [], back: [], fore: [], tufts: [] };
    const row = (spec, into, seed) => {
      if (!spec) return; const r = rnd(seed);
      for (let x = -60; x < 60; x += spec.gap[0] + r() * (spec.gap[1] - spec.gap[0])) {
        const name = spec.list[Math.floor(r() * spec.list.length)];
        into.push({ name, x, k: spec.k * (spec.vary ? 0.85 + r() * 0.3 : 1), flip: r() < 0.5, dy: (r() - 0.5) * (spec.jitter || 0) });
      }
    };
    row(S.mid, L.mid, 7); row(S.fore, L.fore, 13); row(S.tufts, L.tufts, 29);
    if (S.backRow) row(S.backRow, L.back, 19);
    for (const [name, x, dy = 0, k = 1, flip = false] of S.back || []) L.back.push({ name, x, dy, k, flip });
    L.back.sort((a, b) => a.dy - b.dy);
    return L;
  }

  // ---- the layers
  const sx = (x, p) => W / 2 + (x - cam.x) * PPM * p;
  function sky() {
    const [a, b, c] = set.sky, g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, a); g.addColorStop(0.6, b); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (set.sun) {
      const s = set.sun, x = W * s.x - cam.x * 0.6, y = gy * s.y, r = s.r || 40;
      const gl = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4); gl.addColorStop(0, s.col); gl.addColorStop(0.25, s.glow || 'rgba(255,220,160,0.35)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, gy);
      ctx.fillStyle = s.disc || s.col; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), Math.max(2, r / 8), 0, Math.PI * 2); ctx.fill();
    }
    if (set.stars) { const r = rnd(5); ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 70; i++) { const x = ((r() * 600 - cam.x * 0.4) % W + W) % W, y = r() * gy * 0.7; if ((i + Math.floor(t * 2)) % 9) ctx.fillRect(x | 0, y | 0, 1, 1); } }
    if (set.clouds) {
      const r = rnd(3); ctx.fillStyle = set.clouds;
      for (let i = 0; i < 7; i++) {
        const w = 30 + r() * 50, x = (((r() * 900) + t * 3 - cam.x * 2) % (W + 200)) - 100, y = gy * (0.12 + r() * 0.4);
        for (let k = 0; k < 5; k++) { const bx = x + k * w / 5, bh = 4 + Math.sin(k * 1.7 + i) * 3 + 3; ctx.fillRect(Math.round(bx), Math.round(y - bh), Math.round(w / 4), Math.round(bh * 1.4)); }
        ctx.fillRect(Math.round(x - 4), Math.round(y), Math.round(w + 8), 3);
      }
    }
  }
  function ridges() {
    for (const rg of set.ridges || []) {
      ctx.fillStyle = rg.col;
      for (let x = 0; x < W; x++) {
        const u = (x - W / 2) / (PPM * rg.p) + cam.x;
        const hgt = rg.base + rg.amp * (Math.sin(u * rg.freq) * 0.6 + Math.sin(u * rg.freq * 2.3 + 1.7) * 0.3 + Math.sin(u * rg.freq * 5.1 + 0.4) * 0.1);
        const y = Math.round(gy - hgt * (H / BUF_H));
        ctx.fillRect(x, y, 1, gy - y + 1);
      }
    }
  }
  function mid() {
    const M = set.mid; if (!M) return;
    for (const o of layout.mid) blit(variant(o.name, M.col), sx(o.x, M.p), gy - M.base + o.dy, o.k, o.flip);
    if (set.haze) { const g = ctx.createLinearGradient(0, gy - 50, 0, gy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, set.haze); ctx.fillStyle = g; ctx.fillRect(0, gy - 50, W, 51); }
  }
  function back() {
    for (const o of layout.back) {
      const p = o.snow ? variant(o.name, 'snow') : set.snowy && /pine|tree/.test(o.name) ? variant(o.name, 'snow') : pic(o.name);
      blit(p, sx(o.x, 0.92), gy - 2 + o.dy, o.k, o.flip);
    }
  }
  function ground() {
    const G = set.ground, p = G.tex && pic(G.tex);
    if (p) {
      const th = Math.max(4, Math.round(p.h * 0.5)), x0 = Math.round(sx(0, 1)) % p.w;
      for (let y = gy - 2, row = 0; y < H; y += th, row++) for (let x = x0 - p.w + (row % 2) * (p.w >> 1); x < W; x += p.w) ctx.drawImage(p.img, p.x, p.y, p.w, p.h, x, y, p.w, th);
    } else { ctx.fillStyle = G.col; ctx.fillRect(0, gy - 2, W, H - gy + 2); }
    if (G.speck) { const r = rnd(9); for (let i = 0; i < 260; i++) { ctx.fillStyle = G.speck[i % G.speck.length]; const x = ((r() * 2000 - cam.x * PPM) % W + W) % W; ctx.fillRect(x | 0, (gy + r() * (H - gy)) | 0, 2, 1); } }
    ctx.fillStyle = G.edge || 'rgba(0,0,0,0.25)'; ctx.fillRect(0, gy - 2, W, 1);
    const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, G.shade || 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, gy - 2, W, H - gy + 2);
    for (const o of layout.tufts) blit(pic(o.name), sx(o.x, 1), gy + 1 + Math.abs(o.dy), o.k, o.flip);
  }
  function fore() {
    const F = set.fore; if (!F) return;
    for (const o of layout.fore) blit(variant(o.name, F.col), sx(o.x, F.p), H + (F.drop || 6) + o.dy, o.k, o.flip);
  }
  // ---- actors
  const IDLE = (s) => (s.data.anims.Idle3 ? 'Idle3' : 'Idle');
  function actor(a, dt) {
    const s = sprites[a.set]; if (!s || a.hidden) return;
    const clip = a.anim.clip === 'idle' ? IDLE(s) : a.anim.clip, fps = a.anim.clip === 'idle' ? 7 : a.anim.fps || 10;
    if (a._clip !== clip) { a._clip = clip; a._t = 0; }
    a._t += dt;
    const moving = /Walk|Run/.test(clip), dir = a.f > 0 ? (moving ? 'E' : 'SE') : (moving ? 'W' : 'SW');
    const frames = framesOf(s, clip, dir) || framesOf(s, IDLE(s), dir); if (!frames) return;
    let i = Math.floor(a._t * fps); i = a.anim.loop === false ? Math.min(frames.length - 1, i) : i % frames.length;
    const [pg, fx0, fy0, w, h, ox, oy] = frames[i], [ax, ay] = s.data.anchor, k = (s.cfg.scale || 1) * (a.scale || 1);
    const x = Math.round(sx(a.x, 1)), y = gy + (a.lane || 0) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, 10 * k, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(s.pages[pg], fx0, fy0, w, h, Math.round(x + (ox - ax) * k), Math.round(y + (oy - ay) * k), Math.round(w * k), Math.round(h * k));
  }
  // ---- effects from the fx atlas, at a point of the stage (height in pixels above the ground)
  function spawn(name, x, height = 20, o = {}) { const d = fxAtlas.data.fx[name]; if (d) effects.push(Object.assign({ d, x, height, t: 0, scale: 1 }, o)); }
  function effectsDraw(dt) {
    effects = effects.filter((e) => {
      e.t += dt; const n = e.d.frames.length; let i = Math.floor(e.t * e.d.fps);
      if (e.d.loop) { if (e.t > (e.life || 1.2)) return false; i %= n; } else if (i >= n) return false;
      const fr = e.d.frames[i]; if (!fr) return true;
      const [pg, x0, y0, w, h, ox, oy] = fr, [ax, ay] = e.d.anchor, k = e.scale;
      ctx.save(); if (e.add !== false) ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fxAtlas.pages[pg], x0, y0, w, h, Math.round(sx(e.x, 1) + (ox - ax) * k), Math.round(gy - e.height + (oy - ay) * k), Math.round(w * k), Math.round(h * k));
      ctx.restore(); return true;
    });
  }
  // ---- light and weather
  const motes = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97.3) % 600, y: (i * 53.1) % 300, s: (i * 0.618) % 1, p: i }));
  const WEATHER = {
    leaves: { col: ['#c98a3a', '#9fbf4a', '#d9b04a'], vx: 12, vy: 9, sway: 6, size: 2, n: 26 },
    fireflies: { col: ['#e8f070', '#b8f080'], vx: 2, vy: -1, sway: 5, size: 1, glow: true },
    snow: { col: ['#ffffff', '#dfe8f4'], vx: 6, vy: 16, sway: 4, size: 1 },
    embers: { col: ['#ff9a3a', '#ffcf5a'], vx: 3, vy: -12, sway: 3, size: 1, glow: true },
    dust: { col: ['rgba(255,236,200,0.35)'], vx: 3, vy: -1, sway: 3, size: 1, glow: true, n: 18 },
  };
  function light(dt) {
    const L = set.light || {};
    if (L.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [gx, gh, rad = 40, col = '255,150,60'] of L.glow) { const x = sx(gx, 0.92), y = gy - gh, r = rad * (1 + Math.sin(t * 9 + gx) * 0.05); const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.restore(); }
    if (L.rays) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const x = W * (0.15 + i * 0.27) - cam.x * 2 % W; ctx.fillStyle = `rgba(${L.rays},${0.05 + 0.025 * Math.sin(t * 0.6 + i)})`; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 14 + i * 3, -4); ctx.lineTo(x + 14 + i * 3 - H * 0.5, H); ctx.lineTo(x - H * 0.5, H); ctx.fill(); }
      ctx.restore(); }
    if (L.fog) { for (let i = 0; i < 3; i++) { const y = gy - 6 + i * 7, g = ctx.createLinearGradient(0, y - 8, 0, y + 8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(${L.fogCol || '200,215,210'},${L.fog * (0.25 - i * 0.05)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, y - 8, W, 16); } }
    const w = WEATHER[set.weather];
    if (w) { ctx.save(); if (w.glow) ctx.globalCompositeOperation = 'lighter';
      for (const q of w.n ? motes.slice(0, w.n) : motes) {
        q.x += w.vx * (0.5 + q.s) * dt; q.y += w.vy * (0.5 + q.s) * dt;
        const x = ((q.x - cam.x * PPM * 0.5) % W + W) % W, y = ((q.y % H) + H) % H;
        ctx.globalAlpha = w.glow ? 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + q.p * 3)) : 0.85; ctx.fillStyle = w.col[q.p % w.col.length];
        ctx.fillRect(Math.round(x + Math.sin(t * 1.3 + q.p) * w.sway), Math.round(y), w.size + (q.s > 0.7 ? 1 : 0), w.size);
      }
      ctx.restore(); }
    const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, W * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(4,4,10,${L.vignette != null ? L.vignette : 0.5})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // the set's colour grade, under the actors so they keep their own colours
  function grade() {
    const L = set.light || {};
    if (L.tint) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = L.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function draw(state, dt) {
    t += dt;
    if (state.set !== setKey) { setKey = state.set; set = STAGE_SETS[setKey] || STAGE_SETS.meadow; layout = buildLayout(set); }
    cam = state.cam;
    H = Math.max(40, Math.round(BUF_H / (cam.zoom || 1))); W = Math.max(60, Math.round(H * aspect));
    if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
    // the ground line: low in a wide shot, near the bottom in a close-up so the faces fill the frame
    gy = Math.round(H * (cam.g != null ? cam.g : Math.min(0.94, 0.78 + ((cam.zoom || 1) - 1) * 0.16)));
    const shx = shake > 0.05 ? Math.round((Math.random() - 0.5) * shake) : 0;
    shake *= Math.exp(-dt * 7);
    ctx.setTransform(1, 0, 0, 1, shx, 0); ctx.imageSmoothingEnabled = false;
    sky(); ridges(); mid(); back(); ground(); grade();
    const list = state.actors.slice().sort((a, b) => (a.lane || 0) - (b.lane || 0));
    for (const a of list) actor(a, dt);
    effectsDraw(dt);
    fore(); light(dt);
    if (flash > 0.01) { ctx.fillStyle = `rgba(255,240,220,${flash})`; ctx.fillRect(0, 0, W, H); flash *= Math.exp(-dt * 6); }
    out.imageSmoothingEnabled = false;
    out.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }
  // where a point of the stage is on the page (CSS pixels)
  function project(x, lane = 0, height = 0) {
    const r = canvas.getBoundingClientRect(), k = r.height / H;
    return { x: r.left + sx(x, 1) * k, y: r.top + (gy + lane * 3 - height) * k };
  }
  return { resize, draw, project, spawn, setSprites(s) { sprites = s; }, shake(n = 4) { shake = n; }, flash(a = 0.5) { flash = a; }, reset() { effects = []; shake = 0; flash = 0; } };
}
