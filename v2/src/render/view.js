// Draws the fight from a fixed, angled top-down camera, at pixel resolution: the scene is drawn
// into a small buffer (one sprite pixel = one buffer pixel at rest) and scaled up without smoothing.
//
// World: x east, y south (towards the viewer), metres. Screen: x right, y down.
import { framesOf, CLIPS, PHASES } from './assets.js';
import { DIRS } from '../data/anims.js';

const BUF_H = 232;          // buffer height in pixels
const PPM = 26;             // buffer pixels per metre across (a 1.7 m figure is ~44 px, the sprites' own size)
const SQUASH = 0.6;         // depth foreshortening: how much a metre of y shrinks on screen
const LIFT = 0.92;          // how much a metre of height rises on screen

export function createView(canvas, sprites, fxAtlas) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas');
  const ctx = buf.getContext('2d');
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tz: 1, shake: 0 };
  const anim = new Map();   // unit id -> { key, t }
  const tmp = document.createElement('canvas');
  let fx = [], floaters = [], ground = null, groundFor = null, flashA = 0, flashCol = '255,255,255', dim = 0;

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    buf.height = BUF_H; buf.width = Math.max(200, Math.round(BUF_H * r.width / Math.max(1, r.height)));
  }
  // world -> buffer
  const S = () => PPM * cam.zoom;
  const P = (x, y, z = 0) => ({ x: Math.round(buf.width / 2 + (x - cam.x) * S()), y: Math.round(buf.height * 0.56 + (y - cam.y) * S() * SQUASH - z * S() * LIFT) });
  // buffer -> world (on the ground)
  function toWorld(bx, by) { return { x: (bx - buf.width / 2) / S() + cam.x, y: (by - buf.height * 0.56) / (S() * SQUASH) + cam.y }; }

  // ---- the clearing: grass, a worn patch where the fight is, a wall of trees at the back
  function buildGround(f) {
    const { w, h } = f.arena, pad = 6, gw = Math.round((w + pad * 2) * PPM), gh = Math.round((h + pad * 2) * PPM * SQUASH);
    const g = document.createElement('canvas'); g.width = gw; g.height = gh;
    const c = g.getContext('2d');
    let seed = 41; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    c.fillStyle = '#4d7f3f'; c.fillRect(0, 0, gw, gh);
    for (let i = 0; i < 1400; i++) { c.fillStyle = r() < 0.5 ? '#578a46' : '#44733a'; c.fillRect((r() * gw) | 0, (r() * gh) | 0, 2 + ((r() * 4) | 0), 1); }
    // the worn ground of the clearing
    const cx = gw / 2, cy = gh / 2;
    for (let i = 0; i < 2600; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const x = cx + Math.cos(a) * d * w * 0.46 * PPM, y = cy + Math.sin(a) * d * h * 0.48 * PPM * SQUASH;
      c.fillStyle = r() < 0.6 ? '#857f4b' : r() < 0.5 ? '#766f42' : '#938757'; c.fillRect(x | 0, y | 0, 2, 1);
    }
    // tufts, stones, small flowers
    for (let i = 0; i < 160; i++) {
      const x = (r() * gw) | 0, y = (r() * gh) | 0, k = r();
      if (k < 0.7) { c.fillStyle = '#2f5528'; c.fillRect(x, y, 1, 2); c.fillRect(x + 2, y + 1, 1, 1); c.fillStyle = '#5c8c45'; c.fillRect(x + 1, y - 1, 1, 2); }
      else if (k < 0.88) { c.fillStyle = '#7c7a70'; c.fillRect(x, y, 3, 2); c.fillStyle = '#a3a092'; c.fillRect(x, y, 2, 1); }
      else { c.fillStyle = r() < 0.5 ? '#e8d27a' : '#d98fb0'; c.fillRect(x, y, 1, 1); }
    }
    ground = { canvas: g, ox: -w / 2 - pad, oy: -h / 2 - pad }; groundFor = f;
  }
  // a tree: trunk and a layered canopy, rooted at a ground point
  function tree(x, y, size, k) {
    const p = P(x, y), s = S() / PPM * size;
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(p.x - 2 * s, p.y - 14 * s, 4 * s, 14 * s);
    const blobs = [[0, -30, 15], [-9, -22, 11], [9, -23, 11], [-4, -38, 10], [6, -35, 9]];
    for (const [dx, dy, rr] of blobs) { ctx.fillStyle = k ? '#1d3a22' : '#24452a'; ctx.beginPath(); ctx.arc(p.x + dx * s, p.y + dy * s, rr * s, 0, Math.PI * 2); ctx.fill(); }
    for (const [dx, dy, rr] of blobs.slice(0, 3)) { ctx.fillStyle = '#2f5a34'; ctx.beginPath(); ctx.arc(p.x + (dx - 3) * s, p.y + (dy - 4) * s, rr * 0.55 * s, 0, Math.PI * 2); ctx.fill(); }
  }
  const TREES = (() => { let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const t = [];
    for (let i = 0; i < 26; i++) t.push([-13 + i * 1.05 + r() * 0.6, -5.4 - r() * 1.6, 0.9 + r() * 0.4, r() < 0.5]);
    for (let i = 0; i < 6; i++) t.push([-10.5 - r() * 2, -3 + i * 1.6, 0.9 + r() * 0.3, r() < 0.5], [10.5 + r() * 2, -3 + i * 1.6, 0.9 + r() * 0.3, r() < 0.5]);
    return t; })();

  // ---- a sprite
  function dirOf(f) { const a = Math.atan2(Math.sin(f) * SQUASH, Math.cos(f)); return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }
  function drawFrame(set, fr, x, y, k, alpha = 1, tint) {
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = set.data.anchor;
    const dx = Math.round(x + (ox - ax) * k), dy = Math.round(y + (oy - ay) * k);
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.pages[pg], sx, sy, w, h, dx, dy, Math.round(w * k), Math.round(h * k));
    if (tint) {
      // the flash of a blow: the sprite's own shape, filled white, on top
      tmp.width = w; tmp.height = h; const t = tmp.getContext('2d');
      t.drawImage(set.pages[pg], sx, sy, w, h, 0, 0, w, h); t.globalCompositeOperation = 'source-in'; t.fillStyle = tint[0]; t.fillRect(0, 0, w, h);
      ctx.globalAlpha = tint[1]; ctx.drawImage(tmp, dx, dy, Math.round(w * k), Math.round(h * k));
    }
    ctx.globalAlpha = 1;
  }
  // which clip and frame a unit shows now
  function pose(u) {
    const set = sprites[u.def.set], cfg = set.cfg;
    const st = u.state;
    if (st === 'attack' && u.atk) {
      const A = u.atk.A, list = cfg.attacks || ['Attack1', 'Attack2'];
      const clip = A.projectile || A.fx === 'burst' ? cfg.cast || list[0] : list[u.atk.clip % list.length];
      return { clip, phase: phaseFrame(clip, u.st, A.windup, A.active, A.recover) };
    }
    if (st === 'special' && u.spec) return { clip: 'Special1', phase: phaseFrame('Special1', u.st, u.spec.S.impactAt, 0.08, u.spec.S.dur - u.spec.S.impactAt - 0.08) };
    if (st === 'block') return { clip: 'TakeDamage', fixed: 1 };
    const map = { hit: 'hit', down: 'down', getup: 'idle', dodge: 'dodge', ko: 'ko', victory: 'victory', flee: 'run' };
    let name = map[st];
    if (!name) name = st === 'move' ? (u.backing ? 'back' : (u.speedNow || 0) > 3.4 ? 'run' : 'walk') : 'idle';
    const [clip, fps, loop] = CLIPS[name];
    return { clip: name === 'idle' && cfg.stance ? cfg.stance : clip, fps, loop, timed: st === 'hit' ? u.st / Math.max(0.2, u.dur) : null };
  }
  function phaseFrame(clip, t, wind, active, recover) {
    const ph = PHASES[clip] || PHASES.Attack1;
    if (t < wind) return ph.windup[0] + (ph.windup[1] - ph.windup[0]) * (t / Math.max(0.01, wind));
    if (t < wind + active) return ph.strike[0];
    return ph.recover[0] + (ph.recover[1] - ph.recover[0]) * Math.min(1, (t - wind - active) / Math.max(0.01, recover));
  }
  function drawUnit(u, f, dt) {
    if (u.fled) return;
    const set = sprites[u.def.set]; if (!set) return;
    const k = (set.cfg.scale || 1) * cam.zoom, p = P(u.x, u.y);
    const ps = pose(u), dir = dirOf(u.f);
    const frames = framesOf(set, ps.clip, dir) || framesOf(set, 'Idle', dir);
    let a = anim.get(u.id); if (!a || a.clip !== ps.clip) { a = { clip: ps.clip, t: 0 }; anim.set(u.id, a); }
    a.t += dt;
    let i;
    if (ps.phase != null) i = Math.round(ps.phase);
    else if (ps.fixed != null) i = ps.fixed;
    else if (ps.timed != null) i = Math.floor(Math.min(1, ps.timed) * (frames.length - 1));
    else { i = Math.floor(a.t * (ps.fps || 10)); i = ps.loop === false ? Math.min(frames.length - 1, i) : i % frames.length; }
    i = Math.max(0, Math.min(frames.length - 1, i));
    // the shadow, the target ring, the team ring
    ctx.fillStyle = 'rgba(10,18,8,0.38)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3.2 * k, 0, 0, Math.PI * 2); ctx.fill();
    if (f.target === u.id) { ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 * k, 4.6 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    const flash = u.hitFlash > 0 ? ['#ffffff', Math.min(0.85, u.hitFlash * 6)] : null;
    drawFrame(set, frames[i], p.x, p.y, k, u.state === 'ko' ? Math.max(0.35, 1 - u.st * 0.25) : 1, flash);
    // a small health bar over the bandits (the heroes' are in the HUD)
    if (u.team !== 'hero' && u.state !== 'ko' && !u.def.noncombat && u.hp < u.max) {
      const w = 16, x = p.x - w / 2, y = p.y - Math.round(52 * k);
      ctx.fillStyle = 'rgba(12,8,8,0.8)'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = '#d9534a'; ctx.fillRect(x, y, Math.max(1, Math.round(w * u.hp / u.max)), 2);
    }
  }

  // ---- effects from the atlas
  function spawn(name, x, y, z, o = {}) { const d = fxAtlas.data.fx[name]; if (d) fx.push(Object.assign({ name, d, x, y, z, t: -(o.delay || 0), scale: 1 }, o)); }
  function drawFx(e) {
    if (e.t < 0) return true;
    const n = e.d.frames.length; let i = Math.floor(e.t * e.d.fps);
    if (e.d.loop) { if (e.life != null && e.t > e.life) return false; i %= n; } else if (i >= n) return false;
    const fr = e.d.frames[i]; if (!fr) return true;
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = e.d.anchor, k = e.scale * cam.zoom, p = P(e.x, e.y, e.z);
    ctx.save(); ctx.translate(p.x, p.y);
    if (e.ground) ctx.scale(1, SQUASH);
    if (e.flip) ctx.scale(-1, 1);
    if (e.add) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(fxAtlas.pages[pg], sx, sy, w, h, Math.round((ox - ax) * k), Math.round((oy - ay) * k), Math.round(w * k), Math.round(h * k));
    ctx.restore();
    return true;
  }

  // ---- what the fight's events look like
  function onEvents(f) {
    const U = (id) => f.units.find((u) => u.id === id);
    for (const e of f.events) {
      const u = e.u && U(e.u);
      if (e.type === 'swing' && u) {
        const ax = u.x + Math.cos(u.f) * 0.8, ay = u.y + Math.sin(u.f) * 0.8, left = Math.cos(u.f) < 0;
        if (e.fx === 'slash') spawn(u.combo % 2 ? 'slash_l' : 'slash_r', ax, ay, 1.0, { flip: left, scale: 1.1 });
        else if (e.fx === 'stab') spawn('thrust', ax, ay, 1.0, { flip: left });
        else if (e.fx === 'burst') { spawn('shockwave', u.x, u.y, 0.1, { ground: true, add: true, scale: 1.2 }); spawn('wind_gust', ax, ay, 0.9, { flip: left }); }
      } else if (e.type === 'cast' && u) spawn('spell_cast', u.x + Math.cos(u.f) * 0.4, u.y + Math.sin(u.f) * 0.4, 1.1, { add: true, scale: 0.8 });
      else if (e.type === 'hit') {
        const t = U(e.u), z = 1.0;
        const name = { slash: 'hit_slash', stab: 'hit_pierce', blunt: e.big ? 'hit_blunt' : 'hit_punch', pressure: 'spell_impact', burst: 'hit_big' }[e.fx] || 'hit_crit';
        spawn(name, e.x, e.y, z, { add: e.fx === 'pressure', scale: e.big ? 1.3 : 1 });
        if (t) t.hitFlash = 0.12;
        floaters.push({ text: String(e.dmg), x: e.x, y: e.y, z: 1.9, t: 0, col: t && t.team === 'hero' ? '#ff8a7a' : '#fff2c8', big: e.big });
        cam.shake = Math.max(cam.shake, e.big ? 3 : 1.2);
      } else if (e.type === 'impact') spawn('spell_impact', e.x, e.y, 1.0, { add: true });
      else if (e.type === 'block' && u) spawn('parry', e.x, e.y, 1.1, { add: true });
      else if (e.type === 'dodge' && u) spawn('dust_kick', u.x, u.y, 0.1, {});
      else if (e.type === 'ko' && u) spawn('dust_cloud', u.x, u.y, 0.2, { scale: 1.2 });
      else if (e.type === 'special' && u) {
        dim = 1;
        if (e.kind === 'blade') spawn('charge_up', u.x, u.y, 0.9, { add: true, life: e.impactAt, follow: u });
        else { spawn('circle_arcane', u.x, u.y, 0.05, { ground: true, add: true, life: e.dur, scale: 2.2 }); spawn('spell_cast', u.x, u.y, 1.2, { add: true, scale: 1.4 }); }
      } else if (e.type === 'artImpact') {
        flashA = 0.6; flashCol = e.kind === 'blade' ? '255,246,220' : '200,170,255'; cam.shake = 6;
        if (e.kind === 'blade') { spawn('cross_slash', e.x, e.y, 1.0, { scale: 2 }); spawn('arc_white', e.x, e.y, 1.0, { add: true, scale: 1.6 }); spawn('shockwave', e.x, e.y, 0.05, { ground: true, add: true, scale: 1.8 }); }
        else { spawn('shockwave', e.x, e.y, 0.05, { ground: true, add: true, scale: 4 }); spawn('blast', e.x, e.y, 1.0, { add: true, scale: 2 }); spawn('smoke_burst', e.x, e.y, 0.3, { scale: 2 }); }
      }
    }
  }

  // ---- one frame
  function draw(f, dt) {
    if (groundFor !== f) buildGround(f);
    onEvents(f);
    // the camera: the middle of everyone still standing, closer during an art
    const up = f.units.filter((u) => u.state !== 'ko' && !u.fled && !u.def.noncombat);
    const art = f.units.find((u) => u.state === 'special');
    if (art) { cam.tx = art.x; cam.ty = art.y; cam.tz = 1.35; }
    else if (up.length) { cam.tx = up.reduce((s, u) => s + u.x, 0) / up.length; cam.ty = up.reduce((s, u) => s + u.y, 0) / up.length * 0.5; cam.tz = 1; }
    const halfW = buf.width / 2 / (PPM * cam.tz), lim = Math.max(0, f.arena.w / 2 + 2.5 - halfW);
    cam.tx = Math.max(-lim, Math.min(lim, cam.tx));
    const kk = 1 - Math.exp(-dt * (art ? 5 : 2.4));
    cam.x += (cam.tx - cam.x) * kk; cam.y += (cam.ty - cam.y) * kk; cam.zoom += (cam.tz - cam.zoom) * kk;
    const shx = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0;
    cam.shake *= Math.exp(-dt * 9);

    ctx.setTransform(1, 0, 0, 1, Math.round(shx), Math.round(shy));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#16261a'; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16);
    // the ground, scaled with the zoom
    const g0 = P(ground.ox, ground.oy);
    ctx.drawImage(ground.canvas, g0.x, g0.y, Math.round(ground.canvas.width * cam.zoom), Math.round(ground.canvas.height * cam.zoom));
    // trees behind the clearing (drawn before anyone in front of them)
    const items = [];
    for (const t of TREES) items.push({ y: t[1], draw: () => tree(t[0], t[1], t[2], t[3]) });
    for (const u of f.units) items.push({ y: u.y + (u.state === 'ko' ? -0.3 : 0), draw: () => drawUnit(u, f, dt) });
    for (const p of f.projectiles) items.push({ y: p.y, draw: () => { const d = fxAtlas.data.fx.energy_bolt; drawFx({ d, x: p.x, y: p.y, z: 1.05, t: performance.now() / 1000, scale: 0.9, add: true, flip: Math.cos(p.a) < 0 }); } });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const u of f.units) if (u.hitFlash > 0) u.hitFlash -= dt;
    // effects
    fx = fx.filter((e) => { if (e.follow) { e.x = e.follow.x; e.y = e.follow.y; } e.t += dt; return drawFx(e); });
    // the art's dimming: everything but the moment fades back
    if (dim > 0.01) { ctx.fillStyle = `rgba(8,6,16,${0.35 * dim})`; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); dim *= art ? 1 : Math.exp(-dt * 4); if (art) { const p = P(art.x, art.y); drawUnit(art, f, 0); for (const e of fx) if (e.follow === art) drawFx(e); } }
    // damage numbers
    ctx.font = '8px "Silkscreen", monospace'; ctx.textAlign = 'center';
    floaters = floaters.filter((n) => { n.t += dt; const p = P(n.x, n.y, n.z + n.t * 0.9); ctx.globalAlpha = Math.max(0, 1 - n.t / 0.9); ctx.fillStyle = '#120c0a'; ctx.fillText(n.text, p.x + 1, p.y + 1); ctx.fillStyle = n.col; ctx.fillText(n.text, p.x, p.y); ctx.globalAlpha = 1; return n.t < 0.9; });
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashCol},${flashA})`; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); flashA *= Math.exp(-dt * 8); }
    // up to the screen, crisp
    out.imageSmoothingEnabled = false;
    out.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }

  // which bandit is under a tap (screen pixels in the canvas)
  function pick(f, cx, cy) {
    const r = canvas.getBoundingClientRect(), bx = (cx - r.left) / r.width * buf.width, by = (cy - r.top) / r.height * buf.height;
    let best = null, bd = 1e9;
    for (const u of f.units) {
      if (u.team === 'hero' || u.state === 'ko' || u.fled || u.def.noncombat) continue;
      const p = P(u.x, u.y), k = cam.zoom;
      if (bx < p.x - 14 * k || bx > p.x + 14 * k || by < p.y - 50 * k || by > p.y + 6 * k) continue;
      const d = Math.abs(bx - p.x) + Math.abs(by - (p.y - 22 * k));
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  return { resize, draw, pick, reset() { fx = []; floaters = []; anim.clear(); dim = 0; flashA = 0; cam.zoom = 1; } };
}
