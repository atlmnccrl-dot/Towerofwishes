// The looks of interludes (game/interlude.js) and of the bosses' stage changes: how a boss leaves the fight
// (a burst of dust and a hole for a burrow, rings on the water for a sink, a downdraft for a flight, smoke for a
// fade, a dark streak for a climb), the marked spots where it will surface, the targets appearing and breaking,
// its return (a column falling from the sky, the stones heaving, a rush of dust) and the arena as a stage leaves
// it: world.arenaFx = { x, z, r, water, waterC, dark, embers, emberC, fall, fallC, mist, mistC, cracks: [{ x, z,
// face, len, w }], crackC, v } (v: bump it when cracks change). Pixel points and flat shapes, as in fx.js.
// A mixin on FX.prototype, installed after fx_elements.js (it wraps elemFrame and drains the il* looks first).
import * as THREE from '../../vendor/three.module.min.js';

const TAU = Math.PI * 2, rnd = Math.random;
const add = (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
const dark = (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, fog: false, side: THREE.DoubleSide });
const flat = (m, y = 0.05) => { m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
function drop(o) { if (!o) return; o.parent && o.parent.remove(o); o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); }
const STYLE = { // particle colours per way of leaving
  burrow: [0.9, 0.7, 0.45], sink: [0.5, 1.4, 1.5], fly: [1.6, 1.55, 1.5], fade: [0.25, 0.22, 0.3], climb: [0.3, 0.28, 0.32],
};

