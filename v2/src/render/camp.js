// The camp at night, behind the title, the camp menu and the team screen: a fire, the company living
// round it (whoever has joined so far: drilling, resting, sleeping) and the embers. Same pixel look as the battles: drawn into a
// small buffer and scaled up without smoothing.
import { framesOf } from './assets.js';
import { DIRS } from '../data/anims.js';

const BUF_H = 168, PPM = 26, SQUASH = 0.6;

// The Stronghold around the fire: where each building stands (metres from the fire) and what it looks
// like (world-atlas pieces at two pixels per pixel): its main piece from level 1, a second from 3,
// a brazier from 5. The rank adds a palisade (12), flags at the gate (24) and banners all round (36).
const SPOTS = { barracks: [-4.6, -3.4], hall: [-2.1, -4.1], shrine: [2.2, -4.1], forge: [4.8, -3.2], yard: [-5.4, 1.2], treasury: [5.4, 1.0] };
const PIECES = { barracks: ['cd_war_tent_red', 'cd_war_tent_blue'], hall: ['cd_banner_red', 'cd_weapon_rack'], shrine: ['cd_statue_gold', 'cd_candelabra'],
  forge: ['cd_forge', 'cd_anvil'], yard: ['cd_training_dummy', 'cd_archery_target'], treasury: ['cd_chest_gold', 'cd_barrel'] };

