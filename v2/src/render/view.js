// Draws a battle from a fixed, angled top-down camera, at pixel resolution: the scene is drawn into
// a small buffer (one sprite pixel = one buffer pixel at rest) and scaled up without smoothing.
// World: x east, y south (towards the viewer), metres. Screen: x right, y down.
import { framesOf, CLIPS, PHASES } from './assets.js';
import { DIRS } from '../data/anims.js';

const BUF_H = 232, PPM = 26, SQUASH = 0.6, LIFT = 0.92;
const CAST_POINT = 0.45;

export function createView(canvas, fxAtlas) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d'), tmp = document.createElement('canvas');
  const cam = { x: 0, y: 0.2, zoom: 1, shake: 0 };
  const anim = new Map();
  let sprites = {}, fx = [], floaters = [], banners = [], ground = null, flashA = 0, flashCol = '255,255,255';

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    buf.height = BUF_H; buf.width = Math.max(200, Math.round(BUF_H * r.width / Math.max(1, r.height)));
  }
  const S = () => PPM * cam.zoom;
  const P = (x, y, z = 0) => ({ x: Math.round(buf.width / 2 + (x - cam.x) * S()), y: Math.round(buf.height * 0.55 + (y - cam.y) * S() * SQUASH - z * S() * LIFT) });

  // ---- the ground: a meadow road for now (regions bring their own later)
  function buildGround(field) {
    const pad = 7, gw = Math.round((field.w + pad * 2) * PPM), gh = Math.round((field.h + pad * 2) * PPM * SQUASH);
    const g = document.createElement('canvas'); g.width = gw; g.height = gh;
    const c = g.getContext('2d');
    let seed = 41; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    c.fillStyle = '#4d7f3f'; c.fillRect(0, 0, gw, gh);
    for (let i = 0; i < 1600; i++) { c.fillStyle = r() < 0.5 ? '#578a46' : '#44733a'; c.fillRect((r() * gw) | 0, (r() * gh) | 0, 2 + ((r() * 4) | 0), 1); }
    // a dirt road across the field
    const cy = gh / 2;
    for (let i = 0; i < 4200; i++) {
      const x = r() * gw, y = cy + (r() - 0.5) * (field.h * 0.8 * PPM * SQUASH) * (0.6 + 0.4 * Math.sin(x / 40));
      c.fillStyle = r() < 0.6 ? '#857f4b' : r() < 0.5 ? '#766f42' : '#938757'; c.fillRect(x | 0, y | 0, 2, 1);
    }
    for (let i = 0; i < 200; i++) {
      const x = (r() * gw) | 0, y = (r() * gh) | 0, k = r();
      if (k < 0.7) { c.fillStyle = '#2f5528'; c.fillRect(x, y, 1, 2); c.fillRect(x + 2, y + 1, 1, 1); c.fillStyle = '#5c8c45'; c.fillRect(x + 1, y - 1, 1, 2); }
      else if (k < 0.88) { c.fillStyle = '#7c7a70'; c.fillRect(x, y, 3, 2); c.fillStyle = '#a3a092'; c.fillRect(x, y, 2, 1); }
      else { c.fillStyle = r() < 0.5 ? '#e8d27a' : '#d98fb0'; c.fillRect(x, y, 1, 1); }
    }
    ground = { canvas: g, ox: -field.w / 2 - pad, oy: -field.h / 2 - pad, field };
  }
  const TREES = (() => { let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const t = [];
    for (let i = 0; i < 30; i++) t.push([-15 + i * 1.05 + r() * 0.6, -4.6 - r() * 1.6, 0.9 + r() * 0.4, r() < 0.5]);
    return t; })();
  function tree(x, y, size, k) {
    const p = P(x, y), s = S() / PPM * size;
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(p.x - 2 * s, p.y - 14 * s, 4 * s, 14 * s);
    const blobs = [[0, -30, 15], [-9, -22, 11], [9, -23, 11], [-4, -38, 10], [6, -35, 9]];
    for (const [dx, dy, rr] of blobs) { ctx.fillStyle = k ? '#1d3a22' : '#24452a'; ctx.beginPath(); ctx.arc(p.x + dx * s, p.y + dy * s, rr * s, 0, Math.PI * 2); ctx.fill(); }
    for (const [dx, dy, rr] of blobs.slice(0, 3)) { ctx.fillStyle = '#2f5a34'; ctx.beginPath(); ctx.arc(p.x + (dx - 3) * s, p.y + (dy - 4) * s, rr * 0.55 * s, 0, Math.PI * 2); ctx.fill(); }
  }

  // ---- sprites
  const dirOf = (f) => DIRS[((Math.round(Math.atan2(Math.sin(f) * SQUASH, Math.cos(f)) / (Math.PI / 4)) % 8) + 8) % 8];
  function drawFrame(set, fr, x, y, k, alpha = 1, tint) {
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = set.data.anchor;
    const dx = Math.round(x + (ox - ax) * k), dy = Math.round(y + (oy - ay) * k), dw = Math.round(w * k), dh = Math.round(h * k);
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.pages[pg], sx, sy, w, h, dx, dy, dw, dh);
    if (tint) {
      tmp.width = w; tmp.height = h; const t = tmp.getContext('2d');
      t.drawImage(set.pages[pg], sx, sy, w, h, 0, 0, w, h); t.globalCompositeOperation = 'source-in'; t.fillStyle = tint[0]; t.fillRect(0, 0, w, h);
      ctx.globalAlpha = tint[1]; ctx.drawImage(tmp, dx, dy, dw, dh);
    }
    ctx.globalAlpha = 1;
  }
  function phaseFrame(clip, t, wind, active, recover) {
    const ph = PHASES[clip] || PHASES.Attack1;
    if (t < wind) return ph.windup[0] + (ph.windup[1] - ph.windup[0]) * (t / Math.max(0.01, wind));
    if (t < wind + active) return ph.strike[0];
    return ph.recover[0] + (ph.recover[1] - ph.recover[0]) * Math.min(1, (t - wind - active) / Math.max(0.01, recover));
  }
  function pose(u) {
    const set = sprites[u.def.set], cfg = set.cfg;
    if (u.state === 'attack' && u.act) {
      const list = u.def.attack.projectile ? [cfg.cast || (cfg.attacks || ['Attack1'])[0]] : cfg.attacks || ['Attack1', 'Attack2'];
      const clip = list[(u.combo || 0) % list.length];
      return { clip, phase: phaseFrame(clip, u.st, u.act.wind, u.act.active, u.act.recover) };
    }
    if (u.state === 'cast') { const clip = cfg.heavy || 'Special1'; return { clip, phase: phaseFrame(clip, u.st, CAST_POINT, 0.06, 0.2) }; }
    if (u.state === 'stun') return { clip: 'TakeDamage', fixed: 2 };
    if (u.hitT > 0 && u.state !== 'ko') return { clip: 'TakeDamage', timed: 1 - u.hitT / 0.22 };
    const name = { ko: 'ko', victory: 'victory', move: u.s.move > 3.9 ? 'run' : 'walk' }[u.state] || 'idle';
    const [clip, fps, loop] = CLIPS[name];
    return { clip: name === 'idle' && cfg.stance ? cfg.stance : clip, fps, loop };
  }
  function drawUnit(u, dt) {
    const set = sprites[u.def.set]; if (!set) return;
    const k = (set.cfg.scale || 1) * (u.def.scale || 1) * cam.zoom, p = P(u.x, u.y);
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
    ctx.fillStyle = 'rgba(10,18,8,0.38)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3.2 * k, 0, 0, Math.PI * 2); ctx.fill();
    if (u.state !== 'ko') { ctx.strokeStyle = u.team === 'ally' ? 'rgba(140,200,255,0.55)' : 'rgba(255,120,110,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * k, 3.6 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    const flash = u.flash > 0 ? ['#ffffff', Math.min(0.85, u.flash * 6)] : null;
    drawFrame(set, frames[i], p.x, p.y, k, u.state === 'ko' ? Math.max(0, 1 - Math.max(0, u.st - 0.8) * 0.8) : 1, flash);
    if (u.state === 'ko') return;
    // bars: health (shield over it in white), energy for the team
    const w = 18, x = p.x - w / 2, y = p.y - Math.round(50 * k);
    ctx.fillStyle = 'rgba(10,8,8,0.85)'; ctx.fillRect(x - 1, y - 1, w + 2, u.team === 'ally' ? 6 : 4);
    ctx.fillStyle = u.team === 'ally' ? '#6fcf6a' : '#d9534a'; ctx.fillRect(x, y, Math.max(1, Math.round(w * u.hp / u.max)), 2);
    if (u.shield > 0) { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(x, y, Math.max(1, Math.round(w * Math.min(1, u.shield / u.max))), 1); }
    if (u.team === 'ally') { ctx.fillStyle = u.energy >= 100 ? '#ffd36b' : '#c9a24a'; ctx.fillRect(x, y + 3, Math.round(w * u.energy / 100), 1); }
    if (u.statuses.some((s) => s.type === 'stun')) drawFxAt('star_burst', u.x, u.y, 1.9, performance.now() / 1000 % 0.35, 0.6);
  }

  // ---- effects
  function spawn(name, x, y, z, o = {}) { const d = fxAtlas.data.fx[name]; if (d) fx.push(Object.assign({ name, d, x, y, z, t: -(o.delay || 0), scale: 1 }, o)); }
  function drawFxAt(name, x, y, z, t, scale, o = {}) { const d = fxAtlas.data.fx[name]; if (d) drawFx(Object.assign({ d, x, y, z, t, scale }, o)); }
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
  const SWING = { slash: 'slash_r', dagger: 'dagger', thrust: 'thrust', blunt: 'hit_punch', claw: 'claw' };
  const HIT = { slash: 'hit_slash', dagger: 'hit_slash', thrust: 'hit_pierce', blunt: 'hit_blunt', claw: 'claw' };
  const GROUND = new Set(['shockwave', 'rock_burst', 'circle_arcane', 'circle_holy']);
  function onEvents(b) {
    const U = (id) => b.units.find((u) => u.id === id);
    for (const e of b.events) {
      const u = e.u && U(e.u);
      if (e.type === 'swing' && u && SWING[e.fx]) spawn(SWING[e.fx], u.x + Math.cos(u.f) * 0.7, u.y + Math.sin(u.f) * 0.7, 1.0, { flip: Math.cos(u.f) < 0, scale: 0.9 });
      else if (e.type === 'hit' && u) {
        if (!e.dot && HIT[e.fx]) spawn(HIT[e.fx], u.x, u.y, 1.0, { scale: e.crit ? 1.3 : 0.9 });
        u.flash = 0.1;
        floaters.push({ text: String(e.dmg), x: u.x, y: u.y, z: 1.9, t: 0, col: e.dot ? '#b9e07a' : e.crit ? '#ffd36b' : u.team === 'ally' ? '#ff8a7a' : '#fff2c8', big: e.crit });
        if (e.crit) cam.shake = Math.max(cam.shake, 1.6);
      } else if (e.type === 'impact' && e.fx) spawn(e.fx, e.x, e.y, 1.0, { add: !e.heal, scale: 0.9 });
      else if (e.type === 'heal' && u) { spawn('heal', u.x, u.y, 1.0, { add: true }); floaters.push({ text: '+' + e.amount, x: u.x, y: u.y, z: 1.9, t: 0, col: '#8fe08a' }); }
      else if (e.type === 'shield' && u) spawn('shield_bubble', u.x, u.y, 0.9, { add: true, life: Math.max(0.5, u.shieldT), follow: u, scale: 0.9 });
      else if (e.type === 'cast' && u) { spawn('spell_cast', u.x, u.y, 1.1, { add: true }); banners.push({ text: e.name, u, t: 0, team: u.team }); }
      else if (e.type === 'ability' && e.fx) {
        const g = GROUND.has(e.fx);
        spawn(e.fx, e.x, e.y, g ? 0.05 : 1.0, { add: true, ground: g, scale: g ? 2.2 : 1.6, life: 1.2 });
        flashA = Math.max(flashA, 0.18); cam.shake = Math.max(cam.shake, 2.4);
      } else if (e.type === 'blink' && u) { spawn('teleport', e.x0, e.y0, 0.9, { add: true }); spawn('teleport', u.x, u.y, 0.9, { add: true, delay: 0.05 }); }
      else if (e.type === 'summon' && u) spawn('summon', u.x, u.y, 0.6, { add: true, scale: 1.2 });
      else if (e.type === 'ko' && u) spawn('dust_cloud', u.x, u.y, 0.2, { scale: 1.1 });
    }
  }

  // ---- one frame
  function draw(b, dt) {
    if (!ground || ground.field !== b.field) buildGround(b.field);
    onEvents(b);
    cam.zoom = Math.min(1.08, buf.width / ((b.field.w + 1.2) * PPM));
    const shx = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0;
    cam.shake *= Math.exp(-dt * 9);
    ctx.setTransform(1, 0, 0, 1, Math.round(shx), Math.round(shy));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#16261a'; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16);
    const g0 = P(ground.ox, ground.oy);
    ctx.drawImage(ground.canvas, g0.x, g0.y, Math.round(ground.canvas.width * cam.zoom), Math.round(ground.canvas.height * cam.zoom));
    const items = [];
    for (const t of TREES) items.push({ y: t[1], draw: () => tree(t[0], t[1], t[2], t[3]) });
    for (const u of b.units) items.push({ y: u.y + (u.state === 'ko' ? -0.3 : 0), draw: () => drawUnit(u, dt) });
    for (const s of b.shots) items.push({ y: s.y, draw: () => drawFxAt(s.bolt, s.x, s.y, s.z, performance.now() / 1000, 0.8, { add: s.bolt !== 'arrow' && s.bolt !== 'rock', flip: Math.cos(s.a || 0) < 0 }) });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.draw();
    for (const u of b.units) if (u.flash > 0) u.flash -= dt;
    fx = fx.filter((e) => { if (e.follow) { e.x = e.follow.x; e.y = e.follow.y; if (e.follow.state === 'ko' || e.follow.shield <= 0 && e.name === 'shield_bubble') return false; } e.t += dt; return drawFx(e); });
    // ability names over the caster
    ctx.textAlign = 'center'; ctx.font = '8px "Silkscreen", monospace';
    banners = banners.filter((n) => { n.t += dt; const p = P(n.u.x, n.u.y, 2.5 + n.t * 0.3); ctx.globalAlpha = Math.max(0, Math.min(1, (1.4 - n.t) * 2)); ctx.fillStyle = '#120c0a'; ctx.fillText(n.text, p.x + 1, p.y + 1); ctx.fillStyle = n.team === 'ally' ? '#ffe7a8' : '#ffb0a8'; ctx.fillText(n.text, p.x, p.y); ctx.globalAlpha = 1; return n.t < 1.4; });
    floaters = floaters.filter((n) => { n.t += dt; const p = P(n.x, n.y, n.z + n.t * 0.9); ctx.globalAlpha = Math.max(0, 1 - n.t / 0.9); ctx.fillStyle = '#120c0a'; ctx.fillText(n.text, p.x + 1, p.y + 1); ctx.fillStyle = n.col; ctx.fillText(n.text, p.x, p.y); ctx.globalAlpha = 1; return n.t < 0.9; });
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashCol},${flashA})`; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); flashA *= Math.exp(-dt * 8); }
    out.imageSmoothingEnabled = false;
    out.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }
  return { resize, draw, setSprites(s) { sprites = s; }, reset() { fx = []; floaters = []; banners = []; anim.clear(); flashA = 0; } };
}