const M = {
  _ilS() { return this._IL || (this._IL = { marks: [], holes: [], arena: null, av: -1, t: 0, falls: [] }); },

  // ---------------------------------------------------------------- one look from the sim
  ilQ(o) {
    const S = this._ilS(); const k = o.k; const st = o.style || 'fade'; const c = STYLE[st] || STYLE.fade;
    if (k === 'ilLeave') {
      if (st === 'burrow') { this.emit(o.x, 0.1, o.z, { n: 50, speed: 2.6, up: 2, vy: 2.5, life: 1.0, grav: 9, color: c, colorVar: 0.3, size: 2, jit: 1.2 }); this.debris && this.debris(o.x, 0.3, o.z, 14, [0.42, 0.36, 0.3]); this.shockRing(o.x, o.z, 3.5, [1.4, 1.1, 0.7], 0.6); this._ilHole(o.x, o.z, (o.r || 0.8) + 0.5, 'burrow', o.e); }
      else if (st === 'sink') { this.emit(o.x, 0.1, o.z, { n: 60, speed: 2, up: 3, vy: 3, life: 1.0, grav: 10, color: c, size: 1, jit: 1.2 }); this.shockRing(o.x, o.z, 4, [0.5, 1.8, 1.9], 0.8); this._ilHole(o.x, o.z, (o.r || 0.8) + 0.8, 'sink', o.e); }
      else if (st === 'fly') { for (let i = 0; i < 3; i++) this.shockRing(o.x, o.z, 2.5 + i * 1.5, [1.5, 1.5, 1.6], 0.5 + i * 0.2); this.emit(o.x, 0.1, o.z, { n: 50, speed: 4, up: 0.2, life: 0.7, grav: 1, color: [0.6, 0.6, 0.64], size: 1, drag: 2 }); this._ilHole(o.x, o.z, (o.r || 0.8) + 0.4, 'fly', o.e); }
      else if (st === 'climb') { this.emit(o.x, 0.6, o.z, { n: 30, speed: 1, up: 1, vy: 2, life: 1.2, grav: -1, color: c, size: 2, alpha: 0.7, jit: 1 }); }
      else { for (let i = 0; i < 3; i++) this.emit(o.x, 0.4 + i * 0.7, o.z, { n: 26, speed: 0.9, up: 0.6, vy: 0.8, life: 1.6, grav: -0.6, color: c, size: 2, alpha: 0.75, jit: 1.2, jitY: 0.5, drag: 1 }); this.emit(o.x, 1.2, o.z, { n: 20, speed: 0.5, up: 1, vy: 1.5, life: 1.2, grav: -1, color: [1.4, 0.6, 2.2], size: 1, jit: 1.4 }); }
    } else if (k === 'ilGone') {
      if (st === 'fly') this.emit(o.x, 6, o.z, { n: 24, speed: 2, up: 0.5, life: 1.2, grav: 2, color: [1.2, 1.2, 1.25], size: 1, jit: 2 });
      else if (st === 'climb') this.emit(o.x, 6, o.z, { n: 30, speed: 1, up: 1, vy: 3, life: 1.0, grav: -2, color: [0.2, 0.2, 0.24], size: 2, alpha: 0.8, jit: 1.4 });
      else if (st === 'fade') this.emit(o.x, 1, o.z, { n: 40, speed: 1.6, up: 0.8, life: 1.4, grav: -0.4, color: [0.2, 0.18, 0.24], size: 2, alpha: 0.7, jit: 1 });
    } else if (k === 'ilTarget') {
      this.shockRing(o.x, o.z, 1.6, [3, 2.4, 1.0], 0.5); this.emit(o.x, 0.1, o.z, { n: 26, speed: 0.4, up: 0.2, vy: 4, life: 0.8, grav: -1, color: [3, 2.4, 1.0], size: 1, jit: 0.4 });
    } else if (k === 'ilBreak') {
      const col = { candle: [3, 1.6, 0.5], chain: [1.2, 1.0, 0.8], bone: [2.2, 2.1, 1.8], bell: [2.2, 1.6, 0.7], totem: [2.2, 1.6, 0.7], mirror: [2.4, 2.3, 2.8], anchor: [0.6, 1.8, 1.7], mould: [3, 1.3, 0.3] }[o.kind] || [2.4, 2, 1.2];
      if (o.quiet) { this.emit(o.x, 0.6, o.z, { n: 14, speed: 0.8, up: 0.8, life: 0.8, grav: -0.5, color: [0.4, 0.38, 0.4], size: 2, alpha: 0.6, jit: 0.4 }); return; }
      this.emit(o.x, 0.8, o.z, { n: 46, speed: 3.2, up: 1.4, life: 0.7, grav: 10, color: col, colorVar: 0.3, size: 1, jit: 0.4 }); this.debris && this.debris(o.x, 0.6, o.z, 10, col.map((v) => Math.min(1, v * 0.3)));
      this.shockRing(o.x, o.z, 2.6, [3, 2.4, 1.0], 0.45); this.emit(o.x, 0.2, o.z, { n: 20, speed: 0.3, up: 0.2, vy: 5, life: 0.7, grav: -2, color: [3, 2.4, 1.0], size: 1, jit: 0.3 });
    } else if (k === 'ilSurface') {
      const m = flat(new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), add([3, 2.5, 1.2], 0.9)), 0.06); m.position.x = o.x; m.position.z = o.z; this.group.add(m);
      const f = flat(new THREE.Mesh(new THREE.CircleGeometry(1, 24), add([1.6, 1.2, 0.5], 0.25)), 0.05); f.position.x = o.x; f.position.z = o.z; this.group.add(f);
      S.marks.push({ m, f, t: 0, life: (o.warn || 0.55) + 0.25, r: o.r || 1.4, x: o.x, z: o.z });
    } else if (k === 'ilUp' || k === 'ilDown') {
      const n = k === 'ilUp' ? 40 : 24;
      if (st === 'sink') { this.emit(o.x, 0.1, o.z, { n, speed: 2, up: 3, vy: 3, life: 0.8, grav: 10, color: STYLE.sink, size: 1, jit: 0.9 }); this.shockRing(o.x, o.z, 2.6, [0.5, 1.8, 1.9], 0.5); }
      else if (st === 'burrow') { this.emit(o.x, 0.1, o.z, { n, speed: 2.4, up: 2, vy: 2.5, life: 0.8, grav: 9, color: STYLE.burrow, colorVar: 0.3, size: 2, jit: 0.9 }); }
      else this.emit(o.x, 0.8, o.z, { n, speed: 1.2, up: 0.6, vy: 0.6, life: 1.0, grav: -0.5, color: k === 'ilUp' ? [1.4, 1.2, 1.8] : [0.25, 0.22, 0.3], size: 2, alpha: 0.75, jit: 0.9, jitY: 0.6, drag: 1 });
    } else if (k === 'ilStruck') { this.emit(o.x, 1.2, o.z, { n: 30, speed: 4, up: 0.8, life: 0.35, grav: 10, color: [3.2, 2.6, 1.2], size: 1 }); this.shockRing(o.x, o.z, 2, [3, 2.4, 1.0], 0.35); }
    else if (k === 'ilPop') this.emit(o.x, 1, o.z, { n: 30, speed: 1.4, up: 0.7, life: 1.0, grav: -0.5, color: [1.2, 0.5, 1.6], size: 2, alpha: 0.7, jit: 0.8 });
    else if (k === 'ilReturn') {
      if (o.ent === 'slam' || o.ent === 'drop') S.falls.push({ x: o.x, z: o.z, t: 0, life: o.warn || 1, r: o.r || 2 });
      else if (o.ent === 'rise') S.falls.push({ x: o.x, z: o.z, t: 0, life: o.warn || 1, r: o.r || 2, rumble: true });
      for (const h of S.holes) h.fade = true;
    } else if (k === 'ilLand') {
      this.shockRing(o.x, o.z, (o.r || 2) + 2.5, [2.2, 1.9, 1.4], 0.6); this.shockRing(o.x, o.z, (o.r || 2) + 0.5, [3, 2.6, 1.6], 0.35);
      this.emit(o.x, 0.1, o.z, { n: 70, speed: 4, up: 1.2, vy: 1, life: 0.8, grav: 8, color: o.ent === 'rise' ? [0.9, 0.7, 0.45] : [0.7, 0.66, 0.6], colorVar: 0.3, size: 2, jit: 1.2 });
      this.debris && this.debris(o.x, 0.4, o.z, 18, [0.42, 0.38, 0.34]);
    } else if (k === 'ilEnd') { for (const h of S.holes) h.fade = true; }
  },
  _ilHole(x, z, r, st, e) {
    const S = this._ilS(); const g = new THREE.Group(); g.position.set(x, 0, z); this.group.add(g);
    if (st === 'burrow') { g.add(flat(new THREE.Mesh(new THREE.CircleGeometry(r, 9), dark([0.02, 0.015, 0.01], 0.92)), 0.035)); g.add(flat(new THREE.Mesh(new THREE.RingGeometry(r, r + 0.35, 9), dark([0.2, 0.15, 0.1], 0.8)), 0.04)); }
    else if (st === 'sink') { g.add(flat(new THREE.Mesh(new THREE.CircleGeometry(r, 20), dark([0.02, 0.07, 0.08], 0.85)), 0.035)); }
    else if (st === 'fly') { g.add(flat(new THREE.Mesh(new THREE.CircleGeometry(r, 16), dark([0, 0, 0], 0.4)), 0.035)); }
    S.holes.push({ g, st, t: 0, x, z, r, e, fade: false, a: 1 });
  },

  // ---------------------------------------------------------------- every frame
  ilFrame(world, dt) {
    const S = this._ilS(); S.t += dt;
    for (const m of S.marks) { m.t += dt; const k = m.t / m.life; const s = m.r * (1.4 - Math.min(1, k) * 0.4); m.m.scale.setScalar(s); m.f.scale.setScalar(s * Math.min(1, k * 1.4)); m.m.material.opacity = 0.9 * (1 - Math.max(0, k - 0.8) * 5); m.f.material.opacity = 0.25 + 0.2 * Math.sin(S.t * 30); if (rnd() < dt * 30) { const a = rnd() * TAU; this.emit(m.x + Math.sin(a) * s, 0.1, m.z + Math.cos(a) * s, { n: 1, speed: 0.2, up: 0.2, vy: 2, life: 0.4, grav: -1, color: [3, 2.4, 1.0], size: 1 }); } }
    for (const m of S.marks.filter((m) => m.t >= m.life)) { drop(m.m); drop(m.f); }
    S.marks = S.marks.filter((m) => m.t < m.life);
    for (const h of S.holes) {
      h.t += dt; if (h.fade) h.a -= dt * 1.5;
      h.g.traverse((c) => { if (c.material) c.material.opacity = Math.max(0, (c.material.userData.o0 ?? (c.material.userData.o0 = c.material.opacity)) * h.a); });
      if (h.st === 'sink' && rnd() < dt * 2.5 && h.a > 0.5) this.shockRing(h.x, h.z, h.r + 1.4, [0.35, 1.2, 1.3], 1.4);
      if (h.st === 'burrow' && rnd() < dt * 8 && h.a > 0.5) { const a = rnd() * TAU; this.emit(h.x + Math.sin(a) * h.r, 0.05, h.z + Math.cos(a) * h.r, { n: 1, speed: 0.6, up: 1, vy: 0.6, life: 0.5, grav: 5, color: STYLE.burrow, size: 1 }); }
    }
    for (const h of S.holes.filter((h) => h.a <= 0)) drop(h.g);
    S.holes = S.holes.filter((h) => h.a > 0);
    // what is coming back: dust falling in a column from the dark above, or the stones heaving
    for (const f of S.falls) {
      f.t += dt; const k = f.t / f.life;
      if (f.rumble) { if (rnd() < dt * 40) { const a = rnd() * TAU, r = rnd() * f.r; this.emit(f.x + Math.sin(a) * r, 0.05, f.z + Math.cos(a) * r, { n: 1, speed: 0.6, up: 1, vy: 1 + k * 2, life: 0.5, grav: 8, color: STYLE.burrow, size: 1 }); } }
      else if (rnd() < dt * 50) this.emit(f.x + (rnd() - 0.5) * 1.2, 9 + rnd() * 3, f.z + (rnd() - 0.5) * 1.2, { n: 1, speed: 0.2, up: 0, vy: -9, life: 1.0, grav: 4, color: [0.7, 0.66, 0.6], size: 1, alpha: 0.8 });
    }
    S.falls = S.falls.filter((f) => f.t < f.life);
    this._ilArena(world, dt);
  },

  // ---------------------------------------------------------------- the arena as the stage leaves it
  _ilArena(world, dt) {
    const S = this._ilS(); const A = world && world.arenaFx;
    if (!A) { if (S.arena) { drop(S.arena.g); S.arena = null; S.av = -1; } return; }
    const key = (A.v || 0) + ':' + (A.cracks ? A.cracks.length : 0) + ':' + !!A.water + ':' + !!A.dark;
    if (!S.arena || S.av !== key) {
      if (S.arena) drop(S.arena.g); S.av = key;
      const g = new THREE.Group(); this.group.add(g); const o = { g };
      if (A.water) { o.water = flat(new THREE.Mesh(new THREE.CircleGeometry(A.r || 12, 40), dark(A.waterC || [0.04, 0.16, 0.18], 0.0)), 0.07); o.water.position.x = A.x; o.water.position.z = A.z; g.add(o.water);
        o.sheen = flat(new THREE.Mesh(new THREE.RingGeometry((A.r || 12) * 0.2, (A.r || 12), 40), add([0.2, 0.6, 0.65], 0.0)), 0.075); o.sheen.position.x = A.x; o.sheen.position.z = A.z; g.add(o.sheen); }
      if (A.dark) { o.dk = flat(new THREE.Mesh(new THREE.RingGeometry(3.2, 40, 40), dark([0, 0, 0.005], 0)), 0.09); o.dk2 = flat(new THREE.Mesh(new THREE.RingGeometry(2.2, 3.2, 40), dark([0, 0, 0.005], 0)), 0.09); g.add(o.dk); g.add(o.dk2); }
      o.cracks = [];
      for (const c of A.cracks || []) {
        const pg = new THREE.PlaneGeometry(c.w || 0.3, c.len || 3); pg.translate(0, (c.len || 3) / 2, 0);
        const m = new THREE.Mesh(pg, add(A.crackC || [3, 1.2, 0.25], 0.8)); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI;
        const pv = new THREE.Group(); pv.position.set(c.x, 0.055, c.z); pv.rotation.y = c.face || 0; pv.add(m); g.add(pv); o.cracks.push({ m, c });
      }
      S.arena = o;
    }
    const o = S.arena; const t = S.t; const hero = world.hero;
    if (o.water) { o.water.material.opacity = 0.55 * Math.min(1, A.water); o.sheen.material.opacity = 0.08 + 0.05 * Math.sin(t * 1.3); if (rnd() < dt * 6 * A.water) { const a = rnd() * TAU, r = rnd() * (A.r || 12); this.shockRing(A.x + Math.sin(a) * r, A.z + Math.cos(a) * r, 0.9, [0.3, 1.0, 1.1], 0.9); } }
    if (o.dk && hero) { o.dk.position.x = o.dk2.position.x = hero.x; o.dk.position.z = o.dk2.position.z = hero.z; o.dk.material.opacity = 0.62 * A.dark; o.dk2.material.opacity = 0.3 * A.dark; }
    for (const { m } of o.cracks) m.material.opacity = 0.55 + 0.35 * Math.sin(t * 3 + m.id);
    const R = A.r || 10; const cx = A.x ?? (hero ? hero.x : 0), cz = A.z ?? (hero ? hero.z : 0);
    if (A.embers && rnd() < dt * A.embers) { const a = rnd() * TAU, r = rnd() * R; this.emit(cx + Math.sin(a) * r, 0.1, cz + Math.cos(a) * r, { n: 1, speed: 0.4, up: 0.5, vy: 1.6, life: 1.6, grav: -0.6, color: A.emberC || [3, 1.2, 0.3], size: 1, drag: 0.6 }); }
    if (A.fall && rnd() < dt * A.fall) { const a = rnd() * TAU, r = rnd() * R; this.emit(cx + Math.sin(a) * r, 7, cz + Math.cos(a) * r, { n: 1, speed: 0.1, up: 0, vy: -3.5, life: 2.0, grav: 1.5, color: A.fallC || [0.7, 0.7, 0.72], size: 1, drag: 0.2 }); }
    if (A.mist && rnd() < dt * A.mist) { const a = rnd() * TAU, r = rnd() * R; this.emit(cx + Math.sin(a) * r, 0.3, cz + Math.cos(a) * r, { n: 1, speed: 0.3, up: 0.2, life: 2.2, grav: -0.15, color: A.mistC || [0.4, 0.42, 0.5], size: 2, alpha: 0.4, drag: 0.5 }); }
  },

  _ilClear() {
    const S = this._IL; if (!S) return;
    for (const m of S.marks) { drop(m.m); drop(m.f); } for (const h of S.holes) drop(h.g); if (S.arena) drop(S.arena.g);
    this._IL = null;
  },
};

export function installInterlude(FX) {
  const P = FX && FX.prototype; if (!P || P._ilInstalled || !P.elemFrame) return false; P._ilInstalled = true;
  Object.assign(P, M);
  const ef = P.elemFrame;
  P.elemFrame = function (world, dt, time) {
    const q = world && world.fxq;
    if (q && q.length) { let j = 0; for (let i = 0; i < q.length; i++) { const o = q[i]; if (o && typeof o.k === 'string' && o.k.startsWith('il')) { try { this.ilQ(o); } catch (e) { /* a look never stops the frame */ } } else q[j++] = o; } q.length = j; }
    const r = ef.call(this, world, dt, time);
    if (world) this.ilFrame(world, dt);
    return r;
  };
  const cl = P.clear; P.clear = function (...a) { this._ilClear(); return cl ? cl.apply(this, a) : undefined; };
  return true;
}