export function createCamp(canvas, fxAtlas, world = null) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d');
  let cast = [], t = 0, ground = null, focusX = 0.62, keep = {}, rank = 0, keepKey = '';
  const fire = { x: 2.6, y: 0.4 };

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    buf.height = BUF_H; buf.width = Math.max(200, Math.round(BUF_H * r.width / Math.max(1, r.height)));
    ground = null;
  }
  // the camera puts the fire at focusX of the width, leaving room for the menu
  const P = (x, y, z = 0) => ({ x: Math.round(buf.width * focusX + (x - fire.x) * PPM), y: Math.round(buf.height * 0.58 + (y - fire.y) * PPM * SQUASH - z * PPM * 0.92) });

  function buildGround() {
    const g = document.createElement('canvas'); g.width = buf.width; g.height = buf.height;
    const c = g.getContext('2d');
    let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    c.fillStyle = '#16231b'; c.fillRect(0, 0, g.width, g.height);
    for (let i = 0; i < 1400; i++) { c.fillStyle = r() < 0.5 ? '#1b2a20' : '#121c16'; c.fillRect((r() * g.width) | 0, (r() * g.height) | 0, 2 + ((r() * 3) | 0), 1); }
    // the trampled circle around the fire
    const f = P(fire.x, fire.y);
    for (let i = 0; i < 1600; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.4 * PPM;
      c.fillStyle = r() < 0.5 ? '#2a2a1e' : '#222519'; c.fillRect((f.x + Math.cos(a) * d) | 0, (f.y + Math.sin(a) * d * SQUASH) | 0, 2, 1);
    }
    // a tent (until the Barracks stand) and the treeline behind
    const tent = P(fire.x - 4.4, fire.y - (keep.barracks ? 99 : 2.6));
    c.fillStyle = '#3d3326'; c.beginPath(); c.moveTo(tent.x - 26, tent.y); c.lineTo(tent.x, tent.y - 30); c.lineTo(tent.x + 26, tent.y); c.fill();
    c.fillStyle = '#4c4030'; c.beginPath(); c.moveTo(tent.x - 26, tent.y); c.lineTo(tent.x, tent.y - 30); c.lineTo(tent.x - 4, tent.y); c.fill();
    c.fillStyle = '#120e0a'; c.beginPath(); c.moveTo(tent.x - 6, tent.y); c.lineTo(tent.x, tent.y - 16); c.lineTo(tent.x + 6, tent.y); c.fill();
    for (let x = -10; x < g.width + 20; x += 9 + r() * 8) {
      const y = 10 + r() * 16, s = 0.8 + r() * 0.6;
      c.fillStyle = '#0b130e'; c.beginPath(); c.arc(x, y, 16 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0f1a13'; c.beginPath(); c.arc(x - 3, y - 3, 9 * s, 0, Math.PI * 2); c.fill();
    }
    // logs by the fire
    for (const [dx, dy] of [[-1.5, 0.9], [1.6, 1.1], [0.2, -1.4]]) {
      const p = P(fire.x + dx, fire.y + dy);
      c.fillStyle = '#3a2618'; c.fillRect(p.x - 9, p.y - 2, 18, 4); c.fillStyle = '#5a3c24'; c.fillRect(p.x - 9, p.y - 2, 18, 1); c.fillStyle = '#7a5a3a'; c.fillRect(p.x + 8, p.y - 2, 2, 4);
    }
    const fp = P(fire.x, fire.y);
    c.fillStyle = '#4a4a44'; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; c.fillRect((fp.x + Math.cos(a) * 9) | 0, (fp.y + Math.sin(a) * 5) | 0, 3, 2); }
    ground = g;
  }

  function fx(name, x, y, z, time, scale = 1, add = true, flip = false) {
    const d = fxAtlas.data.fx[name]; if (!d) return;
    const n = d.frames.length, fr = d.frames[Math.floor(time * d.fps) % n]; if (!fr) return;
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = d.anchor, p = P(x, y, z);
    ctx.save(); if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(Math.round(p.x), Math.round(p.y)); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(fxAtlas.pages[pg], sx, sy, w, h, Math.round((ox - ax) * scale), Math.round((oy - ay) * scale), Math.round(w * scale), Math.round(h * scale));
    ctx.restore();
  }
  const dirTo = (a, b) => { const f = Math.atan2(b.y - a.y, b.x - a.x); return DIRS[((Math.round(Math.atan2(Math.sin(f) * SQUASH, Math.cos(f)) / (Math.PI / 4)) % 8) + 8) % 8]; };

  // ---- the company at rest. Each hero takes turns at a class's own drill (sword work at a dummy, arrows at
  // a target, spells, tending the wounded) and resting (sitting by the fire, sleeping, stretching, a stroll).
  // A hero has a station of their own round the fire; their drill's dummy or target stands beside it.
  const STATIONS = [[-3.0, 1.0], [3.2, 0.9], [-1.3, 2.4], [1.7, 2.5], [-4.4, -0.7], [4.6, -0.5], [-0.4, -2.2], [5.4, 2.1], [-5.4, 1.9], [0.3, 3.3]];
  const DRILL = { vanguard: 'train', striker: 'train', ranger: 'archery', mystic: 'study', support: 'tend' };
  const REST = ['sit', 'sleep', 'stretch', 'stroll', 'sit'];
  function setCast(list) {
    cast = list.map((c, i) => {
      const [dx, dy] = STATIONS[i % STATIONS.length], side = dx < 0 ? -1 : 1, home = { x: fire.x + dx, y: fire.y + dy };
      const drill = DRILL[c.cls] || 'stretch';
      // the drill's kit, on the outer side of the station
      const kit = drill === 'train' ? { name: 'cd_training_dummy', x: home.x + side * 1.1, y: home.y } : drill === 'archery' ? { name: 'cd_archery_target', x: home.x + side * 3.4, y: home.y - 0.3 } : null;
      const m = { set: c.set, cls: c.cls, x: home.x, y: home.y, home, kit, drill, i, f: fire, phase: i * 0.37, act: null, t: 0, dur: 0, to: null, fx: [] };
      pick(m, i % 2 ? 'sit' : drill, true);
      return m;
    });
  }
  // the next thing to do: drill and rest by turns; a walk first if it happens somewhere else
  function pick(m, act, now) {
    m.act = act; m.t = 0; m.dur = act === 'sleep' ? 14 + (m.i % 3) * 3 : 9 + ((m.i * 7) % 5);
    const spot = act === 'sit' || act === 'tend' ? { x: fire.x + (m.home.x - fire.x) * 0.7, y: fire.y + (m.home.y - fire.y) * 0.7 }
      : act === 'stroll' ? { x: m.home.x + (m.i % 2 ? 2.2 : -2.2), y: m.home.y + 0.6 } : m.home;
    if (now) { m.x = spot.x; m.y = spot.y; m.to = null; } else m.to = spot;
  }
  function think(m, dt) {
    if (m.to) {   // walking to the next spot
      const dx = m.to.x - m.x, dy = m.to.y - m.y, d = Math.hypot(dx, dy), st = 1.6 * dt;
      if (d <= st) { m.x = m.to.x; m.y = m.to.y; m.to = null; m.t = 0; } else { m.x += (dx / d) * st; m.y += (dy / d) * st; }
      return;
    }
    m.t += dt;
    if (m.act === 'stroll' && m.t > 3.2) { m.to = { x: m.x > m.home.x ? m.home.x - 2.2 : m.home.x + 2.2, y: m.home.y + 0.6 }; }
    if (m.t >= m.dur) pick(m, m.act === m.drill ? REST[(m.i + Math.floor(t / 10)) % REST.length] : m.drill);
  }
  // what the body is doing now: [clip, fps, loop, facing point, frame time]
  function pose(m) {
    const at = m.to ? m.to : m.kit && (m.act === 'train' || m.act === 'archery') ? m.kit : m.act === 'stroll' ? { x: m.x + 1, y: m.y } : fire;
    if (m.to) return ['Walk', 10, true, at, t];
    const c = (m.t + m.phase) % 3.6;
    if (m.act === 'train') return c < 1.2 ? ['Attack1', 12, false, at, c] : c < 2.4 ? ['Attack2', 12, false, at, c - 1.2] : ['Idle3', 7, true, at, c];
    if (m.act === 'archery') return c < 1.4 ? [m.set.data.anims.Attack3 ? 'Attack3' : 'Attack1', 10, false, at, c] : ['Idle3', 7, true, at, c];
    if (m.act === 'study') return c < 2 ? ['Special1', 8, false, at, c] : ['Idle3', 7, true, at, c];
    if (m.act === 'tend' || m.act === 'sit') return ['CrouchIdle', 6, true, at, m.t + m.phase];
    if (m.act === 'sleep') return ['Die', 10, false, at, 9];
    if (m.act === 'stretch') return (m.t % 6) < 2 ? ['Taunt', 9, false, at, m.t % 6] : ['Idle2', 7, true, at, m.t];
    return ['Idle3', 7, true, at, t];
  }
  function drawMember(m) {
    const [clip, fps, loop, at, ct] = pose(m), dir = dirTo(m, at);
    const frames = framesOf(m.set, clip, dir) || framesOf(m.set, 'Idle', dir); if (!frames) return;
    let i = Math.floor(ct * fps); i = loop ? i % frames.length : Math.min(frames.length - 1, i);
    const [pg, sx, sy, w, h, ox, oy] = frames[i], [ax, ay] = m.set.data.anchor;
    const k = Math.min(1.25, m.set.cfg.scale || 1), p = P(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(m.set.pages[pg], sx, sy, w, h, Math.round(p.x + (ox - ax) * k), Math.round(p.y + (oy - ay) * k), Math.round(w * k), Math.round(h * k));
    // the drill's little effects: a spark on the dummy, an arrow in flight, a spell's glow, a healer's light, a sleeper's z
    const c = (m.t + m.phase) % 3.6;
    if (!m.to && m.act === 'train' && m.kit && ((c > 0.45 && c < 0.6) || (c > 1.65 && c < 1.8))) fx('hit_slash', m.kit.x, m.kit.y, 1.0, c * 3, 0.8);
    if (!m.to && m.act === 'archery' && m.kit && c > 0.7 && c < 1.3) { const u = (c - 0.7) / 0.6; fx('arrow', m.x + (m.kit.x - m.x) * u, m.y + (m.kit.y - m.y) * u, 1.0, 0, 0.8, false, m.kit.x < m.x); }
    if (!m.to && m.act === 'study' && c < 2) fx('arcane_orb', m.x, m.y, 1.2, c, 0.7);
    if (!m.to && m.act === 'tend' && (m.t % 4) < 1) fx('heal', m.x, m.y, 0.9, m.t % 4, 0.9);
    if (!m.to && m.act === 'sleep') {
      ctx.font = '7px "Silkscreen", monospace'; ctx.fillStyle = 'rgba(220,230,255,0.85)';
      for (let z = 0; z < 2; z++) { const u = ((t * 0.5 + z * 0.5 + m.phase) % 1), q = P(m.x + 0.3 + u * 0.4, m.y, 1.0 + u * 0.8); ctx.globalAlpha = 1 - u; ctx.fillText('z', q.x, q.y); }
      ctx.globalAlpha = 1;
    }
  }

  function draw(dt) {
    t += dt;
    if (!ground) buildGround();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0);
    // firelight on the ground
    const f = P(fire.x, fire.y), fl = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.03;
    const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 95 * fl);
    gl.addColorStop(0, 'rgba(255,160,70,0.42)'); gl.addColorStop(0.5, 'rgba(200,90,40,0.13)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(0, 0, buf.width, buf.height); ctx.restore();
    for (const m of cast) think(m, dt);
    const items = cast.map((m) => ({ y: m.y, draw: () => drawMember(m) }));
    for (const m of cast) if (m.kit) items.push({ y: m.kit.y, draw: () => piece(m.kit.name, m.kit.x, m.kit.y, 1.4) });
    items.push({ y: fire.y, draw: () => fx('campfire', fire.x, fire.y, 0.25, t, 1.1) });
    for (const it of buildings()) items.push(it);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    fx('embers', fire.x, fire.y, 1.4, t, 1.2);
    // night around the edges
    const v = ctx.createRadialGradient(f.x, f.y, 40, f.x, f.y, buf.width * 0.75);
    v.addColorStop(0, 'rgba(4,8,10,0)'); v.addColorStop(1, 'rgba(4,8,10,0.72)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, buf.width, buf.height);
    out.imageSmoothingEnabled = false;
    out.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }
  // ---- the Stronghold's pieces, as items to sort with the cast
  function piece(name, x, y, k = 2) {
    const sp = world && world.data.sprites[name]; if (!sp) return;
    const p = P(x, y), w = sp[3] * k, hh = sp[4] * k;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(world.pages[sp[0]], sp[1], sp[2], sp[3], sp[4], Math.round(p.x - w / 2), Math.round(p.y - hh), w, hh);
  }
  function glow(x, y, z, r) {
    const p = P(x, y, z), g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * (1 + Math.sin(t * 8 + x) * 0.05));
    g.addColorStop(0, 'rgba(255,150,60,0.4)'); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2); ctx.restore();
  }
  function buildings() {
    const out = [], fx0 = fire.x, fy0 = fire.y;
    for (const [id, [dx, dy]] of Object.entries(SPOTS)) {
      const l = keep[id] || 0; if (!l) continue;
      const [a, b] = PIECES[id], x = fx0 + dx, y = fy0 + dy;
      out.push({ y, draw: () => piece(a, x, y) });
      if (l >= 3) out.push({ y: y + 0.2, draw: () => piece(b, x + (dx < 0 ? 1.0 : -1.0), y + 0.2) });
      if (l >= 5) out.push({ y: y + 0.4, draw: () => { piece('cd_brazier', x + (dx < 0 ? -0.9 : 0.9), y + 0.4, 1); glow(x + (dx < 0 ? -0.9 : 0.9), y + 0.4, 0.5, 18); } });
    }
    // the palisade behind the camp, flags at its gate, banners along it
    if (rank >= 12) for (let x = -11; x <= 11; x += 0.62) if (Math.abs(x) > 0.9) out.push({ y: fy0 - 5.2, draw: () => piece('prop_fence_h', fx0 + x, fy0 - 5.2, 1) });
    if (rank >= 24) for (const sx of [-1.2, 1.2]) out.push({ y: fy0 - 5.1, draw: () => piece('cd_flagpole_red', fx0 + sx, fy0 - 5.1, 2) });
    if (rank >= 36) for (let x = -8; x <= 8; x += 4) if (x) out.push({ y: fy0 - 5.15, draw: () => piece('cd_banner_blue', fx0 + x, fy0 - 5.15, 2) });
    return out;
  }
  function setKeep(k, r) { const key = JSON.stringify(k) + r; if (key === keepKey) return; keepKey = key; keep = Object.assign({}, k); rank = r; ground = null; }
  return { resize, draw, setCast, setKeep, setFocus(f) { if (f !== focusX) { focusX = f; ground = null; } } };
}
