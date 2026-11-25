// The seven elements, drawn (boons and elemental foes): fire trails and blasts, frost crystals and ice, poison clouds,
// lightning arcs and bolts from the sky, blood motes, holy smites, rings and shields, void marks, rifts and sparks.
// A mixin on FX.prototype (installElements(FX)); importing this file installs it once fx.js has loaded.
//
// fx.elemFrame(world, dt, time) is called by the view every frame (view.js): it drains world.fxq (the sim's looks,
// sim_boons.js), draws the zones the boons own (zone.fxOwn), the statuses on every body (chill, freeze, shock,
// marks, brittle ice, blindness), the auras of elemental foes, the warden's shield, veil and crowns.
// Everything is sized for the 200 px buffer (16 px a metre): pixel points of 1-2 px, lines 1 px, solid shapes
// no thinner than a pixel; colours in the renderer's bright-additive range so they bloom.
import * as THREE from '../../vendor/three.module.min.js';
import * as T from './textures.js';
import { installInterlude } from './fx_interlude.js';

const TAU = Math.PI * 2;
export const EL_COL = {
  fire: [3.0, 1.15, 0.22], frost: [1.2, 2.2, 3.1], poison: [0.85, 2.5, 0.3], storm: [2.8, 2.6, 1.2], blood: [2.8, 0.22, 0.3],
  holy: [3.1, 2.7, 1.5], void: [1.6, 0.45, 2.8], steam: [1.9, 2.0, 2.1],
};
const HOT = { fire: [3.4, 2.4, 0.9], frost: [2.8, 3.0, 3.2], poison: [1.8, 3.0, 1.0], storm: [3.2, 3.2, 3.4], blood: [3.2, 1.0, 1.0], holy: [3.4, 3.2, 2.6], void: [2.6, 1.6, 3.2], steam: [2.6, 2.6, 2.6] };
const add = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
const dark = (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, fog: false, side: THREE.DoubleSide });
const flat = (m, y = 0.05) => { m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
const G = {}; const geo = (k, f) => { if (!G[k]) { G[k] = f(); G[k].userData.keep = true; } return G[k]; };
function drop(o) { if (!o) return; o.parent && o.parent.remove(o); o.traverse((c) => { if (c.geometry && !c.isSprite && !c.geometry.userData.keep) c.geometry.dispose(); if (c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; for (const m of ms) if (!m.userData.keep) m.dispose(); } }); }
const rnd = Math.random;

// a jagged polyline from a to b (lightning), or a lazy wave (fire leaping)
function zig(x0, y0, z0, x1, y1, z1, n, amp, wave) {
  const pts = []; const dx = x1 - x0, dz = z1 - z0; const L = Math.hypot(dx, dz) || 1; const px = -dz / L, pz = dx / L;
  for (let i = 0; i <= n; i++) {
    const k = i / n; const end = i === 0 || i === n; const o = end ? 0 : (wave ? Math.sin(k * Math.PI) * amp * (wave > 0 ? 1 : -1) : (rnd() - 0.5) * 2 * amp);
    pts.push(x0 + dx * k + px * o, y0 + (y1 - y0) * k + (end ? 0 : (wave ? Math.sin(k * Math.PI) * amp * 0.8 : (rnd() - 0.5) * amp)), z0 + dz * k + pz * o);
  }
  return pts;
}

const M = {
  // ---------------------------------------------------------------- the frame
  elemFrame(world, dt, time = performance.now() / 1000) {
    if (!world) return;
    const E = this._E || (this._E = { arcs: [], cols: [], motes: [], zv: new Map(), ents: new Map(), meteors: [], flames: [], t: 0 });
    E.t += dt;
    const q = world.fxq; if (q && q.length) { for (const o of q) this._elQ(o, world); q.length = 0; }
    this._elZones(world.zones, dt, time);
    this._elBodies(world, dt, time);
    this._elHazards(world.hazards, dt);
    this._elUpdate(dt, time);
  },

  // one look from the sim
  _elQ(o, world) {
    const k = o.k;
    if (k === 'arc') this.elArc(o.x0, o.z0, o.x1, o.z1, o.el || 'storm', o);
    else if (k === 'sky') this.elSky(o.x, o.z, o.el || 'storm', o.small);
    else if (k === 'smite') this.elSmite(o.x, o.z, o.warn || 0.22);
    else if (k === 'meteor') this.elMeteor(o.x, o.z, o.warn || 0.35);
    else if (k === 'burst') this.elBurst(o.x, o.z, o.el, o.r || 2, o.big);
    else if (k === 'shatter') this.elShatter(o.x, o.z);
    else if (k === 'mote' && o.e) this.elMote(o.x, o.z, o.e);
    else if (k === 'unmake') this.elUnmake(o.x, o.z, o.el);
    else if (k === 'unmakeBurst') this.elImplode(o.x, o.z, o.r || 2, o.big);
    else if (k === 'freeze' && o.e) this.elBurst(o.e.x, o.e.z, 'frost', 1.2, false);
    else if (k === 'brittle' && o.e) this.elBurst(o.e.x, o.e.z, 'frost', (o.e.r || 1) + 1, false);
    else if (k === 'heal' && o.e) { const c = o.el === 'poison' ? EL_COL.poison : [3, 0.5, 0.55]; this.emit(o.e.x, 0.4, o.e.z, { n: Math.min(10, 2 + Math.round(o.amt || 3)), speed: 0.3, up: 0.3, vy: 1.8, life: 0.6, grav: -0.5, color: c, size: 1, jit: 0.6 }); }
    else if (k === 'shieldUp' && o.e) { this.shockRing && this.shockRing(o.e.x, o.e.z, 1.3, EL_COL.holy, 0.35); this.emit(o.e.x, 1, o.e.z, { n: 14, speed: 1.4, up: 0.6, life: 0.4, grav: 0, color: HOT.holy, size: 1, jit: 0.3 }); }
    else if (k === 'shieldHit' && o.e) { const s = this._elEnt(o.e); s.shieldFlash = 0.18; }
    else if (k === 'shieldBreak' && o.e) { this.emit(o.e.x, 1.0, o.e.z, { n: 26, speed: 3.2, up: 0.8, life: 0.45, grav: 9, color: HOT.holy, size: 2, jit: 0.4 }); this.shockRing && this.shockRing(o.e.x, o.e.z, 2.2, EL_COL.holy, 0.3); }
    else if (k === 'veil' && o.e) this.emit(o.e.x, 0.9, o.e.z, { n: 18, speed: 1.1, up: 0.5, life: 0.5, grav: -0.5, color: [0.7, 0.2, 1.3], size: 2, alpha: 0.7, jit: 0.5 });
  },

  // ---------------------------------------------------------------- lightning, fire leaps
  elArc(x0, z0, x1, z1, el = 'storm', o = {}) {
    const E = this._E; const y = o.ground ? 0.25 : 1.05; const fire = el === 'fire';
    const n = Math.max(4, Math.min(14, Math.round(Math.hypot(x1 - x0, z1 - z0) * 2.2)));
    const mk = (c, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: op, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; l.renderOrder = 6; this.group.add(l); return l; };
    const core = mk(fire ? HOT.fire : HOT.storm, 1), glow = mk(fire ? EL_COL.fire : EL_COL[el] || EL_COL.storm, 0.9), glow2 = mk(fire ? EL_COL.fire : EL_COL[el] || EL_COL.storm, o.big ? 0.9 : 0.7); // three strands: a 2-3 px bolt in the buffer
    const life = o.ground ? 0.38 : (fire ? 0.3 : 0.24);
    E.arcs.push({ core, glow, glow2, x0, z0, x1, z1, y, n, t: 0, life, re: 0, fire, side: rnd() < 0.5 ? 1 : -1, big: !!o.big });
    const c = fire ? EL_COL.fire : HOT.storm;
    this.emit(x1, y, z1, { n: fire ? 6 : 8, speed: 2.4, up: 0.8, life: 0.25, grav: 6, color: c, size: 1 });
    if (o.ground) for (let i = 0; i < 8; i++) { const k = rnd(); this.emit(x0 + (x1 - x0) * k, 0.15, z0 + (z1 - z0) * k, { n: 1, speed: 1.6, up: 1.2, life: 0.3, grav: 6, color: HOT.storm, size: 1 }); }
  },
  elSky(x, z, el = 'storm', small = false) {
    const E = this._E; const n = small ? 7 : 10; const top = small ? 6 : 13;
    const mk = (c, op, dx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: op, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; l.renderOrder = 6; l.userData.dx = dx; this.group.add(l); return l; };
    // two strands a pixel apart: a 2 px bolt in the buffer, white in the middle, yellow at the edge
    const core = mk(HOT.storm, 1, 0), glow = mk(EL_COL.storm, 0.9, 0.07);
    const flash = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), add(EL_COL.storm, 0.35)), 0.04); flash.position.set(x, 0.04, z); flash.scale.setScalar(small ? 0.6 : 1.0); this.group.add(flash);
    E.arcs.push({ core, glow, sky: true, x0: x + (rnd() - 0.5) * 2, z0: z + (rnd() - 0.5) * 2, x1: x, z1: z, top, n, t: 0, life: 0.22, re: 0, flash });
    this.emit(x, 0.1, z, { n: small ? 10 : 22, speed: 3.2, up: 1.4, life: 0.4, grav: 8, color: HOT.storm, size: 1 });
    if (!small && this.shockRing) this.shockRing(x, z, 1.2, [1.4, 1.3, 0.6], 0.2);
  },

  // ---------------------------------------------------------------- holy smite: a column of light comes down
  elSmite(x, z, warn = 0.22) {
    const E = this._E; const g = new THREE.Group(); g.position.set(x, 0, z); this.group.add(g);
    const colTex = this._colTex || (this._colTex = T.glow('#ffffff', 16, 1.2));
    const inner = new THREE.Mesh(geo('smCol', () => { const b = new THREE.BoxGeometry(0.34, 9, 0.34); b.translate(0, 4.5, 0); return b; }), add([3.2, 2.6, 1.3], 0));
    const outer = new THREE.Mesh(geo('smCol2', () => { const b = new THREE.BoxGeometry(0.9, 9, 0.9); b.translate(0, 4.5, 0); return b; }), add(EL_COL.holy, 0));
    const ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.holy, 0.8)), 0.05);
    const disc = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), add(EL_COL.holy, 0)), 0.04);
    const pencil = new THREE.Mesh(geo('smPen', () => { const b = new THREE.BoxGeometry(0.07, 9, 0.07); b.translate(0, 4.5, 0); return b; }), add(HOT.holy, 0.9));
    g.add(inner, outer, ring, disc, pencil);
    E.cols.push({ g, inner, outer, ring, disc, pencil, warn, t: 0, life: warn + 0.45, hit: false, x, z, colTex });
  },
  elMeteor(x, z, warn = 0.35) {
    const E = this._E; const a = rnd() * TAU; const sx = x + Math.sin(a) * 3, sz = z + Math.cos(a) * 3;
    const m = new THREE.Mesh(geo('meteor', () => new THREE.BoxGeometry(0.32, 0.32, 0.32)), add(HOT.fire, 1)); this.group.add(m);
    const ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.fire, 0.6)), 0.05); ring.position.set(x, 0.05, z); this.group.add(ring);
    E.meteors.push({ m, ring, sx, sz, x, z, t: 0, warn });
  },

  // ---------------------------------------------------------------- bursts
  elBurst(x, z, el = 'fire', r = 2, big = false) {
    const c = EL_COL[el] || EL_COL.fire, h = HOT[el] || HOT.fire; const n = big ? 2 : 1;
    if (this.shockRing) this.shockRing(x, z, r, c, big ? 0.5 : 0.32);
    if (el === 'fire') {
      const E = this._E; const nf = Math.min(7, Math.round(2 + r * 1.5) * n);
      for (let i = 0; i < nf; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.8; const f = this._flame(x + Math.sin(a) * d, z + Math.cos(a) * d, 0.9 + rnd() * 0.8 * n); this.group.add(f); E.flames.push({ f, t: -rnd() * 0.08, life: 0.45 + rnd() * 0.3 }); }
      this.emit(x, 0.15, z, { n: 26 * n, speed: 1.6, up: 2.4, vy: 2.6, life: 0.6, grav: -2.5, color: c, colorVar: 0.25, size: 2, jit: r * 0.8 });
      this.emit(x, 0.3, z, { n: 14 * n, speed: 3.6 * Math.sqrt(r / 2), up: 0.8, life: 0.4, grav: 6, color: h, size: 1, jit: 0.3 });
      this.emit(x, 0.8, z, { n: 8 * n, speed: 0.6, up: 1, vy: 1.6, life: 1.0, grav: -1, color: [0.35, 0.3, 0.3], size: 2, alpha: 0.5, jit: r * 0.5 });
    } else if (el === 'frost') {
      this.emit(x, 0.2, z, { n: 22 * n, speed: 3 * Math.sqrt(r / 2), up: 1.6, vy: 1.5, life: 0.55, grav: 10, color: h, colorVar: 0.2, size: 2, jit: 0.4 });
      this.emit(x, 0.2, z, { n: 16 * n, speed: 0.8, up: 0.4, life: 0.9, grav: -0.2, color: c, size: 1, alpha: 0.8, jit: r });
    } else if (el === 'poison') {
      this.emit(x, 0.3, z, { n: 14 * n, speed: 1.2, up: 0.8, vy: 0.6, life: 1.1, grav: -0.3, color: [0.4, 1.2, 0.15], size: 2, alpha: 0.6, jit: r * 0.8 });
      this.emit(x, 0.2, z, { n: 18 * n, speed: 2.4, up: 1.6, vy: 1, life: 0.5, grav: 9, color: c, size: 1, jit: 0.3 });
    } else if (el === 'storm') {
      this.emit(x, 0.6, z, { n: 24 * n, speed: 4.5, up: 0.7, life: 0.3, grav: 4, color: h, size: 1, jit: 0.2 });
      for (let i = 0; i < 3 + n * 2; i++) { const a = rnd() * TAU, d = r * (0.6 + rnd() * 0.5); this.elArc(x, z, x + Math.sin(a) * d, z + Math.cos(a) * d, 'storm', { ground: true }); }
    } else if (el === 'blood') {
      this.emit(x, 0.9, z, { n: 22 * n, speed: 3, up: 0.9, life: 0.55, grav: 13, color: [0.55, 0.03, 0.05], colorVar: 0.3, size: 1, kind: 1, jit: 0.3 });
      this.emit(x, 0.9, z, { n: 10 * n, speed: 2, up: 0.6, life: 0.35, grav: 4, color: c, size: 2, jit: 0.2 });
    } else if (el === 'holy') {
      this.emit(x, 0.2, z, { n: 26 * n, speed: 2.6 * Math.sqrt(r / 2), up: 0.25, life: 0.45, grav: 0, color: h, size: 1, jit: 0.2 });
      this.emit(x, 0.2, z, { n: 12 * n, speed: 0.4, up: 0.2, vy: 2.4, life: 0.8, grav: -0.8, color: c, size: 2, jit: r * 0.7 });
    } else if (el === 'void') this.elImplode(x, z, r, big);
    else if (el === 'steam') {
      this.emit(x, 0.4, z, { n: 26 * n, speed: 1.6, up: 1.2, vy: 1.6, life: 1.2, grav: -0.6, color: [1.4, 1.45, 1.5], size: 2, alpha: 0.55, jit: r * 0.6, drag: 2 });
      this.emit(x, 0.3, z, { n: 12, speed: 3, up: 0.6, life: 0.3, grav: 3, color: HOT.steam, size: 1 });
    }
  },
  elShatter(x, z) {
    this.emit(x, 0.9, z, { n: 34, speed: 3.6, up: 1.3, vy: 1.5, life: 0.6, grav: 12, color: HOT.frost, colorVar: 0.25, size: 2, jit: 0.4 });
    this.emit(x, 0.6, z, { n: 20, speed: 1, up: 0.4, life: 0.9, grav: -0.2, color: EL_COL.frost, size: 1, alpha: 0.8, jit: 0.8 });
    if (this.debris) this.debris(x, 1, z, 10, [0.75, 0.95, 1.1], { size: 0.12 });
    if (this.shockRing) this.shockRing(x, z, 2.2, EL_COL.frost, 0.3);
  },
  // the void folds in on a point, then lets go
  elImplode(x, z, r = 2, big = false) {
    const n = big ? 40 : 24;
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = r * (0.7 + rnd() * 0.5); const px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; this.emit(px, 0.3 + rnd() * 1.4, pz, { n: 1, ang: a + Math.PI, spread: 0.1, speed: d * 3.2, up: 0, life: 0.32, grav: 0, color: rnd() < 0.5 ? EL_COL.void : HOT.void, size: rnd() < 0.4 ? 2 : 1, drag: 0.5 }); }
    const E = this._E; const disc = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), dark([0.04, 0.0, 0.07], 0.9)), 0.045); disc.position.set(x, 0.045, z); this.group.add(disc);
    E.cols.push({ g: disc, implode: true, t: 0, life: 0.5, r, x, z });
    if (this.shockRing) this.shockRing(x, z, r * 1.2, EL_COL.void, 0.45);
  },
  elUnmake(x, z, el = 'void') {
    if (el === 'frost') return this.elShatter(x, z);
    this.elImplode(x, z, 1.6, false);
    this.emit(x, 1, z, { n: 16, speed: 0.5, up: 0.5, vy: 2.2, life: 0.9, grav: -1, color: [0.5, 0.12, 0.9], size: 2, alpha: 0.8, jit: 0.4 });
  },
  // a mote of blood that flies from the fallen to the warden
  elMote(x, z, e) { this._E.motes.push({ x, z, y: 1, e, t: 0, life: 0.45, sx: x, sz: z, side: rnd() < 0.5 ? 1 : -1 }); },

  // ---------------------------------------------------------------- the boons' own zones
  _elZones(list, dt, time) {
    const E = this._E; const seen = new Set();
    for (const z of list) {
      if (!z.fxOwn) continue; seen.add(z); let v = E.zv.get(z);
      if (!v) { v = this._elZoneMake(z); E.zv.set(z, v); }
      this._elZoneStep(z, v, dt, time);
    }
    for (const [z, v] of E.zv) if (!seen.has(z)) { if (v.end) v.end(); drop(v.g); E.zv.delete(z); }
  },
  _elZoneMake(z) {
    const g = new THREE.Group(); g.position.set(z.x, 0, z.z); this.group.add(g); const v = { g, burst: false };
    const el = z.el || 'fire'; const c = EL_COL[el] || EL_COL.fire; const r = z.r || 1;
    const k = z.kind;
    if (k === 'emberwake') {
      // a patch of burning ground: pixel flames (the 8x12 flame sheet, a texel to a buffer pixel) over a scorch
      v.scorch = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), dark([0.05, 0.02, 0.01], 0.5)), 0.03); v.scorch.scale.setScalar(r * 0.75); g.add(v.scorch);
      v.flames = []; for (let i = 0; i < 3; i++) { const a = rnd() * TAU, d = i ? r * (0.3 + rnd() * 0.35) : rnd() * 0.15; const f = this._flame(Math.sin(a) * d, Math.cos(a) * d, 0.8 + rnd() * 0.5); g.add(f); v.flames.push(f); }
    } else if (k === 'crystal') {
      v.spikes = []; const n = 5;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + rnd() * 0.6, d = i ? r * (0.35 + rnd() * 0.35) : 0;
        const m = new THREE.Mesh(geo('iceSpike', () => new THREE.ConeGeometry(0.16, 1, 4)), this._iceMat || (this._iceMat = Object.assign(new THREE.MeshLambertMaterial({ color: 0xc8f0ff, emissive: 0x3a90c0, emissiveIntensity: 0.8 }), {})));
        this._iceMat.userData.keep = true;
        m.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); m.rotation.set((rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7); m.userData.h = (i ? 0.5 : 0.9) + rnd() * 0.35; m.scale.set(1, 0.01, 1); g.add(m); v.spikes.push(m);
      }
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(c, 0.5))); v.ring.scale.setScalar(r); g.add(v.ring);
    } else if (k === 'miasma' || k === 'plague') {
      v.puffs = []; const n = k === 'plague' ? 9 : 5; const tex = T.glow('#ffffff', 32, 1.6);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.42, 0.8, 0.16), transparent: true, opacity: 0, depthWrite: false, fog: false }));
        const a = rnd() * TAU, d = rnd() * r * 0.75; s.userData = { a, d, ph: rnd() * TAU, sz: (k === 'plague' ? 1.7 : 1.2) + rnd() * 0.8 }; g.add(s); v.puffs.push(s);
      }
      v.ring = flat(new THREE.Mesh(geo('elRingThin', () => new THREE.RingGeometry(0.95, 1, 32)), add([0.4, 1.2, 0.15], 0.1))); v.ring.scale.setScalar(r); g.add(v.ring);
    } else if (k === 'thunderhead') {
      v.puffs = []; const tex = T.glow('#ffffff', 32, 1.4);
      for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.22, 0.24, 0.34), transparent: true, opacity: 0, depthWrite: false, fog: false })); const a = i / 7 * TAU; s.userData = { a, d: i ? r * 0.55 : 0, ph: rnd() * TAU, sz: 1.8 + rnd() * 0.6 }; g.add(s); v.puffs.push(s); }
      v.shade = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), dark([0.02, 0.02, 0.05], 0.35)), 0.03); v.shade.scale.setScalar(r); g.add(v.shade);
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.storm, 0.3))); v.ring.scale.setScalar(r); g.add(v.ring);
    } else if (k === 'blizzard') {
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.frost, 0.45))); v.ring.scale.setScalar(r); g.add(v.ring);
      v.fill = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), add([0.3, 0.55, 0.8], 0.15)), 0.03); v.fill.scale.setScalar(r); g.add(v.fill);
    } else if (k === 'sanct') {
      v.sig = flat(new THREE.Mesh(geo('elPlane', () => new THREE.PlaneGeometry(2, 2)), new THREE.MeshBasicMaterial({ map: T.sigil('circle', 96, 47), color: new THREE.Color(...EL_COL.holy).multiplyScalar(0.7), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), 0.04); v.sig.scale.setScalar(r); g.add(v.sig);
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.holy, 0.6))); v.ring.scale.setScalar(r); g.add(v.ring);
    } else if (k === 'rift') {
      v.hole = flat(new THREE.Mesh(geo('elDisc', () => new THREE.CircleGeometry(1, 16)), dark([0.03, 0.0, 0.06], 0.92)), 0.04); v.hole.scale.setScalar(0.01); g.add(v.hole);
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.void, 0.85)), 0.05); v.ring.scale.setScalar(0.01); g.add(v.ring);
      v.sig = flat(new THREE.Mesh(geo('elPlane', () => new THREE.PlaneGeometry(2, 2)), new THREE.MeshBasicMaterial({ map: T.sigil('seal', 64, 53), color: new THREE.Color(...EL_COL.void).multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), 0.045); g.add(v.sig);
    } else {
      // one-shot blasts (fire, tbolt, smite, shards, steam, voidburst): a thin ring in the element colour shrinks in while it waits
      v.ring = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(c, z.warn ? 0.35 : 0))); v.ring.scale.setScalar(r); g.add(v.ring);
    }
    return v;
  },
  _elZoneStep(z, v, dt, time) {
    const g = v.g; g.position.set(z.x, 0, z.z); const el = z.el || 'fire'; const c = EL_COL[el] || EL_COL.fire; const r = z.r || 1;
    const warn = z.t < z.warn; const kw = warn ? z.t / Math.max(0.01, z.warn) : 1; const left = z.warn + z.life - z.t; const fade = Math.min(1, left / 0.4);
    const k = z.kind; const R = (p) => { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * p; return [z.x + Math.sin(a) * d, z.z + Math.cos(a) * d]; };
    if (k === 'emberwake') {
      v.scorch.material.opacity = 0.5 * Math.min(1, left / 0.8); const grow = Math.min(1, z.t / 0.15);
      for (const f of v.flames) this._flameStep(f, time, grow * fade);
      if (rnd() < dt * 26 * fade) { const [x, zz] = R(0.8); this.emit(x, 0.06, zz, { n: 1, speed: 0.25, up: 1, vy: 2.2, life: 0.45, grav: -2.2, color: rnd() < 0.35 ? HOT.fire : EL_COL.fire, size: rnd() < 0.4 ? 2 : 1 }); }
      if (rnd() < dt * 4 * fade) { const [x, zz] = R(0.6); this.emit(x, 0.5, zz, { n: 1, speed: 0.3, vy: 1.2, life: 1, grav: -0.6, color: [0.3, 0.26, 0.26], size: 2, alpha: 0.5 }); }
    } else if (k === 'crystal') {
      for (const m of v.spikes) { const s = warn ? 0.3 + 0.7 * kw : Math.max(0.01, 1 - (z.t - z.warn) / 0.15); m.scale.set(1, m.userData.h * s, 1); m.position.y = m.userData.h * s * 0.5 - 0.05; m.visible = s > 0.02; }
      v.ring.material.opacity = warn ? 0.25 + 0.35 * kw : 0;
      if (warn && rnd() < dt * 10) { const [x, zz] = R(0.8); this.emit(x, 0.1, zz, { n: 1, speed: 0.1, up: 0.3, vy: 0.5, life: 0.5, grav: -0.3, color: EL_COL.frost, size: 1 }); }
      if (!warn && !v.burst) { v.burst = true; this.elShatter(z.x, z.z); }
    } else if (k === 'miasma' || k === 'plague') {
      const op = Math.min(1, z.t / 0.35) * fade;
      for (const s of v.puffs) { const u = s.userData; const a = u.a + time * 0.35 * (u.d > 0 ? 1 : 0); s.position.set(Math.sin(a) * u.d, 0.45 + Math.sin(time * 1.3 + u.ph) * 0.15, Math.cos(a) * u.d); s.scale.set(u.sz, u.sz * 0.7, 1); s.material.opacity = 0.45 * op; }
      v.ring.material.opacity = 0.1 * op;
      if (rnd() < dt * 26 * op) { const [x, zz] = R(0.9); this.emit(x, 0.08, zz, { n: 1, speed: 0.15, up: 0.5, vy: 0.9, life: 0.7, grav: -0.4, color: rnd() < 0.3 ? HOT.poison : EL_COL.poison, size: 1 }); }
    } else if (k === 'thunderhead') {
      const op = Math.min(1, z.t / 0.3) * fade;
      for (const s of v.puffs) { const u = s.userData; s.position.set(Math.sin(u.a + time * 0.4) * u.d, 4.2 + Math.sin(time * 1.6 + u.ph) * 0.1, Math.cos(u.a + time * 0.4) * u.d); s.scale.set(u.sz, u.sz * 0.6, 1); s.material.opacity = 0.75 * op; s.material.color.setRGB(0.22 + (rnd() < dt * 3 ? 1.6 : 0), 0.24, 0.34); }
      v.shade.material.opacity = 0.35 * op; v.ring.material.opacity = (0.08 + 0.04 * Math.sin(time * 9)) * op;
      if (rnd() < dt * 6 * op) { const [x, zz] = R(0.7); this.emit(x, 4.0, zz, { n: 1, speed: 0.1, vy: -6, life: 0.6, grav: 4, color: [0.9, 1.0, 1.3], size: 1, alpha: 0.7 }); }
    } else if (k === 'blizzard') {
      const op = Math.min(1, z.t / 0.3) * fade; v.ring.material.opacity = 0.4 * op; v.fill.material.opacity = 0.12 * op; v.ring.scale.setScalar(r * (1 + 0.03 * Math.sin(time * 6)));
      for (let i = 0; i < Math.round(dt * 140 * op); i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r; this.emit(z.x + Math.sin(a) * d, 0.2 + rnd() * 2.2, z.z + Math.cos(a) * d, { n: 1, ang: a + Math.PI / 2, spread: 0.3, speed: 4 + rnd() * 3, up: 0, vy: -0.4, life: 0.45, grav: 0.4, color: rnd() < 0.5 ? HOT.frost : [1.6, 1.9, 2.2], size: rnd() < 0.25 ? 2 : 1, drag: 0.3 }); }
    } else if (k === 'sanct') {
      const op = Math.min(1, z.t / 0.3) * fade; v.sig.material.opacity = 0.28 * op; v.sig.rotation.z = time * 0.4; v.ring.material.opacity = (0.35 + 0.15 * Math.sin(time * 5)) * op;
      if (rnd() < dt * 12 * op) { const [x, zz] = R(0.9); this.emit(x, 0.1, zz, { n: 1, speed: 0.1, vy: 1.6, up: 0.2, life: 0.9, grav: -0.4, color: rnd() < 0.5 ? HOT.holy : EL_COL.holy, size: 1 }); }
    } else if (k === 'rift') {
      const life = z.warn + z.life; const u = z.t / life; const open = Math.min(1, u * 5) * (u > 0.85 ? Math.max(0, 1 - (u - 0.85) / 0.15) : 1);
      v.hole.scale.setScalar(Math.max(0.01, r * 0.55 * open)); v.ring.scale.setScalar(Math.max(0.01, r * 0.6 * open * (1 + 0.06 * Math.sin(time * 20)))); v.ring.material.opacity = 0.85 * open;
      v.sig.scale.setScalar(Math.max(0.01, r * open)); v.sig.rotation.z = -time * 2.2; v.sig.material.opacity = 0.7 * open;
      for (let i = 0; i < Math.round(dt * 70 * open); i++) { const a = rnd() * TAU, d = r * (0.6 + rnd() * 0.5); this.emit(z.x + Math.sin(a) * d, 0.15 + rnd() * 1.2, z.z + Math.cos(a) * d, { n: 1, ang: a + Math.PI + 0.7, spread: 0.2, speed: d * 2.6, up: 0, life: 0.35, grav: 0, color: rnd() < 0.5 ? EL_COL.void : [0.5, 0.1, 0.9], size: rnd() < 0.3 ? 2 : 1, drag: 0.4 }); }
    } else {
      v.ring.material.opacity = warn ? 0.2 + 0.5 * kw : 0; v.ring.scale.setScalar(Math.max(0.05, r * (warn ? 1 - 0.25 * kw : 1)));
      if (!warn && !v.burst) {
        v.burst = true;
        if (k === 'fire') this.elBurst(z.x, z.z, 'fire', r, r > 2.1);
        else if (k === 'shards') { if (z.shape === 'ring') this.elBurst(z.x, z.z, 'frost', z.r1 || 3, true); else this.elShatter(z.x, z.z); }
        else if (k === 'steam') { /* drawn by its fxq burst */ }
        else if (k === 'voidburst') this.elImplode(z.x, z.z, r, false);
        else if (k === 'smite' && z.r >= 2.5) this.elBurst(z.x, z.z, 'holy', r, true);
      }
    }
  },

  // ---------------------------------------------------------------- statuses, auras, the warden's boons
  _elEnt(e) { const E = this._E; let s = E.ents.get(e.id); if (!s) { s = { e, t: rnd() * 9 }; E.ents.set(e.id, s); } s.e = e; s.seen = E.t; return s; },
  _elBodies(world, dt, time) {
    const E = this._E;
    for (const e of world.ents) {
      if (e.dead) continue; const st = e.status || {}; const sc = (e.def && (e.def.scale || (e.def.look && e.def.look.scale))) || 1; const H = 1.7 * sc;
      const need = st.freeze || st.mark || st.shock || st.chill || st.brittle || st.blind || st.sear || e.element || (e.team === 'hero' && (e.aegis > 0 || e.B));
      if (!need && !E.ents.has(e.id)) continue;
      const s = this._elEnt(e); s.t += dt; const vis = !e.hidden; const y0 = e.leapH || 0;
      // frozen: a block of ice around the body, a white rim
      if (st.freeze && vis) {
        if (!s.ice) {
          s.ice = new THREE.Group(); const w = (e.r || 0.5) * 2.3, h = H * 1.05;
          const box = new THREE.Mesh(geo('iceBox', () => new THREE.BoxGeometry(1, 1, 1)), this._iceBlock || (this._iceBlock = (() => { const m = new THREE.MeshLambertMaterial({ color: 0x7cc4f0, emissive: 0x0a2a48, transparent: true, opacity: 0.38, depthWrite: false }); m.userData.keep = true; return m; })()));
          box.scale.set(w, h, w); box.position.y = h / 2; s.ice.add(box);
          const edges = new THREE.LineSegments(geo('iceEdge', () => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))), new THREE.LineBasicMaterial({ color: new THREE.Color(...EL_COL.frost), transparent: true, opacity: 0.8, fog: false })); edges.scale.copy(box.scale); edges.position.copy(box.position); s.ice.add(edges);
          s.ice.rotation.y = rnd() * 3; this.group.add(s.ice);
        }
        s.ice.position.set(e.x, y0, e.z);
        if (rnd() < dt * 6) this.emit(e.x + (rnd() - 0.5) * e.r * 2, rnd() * H, e.z + (rnd() - 0.5) * e.r * 2, { n: 1, speed: 0.1, life: 0.4, grav: 0, color: HOT.frost, size: 1 });
      } else if (s.ice) { this.elShatter(e.x, e.z); drop(s.ice); s.ice = null; }
      // marks of the void: a diamond for each stack, circling over the head
      const marks = st.mark && vis ? st.mark.stacks : 0;
      if (marks || s.marks) {
        s.marks = s.marks || [];
        while (s.marks.length < marks) { const m = new THREE.Mesh(geo('markD', () => new THREE.BoxGeometry(0.16, 0.16, 0.16)), add(HOT.void, 1)); m.rotation.set(0.62, 0, 0.785); this.group.add(m); s.marks.push(m); }
        while (s.marks.length > marks) drop(s.marks.pop());
        s.marks.forEach((m, i) => { const a = time * 2.4 + i / marks * TAU; m.position.set(e.x + Math.sin(a) * 0.38, y0 + H + 0.35 + Math.sin(time * 4 + i) * 0.04, e.z + Math.cos(a) * 0.38); m.rotation.y = time * 3; });
        if (marks && rnd() < dt * 4 * marks) this.emit(e.x + (rnd() - 0.5) * 0.6, y0 + 0.2 + rnd() * H, e.z + (rnd() - 0.5) * 0.6, { n: 1, speed: 0.05, vy: -0.6, life: 0.5, grav: 0, color: [0.8, 0.2, 1.5], size: 1 });
        if (!marks) s.marks = null;
      }
      // shocked: little arcs crackle over the body
      if (st.shock && vis && (s.crk = (s.crk || 0) - dt) <= 0) { s.crk = 0.1 + rnd() * 0.12; const a = rnd() * TAU, y = 0.4 + rnd() * H * 0.8; this.elArcSmall(e.x + Math.sin(a) * e.r, y0 + y, e.z + Math.cos(a) * e.r, a); }
      if (st.chill && vis && rnd() < dt * 5 * st.chill.stacks) { const a = rnd() * TAU; this.emit(e.x + Math.sin(a) * (e.r + 0.15), y0 + 0.2 + rnd() * H, e.z + Math.cos(a) * (e.r + 0.15), { n: 1, speed: 0.1, life: 0.5, grav: 0.6, color: rnd() < 0.5 ? HOT.frost : EL_COL.frost, size: st.chill.stacks > 1 ? 2 : 1 }); }
      if (st.brittle && vis && rnd() < dt * 18) { const a = rnd() * TAU; this.emit(e.x + Math.sin(a) * e.r * 0.8, y0 + 0.3 + rnd() * H, e.z + Math.cos(a) * e.r * 0.8, { n: 1, speed: 0.8, up: 0.4, life: 0.35, grav: 5, color: HOT.frost, size: 1 }); }
      if (st.blind && vis && rnd() < dt * 8) this.emit(e.x, y0 + H + 0.1, e.z, { n: 1, speed: 0.3, up: 0.4, vy: 0.5, life: 0.7, grav: -0.4, color: [1.2, 1.25, 1.3], size: 2, alpha: 0.5 });
      if (st.sear && vis && rnd() < dt * 10) this.emit(e.x + (rnd() - 0.5) * 0.5, y0 + 0.3 + rnd() * H, e.z + (rnd() - 0.5) * 0.5, { n: 1, speed: 0.2, vy: 1.4, life: 0.5, grav: -1, color: HOT.holy, size: 1 });
      // an elemental foe: its element streams off it
      if (e.element && vis) this._elAura(e, dt, time, H, y0);
      // the warden's shield of light: a ring of panes turning at the waist, a flash where it is struck
      if (e.team === 'hero') this._elHero(e, s, dt, time, H, y0, vis);
    }
    for (const [id, s] of E.ents) if (s.seen !== E.t || s.e.dead) { if (s.ice) { this.elShatter(s.e.x, s.e.z); drop(s.ice); } if (s.marks) s.marks.forEach(drop); if (s.ring) drop(s.ring); E.ents.delete(id); }
  },
  _elAura(e, dt, time, H, y0) {
    const el = e.element; const c = EL_COL[el]; const r = e.r || 0.5; const rr = () => { const a = rnd() * TAU; return [e.x + Math.sin(a) * r * 0.8, e.z + Math.cos(a) * r * 0.8]; };
    if (el === 'fire') { if (rnd() < dt * 22) { const [x, z] = rr(); this.emit(x, y0 + 0.4 + rnd() * H * 0.7, z, { n: 1, speed: 0.2, vy: 2, up: 0.5, life: 0.4, grav: -2.5, color: rnd() < 0.3 ? HOT.fire : c, size: rnd() < 0.3 ? 2 : 1 }); } }
    else if (el === 'frost') { if (rnd() < dt * 12) { const [x, z] = rr(); this.emit(x, y0 + 0.2 + rnd() * H, z, { n: 1, speed: 0.15, life: 0.7, grav: 0.4, color: rnd() < 0.5 ? HOT.frost : c, size: 1 }); } if (rnd() < dt * 4) this.emit(e.x, 0.1, e.z, { n: 1, speed: 0.6, up: 0.1, life: 0.9, grav: -0.1, color: [0.6, 0.85, 1.1], size: 2, alpha: 0.45, drag: 2 }); }
    else if (el === 'poison') { if (rnd() < dt * 10) { const [x, z] = rr(); this.emit(x, y0 + 0.5 + rnd() * H * 0.6, z, { n: 1, speed: 0.1, life: 0.6, grav: 5, color: c, size: 1 }); } if (rnd() < dt * 3) this.emit(e.x, y0 + H * 0.6, e.z, { n: 1, speed: 0.3, vy: 0.4, life: 1, grav: -0.3, color: [0.3, 0.7, 0.12], size: 2, alpha: 0.5 }); }
    else if (el === 'storm') { const s = this._elEnt(e); if ((s.ecr = (s.ecr || 0) - dt) <= 0) { s.ecr = 0.12 + rnd() * 0.2; const a = rnd() * TAU; this.elArcSmall(e.x + Math.sin(a) * r, y0 + 0.4 + rnd() * H * 0.8, e.z + Math.cos(a) * r, a); } }
    else if (el === 'blood') { if (rnd() < dt * 10) { const [x, z] = rr(); this.emit(x, y0 + 0.4 + rnd() * H * 0.6, z, { n: 1, speed: 0.1, life: 0.6, grav: 9, color: [0.6, 0.03, 0.05], size: 1, kind: 1 }); } if (rnd() < dt * 5) this.emit(e.x, y0 + H * 0.5, e.z, { n: 1, speed: 0.6, life: 0.4, grav: 0, color: c, size: 1 }); }
    else if (el === 'holy') { if (rnd() < dt * 12) { const [x, z] = rr(); this.emit(x, y0 + 0.1 + rnd() * 0.4, z, { n: 1, speed: 0.1, vy: 1.8, life: 0.8, grav: -0.6, color: rnd() < 0.5 ? HOT.holy : c, size: 1 }); } }
    else if (el === 'void') { if (rnd() < dt * 14) { const a = rnd() * TAU, d = r + 0.6; this.emit(e.x + Math.sin(a) * d, y0 + 0.3 + rnd() * H, e.z + Math.cos(a) * d, { n: 1, ang: a + Math.PI, spread: 0.1, speed: 1.8, up: 0, life: 0.35, grav: 0, color: rnd() < 0.5 ? c : [0.4, 0.08, 0.7], size: rnd() < 0.3 ? 2 : 1, drag: 0.5 }); } }
  },
  _elHero(e, s, dt, time, H, y0, vis) {
    const B = e.B; const v = B ? B.v : {};
    const on = e.aegis > 0 && vis;
    if (on && !s.ring) {
      s.ring = new THREE.Group(); const n = 8;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; const p = new THREE.Mesh(geo('aegisPane', () => new THREE.BoxGeometry(0.16, 0.28, 0.03)), add([1.6, 1.35, 0.7], 0.4)); p.position.set(Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62); p.rotation.y = a; s.ring.add(p); }
      const base = flat(new THREE.Mesh(geo('elRing', () => new THREE.RingGeometry(0.86, 1, 28)), add(EL_COL.holy, 0.6)), 0); base.scale.setScalar(0.7); base.position.y = -0.9; s.ring.add(base); s.ringBase = base;
      this.group.add(s.ring);
    } else if (!on && s.ring) { drop(s.ring); s.ring = null; }
    if (s.ring) {
      const k = Math.min(1, e.aegis / Math.max(1, e.aegisMax || 20)); const fl = (s.shieldFlash = Math.max(0, (s.shieldFlash || 0) - dt)) > 0 ? 1 : 0;
      s.ring.position.set(e.x, y0 + 0.95, e.z); s.ring.rotation.y = time * 1.6;
      s.ring.children.forEach((p, i) => { if (p === s.ringBase) return; p.visible = i / 8 < k + 0.06; p.material.opacity = fl ? 0.9 : 0.22 + 0.14 * Math.sin(time * 6 + i); p.position.y = Math.sin(time * 3 + i * 0.8) * 0.06; });
      s.ringBase.material.opacity = (fl ? 0.9 : 0.35) * (0.6 + 0.4 * k);
    }
    if (!B || !vis) return;
    const ring = (rad, rate, col, o = {}) => { for (let i = 0; i < Math.round(dt * rate); i++) { const a = rnd() * TAU; this.emit(e.x + Math.sin(a) * rad, (o.y ?? 0.1) + rnd() * (o.h ?? 0.3), e.z + Math.cos(a) * rad, { n: 1, ang: a + Math.PI / 2, spread: 0.2, speed: o.sp ?? 0.6, up: 0.2, vy: o.vy ?? 1, life: o.life ?? 0.5, grav: o.grav ?? -1, color: typeof col === 'function' ? col() : col, size: o.size ?? 1, alpha: o.alpha ?? 1 }); } };
    if (v.ember_crown) { ring(2.6, 50, () => (rnd() < 0.3 ? HOT.fire : EL_COL.fire), { vy: 1.6, grav: -2 }); ring(0.4, 20, EL_COL.fire, { y: 0.5, h: 1.2, vy: 1.8, sp: 0.2, grav: -2 }); }
    if (v.rime_crown) ring(3.2, 45, () => (rnd() < 0.5 ? HOT.frost : EL_COL.frost), { sp: 3, vy: 0.2, y: 0.2, h: 1.6, grav: 0.2, life: 0.5 });
    if (v.blight_crown) ring(2.8, 10, [0.3, 0.65, 0.12], { sp: 0.3, vy: 0.4, size: 2, alpha: 0.5, life: 1.1, grav: -0.2 });
    if (v.thunder_crown && (s.tcr = (s.tcr || 0) - dt) <= 0) { s.tcr = 0.15 + rnd() * 0.15; const a = rnd() * TAU; this.elArcSmall(e.x + Math.sin(a) * 0.5, y0 + 0.6 + rnd() * 1.2, e.z + Math.cos(a) * 0.5, a); }
    if (v.crimson_crown) ring(0.8, 16, [2.6, 0.2, 0.3], { sp: 2.2, vy: 0.2, y: 0.6, h: 1, grav: 0, life: 0.4 });
    if (v.dawn_crown && rnd() < dt * 20) { const a = time * 3 + rnd() * TAU; this.emit(e.x + Math.sin(a) * 0.32, y0 + H + 0.25, e.z + Math.cos(a) * 0.32, { n: 1, speed: 0.05, life: 0.3, grav: 0, color: HOT.holy, size: 1 }); }
    if (v.silence_crown && rnd() < dt * 14) { const a = rnd() * TAU; this.emit(e.x + Math.sin(a) * 1.4, y0 + 0.2 + rnd() * 1.4, e.z + Math.cos(a) * 1.4, { n: 1, ang: a + Math.PI, spread: 0.1, speed: 2.4, up: 0, life: 0.45, grav: 0, color: EL_COL.void, size: 1, drag: 0.5 }); }
    if (e.buffs && e.buffs.veil > 0 && rnd() < dt * 26) this.emit(e.x + (rnd() - 0.5) * 0.6, y0 + 0.2 + rnd() * H, e.z + (rnd() - 0.5) * 0.6, { n: 1, speed: 0.1, vy: 0.4, life: 0.5, grav: -0.3, color: [0.6, 0.15, 1.1], size: 2, alpha: 0.6 });
  },
  // a short crackle (shocked bodies, storm foes, the crown of storms)
  elArcSmall(x, y, z, a) {
    const E = this._E; const n = 3; const L = 0.35 + rnd() * 0.3; const x1 = x + Math.cos(a) * L, z1 = z - Math.sin(a) * L;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(zig(x, y, z, x1, y + (rnd() - 0.5) * 0.5, z1, n, 0.12)), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...HOT.storm), transparent: true, opacity: 1, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; this.group.add(l);
    E.arcs.push({ core: l, still: true, t: 0, life: 0.07 + rnd() * 0.05 });
  },

  // lingering hazards of elemental foes: a touch of their element on top of fx.js's ground marks
  _elHazards(list, dt) {
    for (const h of list) {
      if (!h.el || h.t < h.warn) { if (h.el === 'storm' && h.t < h.warn && rnd() < dt * 12) this.emit(h.x + (rnd() - 0.5) * h.r * 1.6, 0.1, h.z + (rnd() - 0.5) * h.r * 1.6, { n: 1, speed: 0.6, up: 1.4, life: 0.2, grav: 4, color: HOT.storm, size: 1 }); continue; }
      const el = h.el; const c = EL_COL[el]; const R = () => { const a = rnd() * TAU, d = Math.sqrt(rnd()) * h.r; return [h.x + Math.sin(a) * d, h.z + Math.cos(a) * d]; };
      if (el === 'blood' && rnd() < dt * 10) { const [x, z] = R(); this.emit(x, 0.05, z, { n: 1, speed: 0.2, up: 1, vy: 0.6, life: 0.4, grav: 5, color: [0.7, 0.04, 0.06], size: 1 }); }
      else if (el === 'void' && rnd() < dt * 24) { const a = rnd() * TAU, d = h.r; this.emit(h.x + Math.sin(a) * d, 0.1 + rnd() * 0.5, h.z + Math.cos(a) * d, { n: 1, ang: a + Math.PI + 0.6, spread: 0.1, speed: d * 2.4, up: 0, life: 0.4, grav: 0, color: c, size: 1, drag: 0.3 }); }
      else if (el === 'frost' && rnd() < dt * 6) { const [x, z] = R(); this.emit(x, 0.06, z, { n: 1, speed: 0.1, vy: 0.3, life: 0.8, grav: -0.1, color: HOT.frost, size: 1 }); }
      else if (el === 'holy' && rnd() < dt * 10) { const [x, z] = R(); this.emit(x, 0.05, z, { n: 1, speed: 0.1, vy: 1.5, life: 0.6, grav: -0.5, color: HOT.holy, size: 1 }); }
    }
  },

  // a pixel flame: a sprite of the 4-frame flame sheet, flickering through its frames; s scales it (1 = 0.5 m x 0.75 m)
  _flame(x, z, s = 1) {
    if (!this._flameMats) {
      const base = T.flame(); this._flameMats = [0, 1, 2, 3].map((f) => { const t = base.clone(); t.offset.x = f / 4; t.needsUpdate = true; const m = new THREE.SpriteMaterial({ map: t, color: new THREE.Color(1.25, 1.1, 0.95), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }); m.userData.keep = true; return m; });
    }
    const sp = new THREE.Sprite(this._flameMats[0]); sp.center.set(0.5, 0); sp.position.set(x, 0.02, z); sp.userData = { s, ph: rnd() * 4, rate: 9 + rnd() * 5 }; sp.scale.set(0.5 * s, 0.75 * s, 1); return sp;
  },
  _flameStep(sp, time, k) {
    const u = sp.userData; sp.material = this._flameMats[Math.floor(time * u.rate + u.ph) % 4];
    const w = 0.5 * u.s * Math.max(0.01, k), h = 0.75 * u.s * Math.max(0.01, k) * (0.9 + 0.15 * Math.sin(time * 17 + u.ph * 3)); sp.scale.set(w, h, 1); sp.visible = k > 0.03;
  },

  // ---------------------------------------------------------------- moving parts
  _elUpdate(dt, time) {
    const E = this._E;
    for (const a of E.arcs) {
      a.t += dt; const k = a.t / a.life;
      if (a.still) { a.core.material.opacity = 1 - k; continue; }
      if ((a.re -= dt) <= 0) { // re-jag a few times a second: the bolt crackles
        a.re = 0.04;
        if (a.sky) { const p = zig(a.x0, a.top, a.z0, a.x1, 0, a.z1, a.n, 0.5); a.core.geometry.attributes.position.array.set(p); a.glow.geometry.attributes.position.array.set(p.map((v, i) => (i % 3 === 0 ? v + a.glow.userData.dx : v))); }
        else { const p = zig(a.x0, a.y, a.z0, a.x1, a.y, a.z1, a.n, a.fire ? 0.5 : 0.22, a.fire ? a.side : 0); a.core.geometry.attributes.position.array.set(p); a.glow.geometry.attributes.position.array.set(p.map((v, i) => (i % 3 === 1 ? v + 0.07 : v))); if (a.glow2) a.glow2.geometry.attributes.position.array.set(p.map((v, i) => (i % 3 === 0 ? v + 0.07 : v))); }
        a.core.geometry.attributes.position.needsUpdate = true; a.glow.geometry.attributes.position.needsUpdate = true; if (a.glow2) a.glow2.geometry.attributes.position.needsUpdate = true;
      }
      const on = k < 0.5 || Math.floor(a.t * 40) % 2 === 0; a.core.visible = on; a.glow.visible = on;
      a.core.material.opacity = 1 - k * 0.6; a.glow.material.opacity = 0.85 * (1 - k); if (a.glow2) { a.glow2.visible = on; a.glow2.material.opacity = 0.75 * (1 - k); }
      if (a.flash) a.flash.material.opacity = 0.35 * (1 - k);
    }
    E.arcs = E.arcs.filter((a) => { if (a.t < a.life) return true; drop(a.core); drop(a.glow); if (a.glow2) drop(a.glow2); if (a.flash) drop(a.flash); return false; });
    for (const c of E.cols) {
      c.t += dt;
      if (c.implode) { const k = c.t / c.life; c.g.scale.setScalar(Math.max(0.01, c.r * 0.7 * (k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6))); c.g.material.opacity = 0.9 * (1 - k * 0.5); continue; }
      const warn = c.t < c.warn; const k = warn ? c.t / c.warn : (c.t - c.warn) / (c.life - c.warn);
      if (warn) { c.pencil.material.opacity = 0.4 + 0.6 * k; c.pencil.scale.y = k; c.pencil.position.y = 9 * (1 - k); c.ring.scale.setScalar(1.8 - 0.6 * k); c.ring.material.opacity = 0.3 + 0.5 * k; }
      else {
        if (!c.hit) { c.hit = true; this.emit(c.x, 0.2, c.z, { n: 22, speed: 2.4, up: 0.3, life: 0.4, grav: 0, color: HOT.holy, size: 1 }); this.emit(c.x, 0.2, c.z, { n: 10, speed: 0.4, up: 0.2, vy: 2.6, life: 0.8, grav: -1, color: EL_COL.holy, size: 2, jit: 0.6 }); c.pencil.visible = false; }
        const f = 1 - k; c.inner.material.opacity = Math.min(1, f * 1.6); c.outer.material.opacity = 0.35 * f; c.inner.scale.set(1 + k * 0.6, 1, 1 + k * 0.6); c.outer.scale.set(1 + k, 1, 1 + k);
        c.disc.material.opacity = 0.6 * f; c.disc.scale.setScalar(1.3); c.ring.scale.setScalar(1.2 + k * 1.6); c.ring.material.opacity = 0.8 * f;
      }
    }
    E.cols = E.cols.filter((c) => { if (c.t < c.life) return true; drop(c.g); return false; });
    for (const m of E.meteors) {
      m.t += dt; const k = Math.min(1, m.t / m.warn);
      const x = m.sx + (m.x - m.sx) * k, z = m.sz + (m.z - m.sz) * k, y = 9 * (1 - k);
      m.m.position.set(x, y, z); m.m.rotation.set(m.t * 9, m.t * 7, 0); m.ring.material.opacity = 0.3 + 0.5 * k; m.ring.scale.setScalar(1.5 - 0.4 * k);
      this.emit(x, y, z, { n: 2, speed: 0.4, up: 0.5, life: 0.35, grav: -1, color: rnd() < 0.4 ? HOT.fire : EL_COL.fire, size: rnd() < 0.5 ? 2 : 1, jit: 0.15 });
      this.emit(x, y, z, { n: 1, speed: 0.2, life: 0.7, grav: -0.4, color: [0.32, 0.28, 0.28], size: 2, alpha: 0.5 });
    }
    E.meteors = E.meteors.filter((m) => { if (m.t < m.warn) return true; drop(m.m); drop(m.ring); return false; });
    for (const m of E.motes) {
      m.t += dt; const k = Math.min(1, m.t / m.life); const e = m.e; const tx = e.x, tz = e.z;
      const ex = 1 - (1 - k) * (1 - k); const px = -(tz - m.sz), pz = tx - m.sx; const L = Math.hypot(px, pz) || 1; const bow = Math.sin(k * Math.PI) * 1.2 * m.side;
      const x = m.sx + (tx - m.sx) * ex + px / L * bow, z = m.sz + (tz - m.sz) * ex + pz / L * bow, y = 1 + Math.sin(k * Math.PI) * 1.4;
      this.emit(x, y, z, { n: 2, speed: 0.15, life: 0.22, grav: 0, color: rnd() < 0.5 ? [3, 0.3, 0.35] : [1.6, 0.05, 0.1], size: 2 });
      if (k >= 1) { m.done = true; this.emit(tx, 1, tz, { n: 8, speed: 1.2, up: 0.6, life: 0.35, grav: 0, color: [3, 0.4, 0.45], size: 1 }); }
    }
    E.motes = E.motes.filter((m) => !m.done);
    for (const fl of E.flames) { fl.t += dt; const k = fl.t / fl.life; this._flameStep(fl.f, time, fl.t < 0 ? 0 : (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8)); }
    E.flames = E.flames.filter((fl) => { if (fl.t < fl.life) return true; fl.f.parent && fl.f.parent.remove(fl.f); return false; });
  },

  _elClear() {
    const E = this._E; if (!E) return;
    for (const a of E.arcs) { drop(a.core); drop(a.glow); if (a.glow2) drop(a.glow2); if (a.flash) drop(a.flash); }
    for (const c of E.cols) drop(c.g); for (const m of E.meteors) { drop(m.m); drop(m.ring); } for (const fl of E.flames) fl.f.parent && fl.f.parent.remove(fl.f);
    for (const [, v] of E.zv) drop(v.g); for (const [, s] of E.ents) { if (s.ice) drop(s.ice); if (s.marks) s.marks.forEach(drop); if (s.ring) drop(s.ring); }
    this._E = null;
  },
};

// install on FX.prototype: the boons' zones are drawn here, not by fx.js's plain rings; clear() also clears these
export function installElements(FX) {
  const P = FX && FX.prototype; if (!P || P._elInstalled) return; P._elInstalled = true;
  Object.assign(P, M);
  const uz = P.updateZones; if (uz) P.updateZones = function (list, dt) { return uz.call(this, list.some((z) => z.fxOwn) ? list.filter((z) => !z.fxOwn) : list, dt); };
  const cl = P.clear; P.clear = function (...a) { this._elClear(); return cl ? cl.apply(this, a) : undefined; };
  installInterlude(FX); // interludes and stage changes (fx_interlude.js) ride on elemFrame
}
// fx.js may import this file for its side effect (one line); it installs itself when fx.js has finished loading
import('./fx.js').then((m) => installElements(m.FX)).catch(() => {});
