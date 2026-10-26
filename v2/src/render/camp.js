// The camp at night, behind the title and the camp menu: a fire, the company standing around it
// (whoever has joined so far) and the embers. Same pixel look as the battles: drawn into a
// small buffer and scaled up without smoothing.
import { framesOf } from './assets.js';
import { DIRS } from '../data/anims.js';

const BUF_H = 168, PPM = 26, SQUASH = 0.6;

export function createCamp(canvas, fxAtlas) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d');
  let cast = [], t = 0, ground = null, focusX = 0.62;
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
    // a tent and the treeline behind
    const tent = P(fire.x - 4.4, fire.y - 2.6);
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

  function fx(name, x, y, z, time, scale = 1, add = true) {
    const d = fxAtlas.data.fx[name]; if (!d) return;
    const n = d.frames.length, fr = d.frames[Math.floor(time * d.fps) % n]; if (!fr) return;
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = d.anchor, p = P(x, y, z);
    ctx.save(); if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(fxAtlas.pages[pg], sx, sy, w, h, Math.round(p.x + (ox - ax) * scale), Math.round(p.y + (oy - ay) * scale), Math.round(w * scale), Math.round(h * scale));
    ctx.restore();
  }
  const dirTo = (a, b) => { const f = Math.atan2(b.y - a.y, b.x - a.x); return DIRS[((Math.round(Math.atan2(Math.sin(f) * SQUASH, Math.cos(f)) / (Math.PI / 4)) % 8) + 8) % 8]; };

  // who stands where: a ring around the fire, filling from the far side so the fire stays in view
  function setCast(sets) {
    const n = sets.length;
    cast = sets.map((set, i) => {
      const a = -Math.PI * 0.5 + (i - (n - 1) / 2) * (Math.PI * 2 / Math.max(n, 6)) * (n > 6 ? 1 : 0.9);
      const rr = 2.2 + (i % 2) * 0.25;
      return { set, x: fire.x + Math.cos(a) * rr * 1.25, y: fire.y + Math.sin(a) * rr, phase: i * 0.37 };
    });
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
    const items = cast.map((c) => ({ y: c.y, draw: () => {
      const dir = dirTo(c, fire), frames = framesOf(c.set, 'Idle3', dir) || framesOf(c.set, 'Idle', dir);
      if (!frames) return;
      const fr = frames[Math.floor((t + c.phase) * 7) % frames.length], [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = c.set.data.anchor;
      const k = Math.min(1.25, c.set.cfg.scale || 1), p = P(c.x, c.y);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(c.set.pages[pg], sx, sy, w, h, Math.round(p.x + (ox - ax) * k), Math.round(p.y + (oy - ay) * k), Math.round(w * k), Math.round(h * k));
    } }));
    items.push({ y: fire.y, draw: () => fx('campfire', fire.x, fire.y, 0.25, t, 1.1) });
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
  return { resize, draw, setCast, setFocus(f) { if (f !== focusX) { focusX = f; ground = null; } } };
}
